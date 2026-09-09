import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Coordinate } from '../utils/stats';
import { RadarCamera, RadarAlert } from '../services/radarCameraService';

interface WebMapViewProps {
  coordinates: Coordinate[];
  mapType: 'radar' | 'standard' | 'satellite';
  cameras?: RadarCamera[];
  activeAlert?: RadarAlert | null;
  heading?: number;
  currentSpeed?: number;
  playbackTrigger?: number;
  centerLocation?: { latitude: number; longitude: number };
}

// MapTiler key
const MT_KEY = 'lbvfghjmWBR9DCm4v4ap';

// STATIC HTML document loaded ONCE by iframe. Never reloads on GPS ticks!
const STATIC_MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      width: 100%;
      height: 100%;
      background: #0d1117;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }

    /* Outer viewport clips the rotated canvas */
    #map-viewport {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0d1117;
    }

    /* 200% oversized container that smoothly rotates around center pivot */
    #map-rotator {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      transform-origin: 50% 50%;
      transition: transform 0.65s cubic-bezier(0.2, 0.9, 0.3, 1);
      will-change: transform;
    }

    #map {
      width: 100%;
      height: 100%;
      background: #0d1117;
    }
    .leaflet-container { background: #0d1117 !important; }

    /* Hide Leaflet default controls — custom fixed HUD controls used */
    .leaflet-control-container { display: none !important; }

    /* Fixed Navigation HUD Controls (pinned in viewport, does NOT rotate) */
    .fixed-nav-controls {
      position: absolute;
      right: 12px;
      bottom: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 7px;
      z-index: 2000;
      pointer-events: auto;
    }
    .nav-hud-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(17, 24, 39, 0.92);
      border: 1.5px solid rgba(6, 182, 212, 0.4);
      color: #38bdf8;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.8);
      backdrop-filter: blur(8px);
      user-select: none;
      transition: background-color 0.2s, border-color 0.2s, transform 0.1s;
    }
    .nav-hud-btn:hover {
      background: #1e293b;
      border-color: #00f2fe;
    }
    .nav-hud-btn:active {
      transform: scale(0.94);
    }
    .compass-btn {
      height: 44px;
      padding: 3px 0;
    }
    .compass-needle-box {
      width: 20px;
      height: 20px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.65s cubic-bezier(0.2, 0.9, 0.3, 1);
    }
    .compass-needle-n {
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-bottom: 9px solid #ef4444; /* Red North */
      position: absolute;
      top: 1px;
    }
    .compass-needle-s {
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 9px solid #94a3b8; /* Silver South */
      position: absolute;
      bottom: 1px;
    }
    .compass-label {
      font-size: 7px;
      font-weight: 900;
      color: #00f2fe;
      letter-spacing: 0.5px;
      line-height: 1;
      margin-top: 2px;
    }
    .zoom-btn {
      font-size: 19px;
      font-weight: 700;
      line-height: 1;
    }

    /* Sonar Radar Scanning Waves */
    @keyframes sonar-ping {
      0% {
        transform: scale(0.15);
        opacity: 0.9;
      }
      50% {
        opacity: 0.4;
      }
      100% {
        transform: scale(2.4);
        opacity: 0;
      }
    }
    .sonar-scanner {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sonar-wave-1, .sonar-wave-2 {
      position: absolute;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 1.5px solid rgba(0,242,254,0.7);
      background: radial-gradient(circle, rgba(0,242,254,0.12) 0%, transparent 70%);
      pointer-events: none;
      animation: sonar-ping 2.4s cubic-bezier(0.15, 0.7, 0.3, 1) infinite;
    }
    .sonar-wave-2 { animation-delay: 1.2s; }

    /* Directional Vehicle Marker with smooth transition */
    .custom-vehicle-marker {
      transition: transform 1.2s linear;
      will-change: transform;
    }
    .vehicle-pointer {
      width: 28px;
      height: 28px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.4, 1);
      will-change: transform;
    }
    .vehicle-body {
      width: 0;
      height: 0;
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-bottom: 22px solid #00f2fe;
      filter: drop-shadow(0 0 8px #00f2fe);
    }
    .vehicle-core {
      position: absolute;
      width: 6px;
      height: 6px;
      background-color: #ffffff;
      border-radius: 50%;
      top: 10px;
      box-shadow: 0 0 5px #ffffff;
    }

    /* Speed Camera Markers — counter-rotated so they stay upright and readable */
    .custom-camera-wrapper { background: transparent; border: none; overflow: visible; }
    .camera-pin-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transform: rotate(var(--map-counter-rotation, 0deg));
      transition: transform 0.65s cubic-bezier(0.2, 0.9, 0.3, 1);
    }
    .camera-pill {
      display: flex;
      align-items: center;
      gap: 3px;
      background: rgba(10,16,30,0.95);
      border: 1.5px solid #06b6d4;
      border-radius: 12px;
      padding: 3px 7px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.9), 0 0 8px rgba(6,182,212,0.25);
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
      backdrop-filter: blur(4px);
    }
    .camera-pin-pointer {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 7px solid #06b6d4;
      margin-top: -1px;
    }
    .camera-emoji { font-size: 11px; line-height: 1; }
    .camera-speed-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 17px;
      height: 17px;
      border-radius: 50%;
      border: 1.5px solid #ef4444;
      background-color: #ffffff;
      color: #111;
      font-size: 8px;
      font-weight: 900;
      padding: 0 2px;
    }

    /* Camera type colour theming */
    .camera-pin-container.seatbelt .camera-pill { border-color:#f59e0b; box-shadow:0 3px 10px rgba(0,0,0,.9),0 0 8px rgba(245,158,11,.25); }
    .camera-pin-container.seatbelt .camera-pin-pointer { border-top-color:#f59e0b; }
    .camera-pin-container.mobile_phone .camera-pill { border-color:#d946ef; box-shadow:0 3px 10px rgba(0,0,0,.9),0 0 8px rgba(217,70,239,.25); }
    .camera-pin-container.mobile_phone .camera-pin-pointer { border-top-color:#d946ef; }
    .camera-pin-container.red_light .camera-pill { border-color:#f43f5e; box-shadow:0 3px 10px rgba(0,0,0,.9),0 0 8px rgba(244,63,94,.25); }
    .camera-pin-container.red_light .camera-pin-pointer { border-top-color:#f43f5e; }
    .camera-pin-container.mobile .camera-pill { border-color:#f59e0b; box-shadow:0 3px 10px rgba(0,0,0,.9),0 0 8px rgba(245,158,11,.25); }
    .camera-pin-container.mobile .camera-pin-pointer { border-top-color:#f59e0b; }
    .camera-pin-container.section .camera-pill { border-color:#3b82f6; box-shadow:0 3px 10px rgba(0,0,0,.9),0 0 8px rgba(59,130,246,.25); }
    .camera-pin-container.section .camera-pin-pointer { border-top-color:#3b82f6; }

    /* Active Alert Animation */
    @keyframes camera-pin-pulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.18); }
    }
    .camera-pin-container.alerting .camera-pill {
      border-color: #ef4444 !important;
      box-shadow: 0 0 14px #ef4444 !important;
      animation: camera-pin-pulse 0.7s infinite alternate ease-in-out;
    }
    .camera-pin-container.alerting .camera-pin-pointer {
      border-top-color: #ef4444 !important;
    }

    @keyframes pulse-dot {
      0%, 100% { transform: scale(0.85); opacity: 0.55; }
      50%       { transform: scale(1.2);  opacity: 1;    }
    }
    .pulse-marker { animation: pulse-dot 1s infinite; }

    .leaflet-popup-content-wrapper {
      background: #0f172a !important;
      color: #ffffff !important;
      border: 1px solid rgba(6, 182, 212, 0.4) !important;
      border-radius: 10px !important;
      box-shadow: 0 8px 20px rgba(0,0,0,0.8) !important;
    }
    .leaflet-popup-tip {
      background: #0f172a !important;
    }
  </style>
</head>
<body>
  <div id="map-viewport">
    <div id="map-rotator">
      <div id="map"></div>
    </div>

    <!-- Fixed Floating Navigation Controls -->
    <div class="fixed-nav-controls">
      <button id="btn-compass" class="nav-hud-btn compass-btn" title="Toggle Rotating Navigation (Google Maps) / North Up">
        <div id="compass-needle-box" class="compass-needle-box">
          <div class="compass-needle-n"></div>
          <div class="compass-needle-s"></div>
        </div>
        <span id="compass-label" class="compass-label">NAV</span>
      </button>
      <button id="btn-zoom-in" class="nav-hud-btn zoom-btn" title="Zoom In">+</button>
      <button id="btn-zoom-out" class="nav-hud-btn zoom-btn" title="Zoom Out">−</button>
    </div>
  </div>

  <script>
    var mapRotatorEl = document.getElementById('map-rotator');
    var compassNeedleBoxEl = document.getElementById('compass-needle-box');
    var compassLabelEl = document.getElementById('compass-label');

    // Navigation orientation mode: true = Rotating (Google Maps Heading-Up), false = North-Up
    var isNavRotating = true;
    var cumulativeHeading = 0;
    var currentRawHeading = 0;

    // Map instance — created ONCE
    var map = L.map('map', {
      zoomControl: false,
      fadeAnimation: true,
      markerZoomAnimation: true
    }).setView([12.9766, 77.5993], 16.5);

    // ── TILE LAYERS ──────────────────────────────────────────────────────
    var MT_KEY = '${MT_KEY}';

    // Radar/dark: MapTiler Streets Dark — high-contrast roads and highway labels
    var radarLayer = L.tileLayer(
      'https://api.maptiler.com/maps/streets-dark/{z}/{x}/{y}.png?key=' + MT_KEY,
      { maxZoom: 20, minZoom: 1, tileSize: 256 }
    );

    // Standard: MapTiler Streets
    var streetLayer = L.tileLayer(
      'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=' + MT_KEY,
      { maxZoom: 20, minZoom: 1, tileSize: 256 }
    );

    // Satellite: MapTiler Satellite
    var satelliteLayer = L.tileLayer(
      'https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=' + MT_KEY,
      { maxZoom: 20, minZoom: 1, tileSize: 256 }
    );

    radarLayer.addTo(map);
    var currentMode = 'radar';

    // Path Polyline (Snaps tightly to road geometry)
    var path = L.polyline([], { 
      color: '#00f2fe', 
      weight: 4.5,
      opacity: 0.95,
      lineJoin: 'round'
    }).addTo(map);

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

    var playbackIcon = L.divIcon({
      className: 'custom-playback-icon',
      html: "<div class='pulse-marker' style='background-color:#00f2fe; width:16px; height:16px; border-radius:50%; border:2.5px solid #FFFFFF; box-shadow: 0 0 12px #00f2fe;'></div>",
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    var liveVehicleMarker = null;
    var startMarker = null;
    var endMarker = null;
    var cameraMarkers = {};
    
    var activeCoords = [];
    var playbackMarker = null;
    var playbackInterval = null;
    var activeAlertCamId = null;

    // Smooth shortest-path angle unwrapping
    function applyMapRotation(targetDeg) {
      currentRawHeading = targetDeg;
      if (!isNavRotating) {
        mapRotatorEl.style.transform = 'rotate(0deg)';
        document.documentElement.style.setProperty('--map-counter-rotation', '0deg');
        if (compassNeedleBoxEl) compassNeedleBoxEl.style.transform = 'rotate(0deg)';
        updateVehiclePointerRotation();
        return;
      }
      var diff = ((targetDeg - (cumulativeHeading % 360)) % 360 + 540) % 360 - 180;
      cumulativeHeading += diff;
      mapRotatorEl.style.transform = 'rotate(' + (-cumulativeHeading) + 'deg)';
      document.documentElement.style.setProperty('--map-counter-rotation', cumulativeHeading + 'deg');
      if (compassNeedleBoxEl) compassNeedleBoxEl.style.transform = 'rotate(' + cumulativeHeading + 'deg)';
      updateVehiclePointerRotation();
    }

    // Always rotate the pointing navigation arrow to match heading!
    function updateVehiclePointerRotation() {
      if (liveVehicleMarker) {
        var el = liveVehicleMarker.getElement();
        if (el) {
          var ptr = el.querySelector('.vehicle-pointer');
          if (ptr) {
            ptr.style.transform = 'rotate(' + currentRawHeading + 'deg)';
          }
        }
      }
    }

    function toggleNavRotationMode() {
      isNavRotating = !isNavRotating;
      if (isNavRotating) {
        compassLabelEl.textContent = 'NAV';
        compassLabelEl.style.color = '#00f2fe';
        applyMapRotation(currentRawHeading);
      } else {
        compassLabelEl.textContent = 'NORTH';
        compassLabelEl.style.color = '#94a3b8';
        applyMapRotation(0);
      }
    }

    // Fixed control listeners
    document.getElementById('btn-compass').addEventListener('click', toggleNavRotationMode);
    document.getElementById('btn-zoom-in').addEventListener('click', function() { map.zoomIn(); });
    document.getElementById('btn-zoom-out').addEventListener('click', function() { map.zoomOut(); });

    function createVehicleIcon(deg) {
      return L.divIcon({
        className: 'custom-vehicle-marker',
        html:
          "<div class='sonar-scanner'>" +
            "<div class='sonar-wave-1'></div>" +
            "<div class='sonar-wave-2'></div>" +
            "<div class='vehicle-pointer' style='transform:rotate(" + (deg || 0) + "deg)'>" +
              "<div class='vehicle-body'></div>" +
              "<div class='vehicle-core'></div>" +
            "</div>" +
          "</div>",
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
    }

    // Camera pin: pill + pointer. iconAnchor = [halfW, fullH] so tip lands on coordinate
    function createCameraIcon(cam, isAlerting) {
      var emoji = '📷';
      var typeClass = cam.type || 'fixed';
      if      (cam.type === 'seatbelt')     emoji = '🦺';
      else if (cam.type === 'mobile_phone') emoji = '📱';
      else if (cam.type === 'red_light')    emoji = '🚦';
      else if (cam.type === 'mobile')       emoji = '🚨';
      else if (cam.type === 'section')      emoji = '⚡';

      var alertClass = isAlerting ? 'alerting' : '';
      var speedHtml  = cam.speedLimit
        ? "<span class='camera-speed-circle'>" + cam.speedLimit + "</span>"
        : '';

      return L.divIcon({
        className: 'custom-camera-wrapper',
        html:
          "<div class='camera-pin-container " + alertClass + " " + typeClass + "'>" +
            "<div class='camera-pill'>" +
              "<span class='camera-emoji'>" + emoji + "</span>" +
              speedHtml +
            "</div>" +
            "<div class='camera-pin-pointer'></div>" +
          "</div>",
        iconSize: [54, 32],
        iconAnchor: [27, 32]
      });
    }

    function updateCameras(list, alertingId) {
      activeAlertCamId = alertingId;
      var present = {};
      if (list && Array.isArray(list)) {
        list.forEach(function(cam) {
          present[cam.id] = true;
          var isAlert = alertingId === cam.id;
          var icon    = createCameraIcon(cam, isAlert);
          if (cameraMarkers[cam.id]) {
            cameraMarkers[cam.id].setIcon(icon);
            cameraMarkers[cam.id].setLatLng([cam.latitude, cam.longitude]);
          } else {
            var m = L.marker([cam.latitude, cam.longitude], { icon: icon }).addTo(map);
            m.bindPopup(
              "<b>" + (cam.description || 'Speed Camera') + "</b><br/>" +
              (cam.roadName ? cam.roadName + "<br/>" : '') +
              "<b>Limit:</b> " + (cam.speedLimit || 60) + " km/h"
            );
            cameraMarkers[cam.id] = m;
          }
        });
      }
      for (var id in cameraMarkers) {
        if (!present[id]) { map.removeLayer(cameraMarkers[id]); delete cameraMarkers[id]; }
      }
    }

    function updatePath(coords, isHistory) {
      activeCoords = coords || [];
      if (!coords || coords.length === 0) {
        path.setLatLngs([]);
        if (liveVehicleMarker) { map.removeLayer(liveVehicleMarker); liveVehicleMarker = null; }
        if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
        if (endMarker)   { map.removeLayer(endMarker);   endMarker   = null; }
        return;
      }

      var latlngs = coords.map(function(c) { return [c.latitude, c.longitude]; });
      path.setLatLngs(latlngs);
      var latest = latlngs[latlngs.length - 1];

      if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
      if (endMarker)   { map.removeLayer(endMarker);   endMarker   = null; }

      if (isHistory) {
        if (liveVehicleMarker) { map.removeLayer(liveVehicleMarker); liveVehicleMarker = null; }
        startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
        endMarker   = L.marker(latest,     { icon: endIcon   }).addTo(map);
        map.fitBounds(path.getBounds(), { padding: [50, 50] });
      } else {
        if (!liveVehicleMarker) {
          liveVehicleMarker = L.marker(latest, { icon: createVehicleIcon(currentRawHeading) }).addTo(map);
        } else {
          liveVehicleMarker.setLatLng(latest);
        }
        updateVehiclePointerRotation();

        // When drive starts or continues, ensure comfortable street navigation zoom
        if (coords.length <= 3 || map.getZoom() < 15) {
          map.setView(latest, 16.5);
        } else {
          map.panTo(latest, { animate: true, duration: 1.1, easeLinearity: 0.25 });
        }
        applyMapRotation(currentRawHeading);
      }
    }

    // Signal map is ready to parent window
    try {
      if (window.parent) {
        window.parent.postMessage(JSON.stringify({ type: 'MAP_READY' }), '*');
      }
    } catch(e) {}

    // Listen for parent messages
    window.addEventListener('message', function(event) {
      try {
        var message = JSON.parse(event.data);
        
        if (message.type === 'setMapType') {
          if (map.hasLayer(radarLayer))     map.removeLayer(radarLayer);
          if (map.hasLayer(streetLayer))    map.removeLayer(streetLayer);
          if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
          currentMode = message.mapType;
          if (message.mapType === 'satellite') {
            satelliteLayer.addTo(map);
            path.setStyle({ color: '#38bdf8' });
          } else if (message.mapType === 'standard') {
            streetLayer.addTo(map);
            path.setStyle({ color: '#2563eb' });
          } else {
            radarLayer.addTo(map);
            path.setStyle({ color: '#00f2fe' });
          }
        }

        if (message.type === 'updateHeading') {
          currentRawHeading = message.heading || 0;
          applyMapRotation(currentRawHeading);
          updateVehiclePointerRotation();
        }

        if (message.type === 'updateCameras') {
          updateCameras(message.cameras, message.alertingCameraId);
        }

        if (message.type === 'updatePath') {
          updatePath(message.coordinates, message.isHistoryMode);
        }

        if (message.type === 'centerMap') {
          if (message.latitude && message.longitude) {
            map.flyTo([message.latitude, message.longitude], message.zoom || 16.5, { duration: 1.2 });
          }
        }

        if (message.type === 'startPlayback') {
          if (activeCoords.length < 2) return;
          if (playbackInterval) clearInterval(playbackInterval);
          if (playbackMarker)   map.removeLayer(playbackMarker);
          var pts = activeCoords.map(function(c) { return [c.latitude, c.longitude]; });
          var idx = 0;
          playbackMarker = L.marker(pts[0], { icon: playbackIcon }).addTo(map);
          map.setView(pts[0], 16);
          playbackInterval = setInterval(function() {
            if (idx < pts.length) {
              playbackMarker.setLatLng(pts[idx]);
              map.panTo(pts[idx]);
              idx++;
            } else {
              clearInterval(playbackInterval);
              setTimeout(function() {
                if (playbackMarker) map.removeLayer(playbackMarker);
                map.fitBounds(path.getBounds(), { padding: [50, 50] });
              }, 1000);
            }
          }, 180);
        }
      } catch (e) { console.error('Map msg error', e); }
    });
  </script>
</body>
</html>
`;

export default function WebMapView({
  coordinates,
  mapType,
  cameras = [],
  activeAlert = null,
  heading = 0,
  currentSpeed = 0,
  playbackTrigger,
  centerLocation,
}: WebMapViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const pushStateToIframe = useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ type: 'setMapType', mapType }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ type: 'updateHeading', heading }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'updateCameras',
          cameras,
          alertingCameraId: activeAlert?.camera?.id || null,
        }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'updatePath',
          coordinates,
          isHistoryMode: coordinates.length > 1 && currentSpeed === 0 && !activeAlert,
        }),
        '*'
      );
      if (centerLocation) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            type: 'centerMap',
            latitude: centerLocation.latitude,
            longitude: centerLocation.longitude,
          }),
          '*'
        );
      }
    }
  }, [coordinates, mapType, cameras, activeAlert, heading, currentSpeed, centerLocation]);

  // Sync state changes with iframe postMessage
  useEffect(() => {
    if (Platform.OS === 'web') {
      const timeout = setTimeout(pushStateToIframe, 30);
      return () => clearTimeout(timeout);
    }
  }, [pushStateToIframe]);

  // Listen for MAP_READY from iframe
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'MAP_READY') {
          pushStateToIframe();
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [pushStateToIframe]);

  useEffect(() => {
    if (playbackTrigger && Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ type: 'startPlayback' }),
        '*'
      );
    }
  }, [playbackTrigger]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.webMapContainer}>
      <iframe
        ref={iframeRef}
        srcDoc={STATIC_MAP_HTML}
        onLoad={pushStateToIframe}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#0d1117',
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
    backgroundColor: '#0d1117',
  },
});
