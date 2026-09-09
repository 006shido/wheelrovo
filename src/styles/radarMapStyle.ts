/**
 * High-contrast Dark Radar Map Style for Google Maps (react-native-maps)
 * Tailored after Radarbot HUD: obsidian night background, high-visibility roads,
 * eliminated POI clutter, and illuminated road geometry.
 */
export const RADAR_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#0b0f19' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8892b0' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0b0f19' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }, { weight: 1.2 }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#1e3a5f' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#0284c7' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0369a1' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#080e1a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1e293b' }],
  },
];
