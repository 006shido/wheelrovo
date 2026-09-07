import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Coordinate } from '../utils/stats';

interface WebMapViewProps {
  coordinates: Coordinate[];
  mapType: 'standard' | 'satellite';
  playbackTrigger?: number;
}

export default function WebMapView({ coordinates, mapType, playbackTrigger }: WebMapViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // High-fidelity Leaflet HTML + JS with Auto-Bounds, Custom Start/End Icons, and Playback Animation Engine
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <style>
        body, html, #map {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: #000000;
        }
        .leaflet-container {
          background: #000000 !important;
        }
        .leaflet-bar {
          border: 1px solid rgba(255,255,255,0.15) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: #0d0d0d !important;
          color: #ffffff !important;
          border-bottom: 1px solid rgba(255,255,255,0.15) !important;
        }
        .leaflet-bar a:hover {
          background-color: #1a1a1a !important;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
        
        .dark-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        
        /* Pulse Animation for Playback Car Marker */
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        .pulse-marker {
          animation: pulse 1s infinite;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { 
          zoomControl: true,
          fadeAnimation: true,
          markerZoomAnimation: true 
        }).setView([37.774929, -122.419416], 15);

        // Standard Dark Layer (Watermark-free)
        var streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          className: 'dark-tiles'
        }).addTo(map);

        // Satellite Layer (Esri World Imagery)
        var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        });

        // Path Polyline (White line)
        var path = L.polyline([], { 
          color: '#FFFFFF', 
          weight: 4.5,
          opacity: 0.95,
          lineJoin: 'round'
        }).addTo(map);

        // Custom Marker Styles (HTML Icons)
        var startIcon = L.divIcon({
          className: 'custom-start-icon',
          html: "<div style='background-color:#10B981; width:12px; height:12px; border-radius:50%; border:2.5px solid #FFFFFF; box-shadow: 0 0 8px #10B981;'></div>",
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        var endIcon = L.divIcon({
          className: 'custom-end-icon',
          html: "<div style='background-color:#EF4444; width:12px; height:12px; border-radius:50%; border:2.5px solid #FFFFFF; box-shadow: 0 0 8px #EF4444;'></div>",
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        var liveIcon = L.divIcon({
          className: 'custom-live-icon',
          html: "<div style='background-color:#FFFFFF; width:14px; height:14px; border-radius:50%; border:2.5px solid #000000; box-shadow: 0 0 10px #FFFFFF;'></div>",
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        var playbackIcon = L.divIcon({
          className: 'custom-playback-icon',
          html: "<div class='pulse-marker' style='background-color:#FFFFFF; width:16px; height:16px; border-radius:50%; border:3px solid #000000; box-shadow: 0 0 12px #FFFFFF;'></div>",
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        var liveMarker = null;
        var startMarker = null;
        var endMarker = null;
        
        // Playback Engine state
        var activeCoords = [];
        var playbackMarker = null;
        var playbackInterval = null;

        // Listen for parent messages
        window.addEventListener('message', function(event) {
          try {
            var message = JSON.parse(event.data);
            
            // Toggle Tile Layer
            if (message.type === 'setMapType') {
              if (message.mapType === 'satellite') {
                map.removeLayer(streetLayer);
                satelliteLayer.addTo(map);
              } else {
                map.removeLayer(satelliteLayer);
                streetLayer.addTo(map);
              }
            }

            // Update path coordinates
            if (message.type === 'updatePath') {
              var coords = message.coordinates;
              activeCoords = coords; // Save for playback
              
              if (coords && coords.length > 0) {
                var latlngs = coords.map(function(c) {
                  return [c.latitude, c.longitude];
                });
                
                path.setLatLngs(latlngs);
                var latest = latlngs[latlngs.length - 1];

                // Remove old markers
                if (liveMarker) map.removeLayer(liveMarker);
                if (startMarker) map.removeLayer(startMarker);
                if (endMarker) map.removeLayer(endMarker);

                if (latlngs.length === 1) {
                  // Only show current marker
                  liveMarker = L.marker(latest, { icon: liveIcon }).addTo(map);
                  map.setView(latest, 15);
                } else {
                  // History Mode: Show Start (Green) and End (Red) markers
                  startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
                  endMarker = L.marker(latest, { icon: endIcon }).addTo(map);
                  
                  // Auto-fit path boundaries with padding
                  map.fitBounds(path.getBounds(), { padding: [40, 40] });
                }
              }
            }

            // Start Playback Animation
            if (message.type === 'startPlayback') {
              if (activeCoords.length < 2) return;
              
              // Clear previous playback
              if (playbackInterval) clearInterval(playbackInterval);
              if (playbackMarker) map.removeLayer(playbackMarker);

              var latlngs = activeCoords.map(function(c) {
                return [c.latitude, c.longitude];
              });

              var index = 0;
              playbackMarker = L.marker(latlngs[0], { icon: playbackIcon }).addTo(map);
              map.setView(latlngs[0], 16);

              playbackInterval = setInterval(function() {
                if (index < latlngs.length) {
                  var currentPos = latlngs[index];
                  playbackMarker.setLatLng(currentPos);
                  map.panTo(currentPos);
                  index++;
                } else {
                  // Finish playback
                  clearInterval(playbackInterval);
                  setTimeout(function() {
                    if (playbackMarker) map.removeLayer(playbackMarker);
                    map.fitBounds(path.getBounds(), { padding: [40, 40] });
                  }, 1000);
                }
              }, 180); // Traverse coordinates step-by-step
            }
          } catch (e) {
            console.error('Leaflet script message parsing error', e);
          }
        });
      </script>
    </body>
    </html>
  `;

  // Sync state changes with iframe postMessage
  useEffect(() => {
    if (Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
      const timeout = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ type: 'setMapType', mapType }),
          '*'
        );
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ type: 'updatePath', coordinates }),
          '*'
        );
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [coordinates, mapType]);

  useEffect(() => {
    if (playbackTrigger && Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ type: 'startPlayback' }),
        '*'
      );
    }
  }, [playbackTrigger]);

  if (Platform.OS !== 'web') {
    return null; // Native uses react-native-maps
  }

  return (
    <View style={styles.webMapContainer}>
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#000000',
        }}
        sandbox="allow-scripts"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webMapContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
});
