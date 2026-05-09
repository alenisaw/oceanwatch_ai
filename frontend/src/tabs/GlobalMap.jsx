import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Activity,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Command,
  Crosshair,
  ExternalLink,
  Filter,
  Flame,
  Gauge,
  Globe2,
  Layers3,
  LocateFixed,
  MapIcon,
  RadioTower,
  RefreshCcw,
  FileText,
  Satellite,
  Search,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fetchNoaaIncidents, fetchOceanRiskSurface } from '../api/oceanwatch.js';

const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_START = '2010-01-01';
const DEFAULT_END = TODAY;

const MAP_VIEWS = {
  standard: {
    label: 'Standard',
    icon: MapIcon,
    basemap: 'standard',
    description: 'Navigation base with signal context',
  },
  satellite: {
    label: 'Satellite',
    icon: Satellite,
    basemap: 'satellite',
    description: 'Imagery base with marine overlays',
  },
  heatmap: {
    label: 'Heatmap',
    icon: Flame,
    basemap: 'satellite',
    description: 'GPU density surface',
  },
  zones: {
    label: 'Zones',
    icon: Layers3,
    basemap: 'standard',
    description: 'Pollution area overlay',
  },
};

const GEOGRAPHY_FILTERS = [
  { id: 'global', label: 'Global', type: 'World', bounds: null, center: [10, 18], zoom: 1.5 },
  { id: 'north-america', label: 'North America', type: 'Continent', bounds: [[5, -170], [75, -45]], center: [-108, 42], zoom: 2.6 },
  { id: 'europe', label: 'Europe', type: 'Continent', bounds: [[34, -25], [72, 45]], center: [12, 53], zoom: 3.2 },
  { id: 'asia', label: 'Asia', type: 'Continent', bounds: [[-10, 45], [72, 150]], center: [96, 32], zoom: 2.4 },
  { id: 'africa', label: 'Africa', type: 'Continent', bounds: [[-36, -20], [38, 55]], center: [18, 3], zoom: 2.5 },
  { id: 'south-america', label: 'South America', type: 'Continent', bounds: [[-56, -85], [14, -30]], center: [-60, -22], zoom: 2.8 },
  { id: 'gulf-mexico', label: 'Gulf of Mexico', type: 'Sea', bounds: [[18, -98], [31, -80]], center: [-90.5, 26.3], zoom: 4.8 },
  { id: 'north-sea', label: 'North Sea', type: 'Sea', bounds: [[51, -5], [62, 10]], center: [2.4, 56.6], zoom: 5.0 },
  { id: 'mediterranean', label: 'Mediterranean', type: 'Sea', bounds: [[30, -6], [46, 37]], center: [16, 37], zoom: 3.7 },
  { id: 'persian-gulf', label: 'Persian Gulf', type: 'Sea', bounds: [[23, 47], [31, 58]], center: [52.5, 26.7], zoom: 5.2 },
  { id: 'south-china-sea', label: 'South China Sea', type: 'Sea', bounds: [[-2, 103], [24, 122]], center: [113.5, 11.5], zoom: 4.0 },
  { id: 'malacca', label: 'Malacca Strait', type: 'Corridor', bounds: [[0, 95], [8, 105]], center: [101.2, 3.2], zoom: 5.7 },
  { id: 'hormuz', label: 'Strait of Hormuz', type: 'Corridor', bounds: [[24, 53], [28, 59]], center: [56.0, 26.2], zoom: 6.0 },
  { id: 'suez', label: 'Suez / Red Sea', type: 'Corridor', bounds: [[11, 31], [31, 44]], center: [37.4, 22.6], zoom: 4.2 },
];

const SEVERITY_FILTERS = [
  { id: 'all', label: 'All severity', min: 0 },
  { id: 'moderate', label: 'Moderate+', min: 0.45 },
  { id: 'high', label: 'High+', min: 0.7 },
  { id: 'critical', label: 'Critical', min: 0.9 },
];

const TIME_WINDOWS = [
  { id: 'all', label: 'All years', years: null },
  { id: '15y', label: '15 years', years: 15 },
  { id: '8y', label: '8 years', years: 8 },
  { id: '3y', label: '3 years', years: 3 },
];

const OIL_TYPES = {
  all: {
    label: 'All oil-like signals',
    marker: '#f97316',
    gradient: ['#19d4ff', '#6ee7b7', '#facc15', '#f97316', '#b91c1c', '#090909'],
    legend: ['Clean watch', 'Possible sheen', 'Dense slick', 'Critical dark oil'],
  },
  crude: {
    label: 'Crude / petroleum',
    marker: '#f97316',
    gradient: ['#fde68a', '#f59e0b', '#c2410c', '#7f1d1d', '#090909'],
    legend: ['Amber sheen', 'Heavy crude', 'Dark concentration'],
  },
  refined: {
    label: 'Diesel / refined fuel',
    marker: '#38bdf8',
    gradient: ['#67e8f9', '#0ea5e9', '#2563eb', '#7c3aed', '#1e1b4b'],
    legend: ['Light cyan sheen', 'Blue fuel trace', 'Violet concentration'],
  },
  unknown: {
    label: 'Unknown oil-like anomaly',
    marker: '#facc15',
    gradient: ['#bef264', '#facc15', '#fb923c', '#ef4444', '#3f0a0a'],
    legend: ['Uncertain trace', 'Possible anomaly', 'Severe anomaly'],
  },
  context: {
    label: 'Maritime risk context',
    marker: '#2dd4bf',
    gradient: ['#2dd4bf', '#14b8a6', '#f59e0b', '#ea580c', '#111827'],
    legend: ['Transit pressure', 'Offshore context', 'Dense corridor'],
  },
};

const MARINE_TERMS = [
  'anchorage',
  'bay',
  'beach',
  'canal',
  'channel',
  'coast',
  'coastal',
  'gulf',
  'harbor',
  'harbour',
  'inlet',
  'island',
  'marine',
  'maritime',
  'offshore',
  'ocean',
  'port',
  'sea',
  'ship',
  'shipping',
  'sound',
  'strait',
  'tanker',
  'terminal',
  'vessel',
  'waterway',
];

const OCEAN_CONTEXT_SUPPLEMENTS = [
  ['north-sea-central', 'Central North Sea offshore context', 56.2, 2.1, 0.74],
  ['north-sea-norway', 'Norwegian North Sea offshore context', 59.0, 3.6, 0.68],
  ['north-sea-uk', 'UK continental shelf offshore context', 57.4, -1.5, 0.7],
  ['north-sea-shetland', 'Shetland offshore shipping context', 60.0, -0.8, 0.64],
  ['north-sea-dogger', 'Dogger Bank offshore context', 55.0, 2.6, 0.58],
  ['north-sea-denmark', 'Danish North Sea offshore context', 56.7, 7.0, 0.62],
  ['north-sea-norway-south', 'Southern Norway offshore context', 58.1, 5.4, 0.66],
  ['north-sea-rotterdam-approach', 'Rotterdam approach maritime context', 52.2, 3.5, 0.6],
  ['north-sea-skagerrak', 'Skagerrak maritime context', 58.0, 8.5, 0.54],
  ['gulf-mexico-west', 'Western Gulf of Mexico offshore context', 26.2, -94.0, 0.82],
  ['gulf-mexico-central', 'Central Gulf of Mexico offshore context', 27.2, -90.0, 0.88],
  ['gulf-mexico-east', 'Eastern Gulf of Mexico offshore context', 27.8, -85.5, 0.72],
  ['gulf-guinea-west', 'Western Gulf of Guinea offshore context', 4.0, -2.0, 0.66],
  ['gulf-guinea-central', 'Central Gulf of Guinea offshore context', 1.2, 5.5, 0.76],
  ['gulf-guinea-south', 'Southern Gulf of Guinea offshore context', -5.2, 10.2, 0.68],
  ['brazil-santos', 'Santos Basin offshore context', -25.2, -43.5, 0.72],
  ['brazil-campos', 'Campos Basin offshore context', -22.0, -40.5, 0.68],
  ['caribbean-west', 'Western Caribbean tanker context', 18.2, -82.0, 0.56],
  ['caribbean-east', 'Eastern Caribbean tanker context', 14.5, -62.5, 0.62],
  ['med-west', 'Western Mediterranean maritime context', 39.0, 4.0, 0.54],
  ['med-central', 'Central Mediterranean maritime context', 36.0, 16.0, 0.6],
  ['med-east', 'Eastern Mediterranean maritime context', 34.0, 28.0, 0.64],
  ['black-sea-west', 'Western Black Sea maritime context', 43.2, 30.0, 0.54],
  ['black-sea-east', 'Eastern Black Sea maritime context', 43.0, 39.0, 0.52],
  ['baltic-central', 'Central Baltic maritime context', 58.0, 19.0, 0.5],
  ['baltic-gulf-finland', 'Gulf of Finland maritime context', 59.7, 25.0, 0.54],
  ['red-sea-north', 'Northern Red Sea tanker context', 25.0, 36.0, 0.62],
  ['red-sea-south', 'Southern Red Sea tanker context', 15.0, 41.0, 0.76],
  ['arabian-sea-west', 'Western Arabian Sea tanker context', 18.5, 58.0, 0.58],
  ['arabian-sea-east', 'Eastern Arabian Sea tanker context', 16.0, 67.0, 0.54],
  ['persian-gulf-west', 'Western Persian Gulf terminal context', 27.5, 49.5, 0.82],
  ['persian-gulf-east', 'Eastern Persian Gulf terminal context', 26.5, 54.5, 0.86],
  ['hormuz-approach', 'Hormuz approach context', 25.6, 57.8, 0.9],
  ['malacca-west', 'Western Malacca Strait context', 4.8, 98.6, 0.84],
  ['malacca-east', 'Eastern Malacca Strait context', 1.5, 103.2, 0.9],
  ['south-china-west', 'Western South China Sea context', 10.0, 109.0, 0.66],
  ['south-china-central', 'Central South China Sea context', 13.0, 114.0, 0.74],
  ['south-china-east', 'Eastern South China Sea context', 17.0, 119.0, 0.62],
  ['east-china-sea-central', 'East China Sea tanker context', 29.5, 125.5, 0.6],
  ['yellow-sea', 'Yellow Sea maritime context', 36.5, 123.5, 0.56],
  ['japan-sea', 'Sea of Japan maritime context', 39.0, 134.0, 0.52],
  ['northwest-shelf-west', 'Western Australia offshore context', -19.0, 115.0, 0.58],
  ['northwest-shelf-east', 'Timor Sea offshore context', -12.0, 126.0, 0.52],
  ['indonesia-archipelago', 'Indonesia archipelago tanker context', -4.0, 118.0, 0.58],
  ['cape-good-hope-west', 'Cape of Good Hope westbound context', -35.2, 16.5, 0.52],
  ['cape-good-hope-east', 'Cape of Good Hope eastbound context', -35.5, 24.0, 0.54],
  ['north-atlantic-west', 'Western North Atlantic tanker context', 42.0, -58.0, 0.46],
  ['north-atlantic-east', 'Eastern North Atlantic tanker context', 44.0, -25.0, 0.48],
  ['pacific-northwest', 'North Pacific coastal shipping context', 48.0, -132.0, 0.44],
  ['alaska-gulf', 'Gulf of Alaska maritime context', 57.0, -148.0, 0.52],
  ['chile-offshore', 'Chile offshore maritime context', -34.0, -74.0, 0.42],
].map(([id, name, lat, lon, severity]) => ({
  id: `ocean-context-${id}`,
  name,
  open_date: '',
  location: 'Ocean context zone',
  lat,
  lon,
  threat: 'Oil',
  tags: 'context_anchor ocean_only maritime_oil_risk',
  commodity: 'maritime oil-risk context',
  max_potential_release_gallons: null,
  severity_score: severity,
  severity_label: severity >= 0.7 ? 'high maritime oil-risk context' : 'moderate maritime oil-risk context',
  posts: 0,
  description: 'Ocean-only context point used to shape the heat surface. This is not a detected spill.',
  source_url: 'https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints',
  status_language: 'contextual maritime oil-risk zone, not a detected incident',
  record_type: 'context_anchor',
}));

function inBounds(point, bounds) {
  if (!bounds) return true;
  const [[south, west], [north, east]] = bounds;
  return point.lat >= south && point.lat <= north && point.lon >= west && point.lon <= east;
}

function isMarineRelevant(point) {
  if (point.record_type === 'context_anchor') return true;
  const text = [
    point.name,
    point.location,
    point.commodity,
    point.tags,
    point.description,
    point.status_language,
  ]
    .join(' ')
    .toLowerCase();
  return MARINE_TERMS.some((term) => text.includes(term));
}

function classifyOilType(point) {
  if (point.record_type === 'context_anchor') return 'context';
  const text = `${point.commodity ?? ''} ${point.tags ?? ''} ${point.name ?? ''}`.toLowerCase();
  if (text.includes('diesel') || text.includes('gasoline') || text.includes('fuel')) return 'refined';
  if (text.includes('crude') || text.includes('petroleum') || text.includes('oil')) return 'crude';
  return 'unknown';
}

function severityColor(score, oilType = 'all') {
  if (score >= 0.9) return '#08090a';
  if (score >= 0.7) return oilType === 'refined' ? '#7c3aed' : '#7f1d1d';
  if (score >= 0.45) return oilType === 'refined' ? '#0ea5e9' : '#f97316';
  return OIL_TYPES[oilType]?.marker ?? '#facc15';
}

function formatGallons(value) {
  if (value == null) return 'unknown release estimate';
  return `${Number(value).toLocaleString()} gal max potential`;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function buildTileStyle(basemap = 'standard') {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      standard: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: 'OpenStreetMap contributors',
      },
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Esri World Imagery',
      },
    },
    layers: [
      {
        id: 'standard-base',
        type: 'raster',
        source: 'standard',
        layout: { visibility: basemap === 'standard' ? 'visible' : 'none' },
        paint: { 'raster-saturation': -0.65, 'raster-contrast': 0.18, 'raster-brightness-max': 0.72 },
      },
      {
        id: 'satellite-base',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: basemap === 'satellite' ? 'visible' : 'none' },
        paint: { 'raster-saturation': 0.1, 'raster-contrast': 0.08, 'raster-brightness-min': 0.02 },
      },
    ],
  };
}

function gradientExpression(oil) {
  const stops = oil.gradient;
  const step = stops.length > 1 ? 1 / (stops.length - 1) : 1;
  return [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    ...stops.flatMap((color, index) => [Number((index * step).toFixed(2)), color]),
  ];
}

function toPointCollection(points) {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => {
      const oilType = classifyOilType(point);
      return {
        type: 'Feature',
        id: point.id,
        geometry: {
          type: 'Point',
          coordinates: [point.lon, point.lat],
        },
        properties: {
          id: point.id,
          name: point.name,
          location: point.location,
          oilType,
          isContext: point.record_type === 'context_anchor',
          severity: Number(point.severity_score ?? 0),
          color: severityColor(Number(point.severity_score ?? 0), oilType),
          label: point.severity_label,
        },
      };
    }),
  };
}

function toZoneCollection(points) {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => {
      const oilType = classifyOilType(point);
      const severity = Number(point.severity_score ?? 0);
      return {
        type: 'Feature',
        id: `zone-${point.id}`,
        geometry: {
          type: 'Polygon',
          coordinates: [makeEllipse(point.lon, point.lat, severity)],
        },
        properties: {
          id: point.id,
          name: point.name,
          oilType,
          severity,
          color: severityColor(severity, oilType),
          isContext: point.record_type === 'context_anchor',
        },
      };
    }),
  };
}

function makeEllipse(lon, lat, severity) {
  const points = [];
  const radiusLon = 0.48 + severity * 1.15;
  const radiusLat = 0.3 + severity * 0.82;
  for (let i = 0; i <= 48; i += 1) {
    const angle = (i / 48) * Math.PI * 2;
    const warp = 1 + Math.sin(angle * 3 + severity * 4) * 0.12;
    points.push([
      lon + Math.cos(angle) * radiusLon * warp,
      lat + Math.sin(angle) * radiusLat * warp,
    ]);
  }
  return points;
}

function setLayerVisibility(map, id, visible) {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}

function setBasemap(map, basemap) {
  setLayerVisibility(map, 'standard-base', basemap === 'standard');
  setLayerVisibility(map, 'satellite-base', basemap === 'satellite');
}

function addPollutionLayers(map, oil) {
  if (!map.getSource('pollution')) {
    map.addSource('pollution', { type: 'geojson', data: toPointCollection([]) });
  }
  if (!map.getSource('zones')) {
    map.addSource('zones', { type: 'geojson', data: toZoneCollection([]) });
  }

  map.addLayer({
    id: 'zone-fills',
    type: 'fill',
    source: 'zones',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['get', 'severity'],
        0.25,
        0.08,
        0.65,
        0.2,
        1,
        0.38,
      ],
    },
  });

  map.addLayer({
    id: 'zone-lines',
    type: 'line',
    source: 'zones',
    paint: {
      'line-color': ['get', 'color'],
      'line-opacity': 0.72,
      'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 7, 1.8],
      'line-blur': 0.4,
    },
  });

  map.addLayer({
    id: 'pollution-heat',
    type: 'heatmap',
    source: 'pollution',
    maxzoom: 10,
    paint: {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'severity'],
        0,
        0.2,
        0.55,
        0.7,
        1,
        1.25,
      ],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 1, 1.5, 5, 2.1, 8, 2.8],
      'heatmap-color': gradientExpression(oil),
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 1, 18, 4, 34, 7, 58],
      'heatmap-opacity': 0.82,
    },
  });

  map.addLayer({
    id: 'pollution-circles',
    type: 'circle',
    source: 'pollution',
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['get', 'severity'], 0.2, 4, 1, 15],
      'circle-opacity': ['case', ['get', 'isContext'], 0.18, 0.76],
      'circle-stroke-color': 'rgba(241, 245, 249, 0.78)',
      'circle-stroke-width': ['case', ['get', 'isContext'], 0.5, 1.2],
      'circle-blur': ['case', ['get', 'isContext'], 0.45, 0],
    },
  });
}

function configureLayerMode(map, mode) {
  setBasemap(map, MAP_VIEWS[mode].basemap);
  setLayerVisibility(map, 'pollution-heat', mode === 'heatmap' || mode === 'satellite');
  setLayerVisibility(map, 'zone-fills', mode === 'zones' || mode === 'satellite');
  setLayerVisibility(map, 'zone-lines', mode === 'zones' || mode === 'satellite');
  setLayerVisibility(map, 'pollution-circles', mode === 'standard' || mode === 'satellite' || mode === 'zones');

  if (map.getLayer('pollution-heat')) {
    map.setPaintProperty('pollution-heat', 'heatmap-opacity', mode === 'heatmap' ? 0.88 : 0.5);
  }
  if (map.getLayer('zone-fills')) {
    map.setPaintProperty('zone-fills', 'fill-opacity', [
      'interpolate',
      ['linear'],
      ['get', 'severity'],
      0.25,
      mode === 'zones' ? 0.1 : 0.04,
      0.65,
      mode === 'zones' ? 0.28 : 0.16,
      1,
      mode === 'zones' ? 0.48 : 0.28,
    ]);
  }
}

function flyToGeography(map, geography) {
  if (geography.bounds) {
    const [[south, west], [north, east]] = geography.bounds;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 56, duration: 780, maxZoom: geography.zoom + 0.8 },
    );
    return;
  }
  map.flyTo({ center: geography.center, zoom: geography.zoom, duration: 780 });
}

function WebGLPollutionMap({
  geography,
  mapMode,
  oil,
  points,
  selected,
  setMapMode,
  setSelected,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const pointsRef = useRef(new Map());
  const latestRef = useRef({ geography, mapMode, oil, points });

  useEffect(() => {
    pointsRef.current = new Map(points.map((point) => [String(point.id), point]));
    latestRef.current = { geography, mapMode, oil, points };
  }, [geography, mapMode, oil, points]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildTileStyle(MAP_VIEWS[mapMode].basemap),
      center: GEOGRAPHY_FILTERS[0].center,
      zoom: GEOGRAPHY_FILTERS[0].zoom,
      attributionControl: false,
      renderWorldCopies: true,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      const latest = latestRef.current;
      addPollutionLayers(map, latest.oil);
      configureLayerMode(map, latest.mapMode);
      map.getSource('pollution').setData(toPointCollection(latest.points));
      map.getSource('zones').setData(toZoneCollection(latest.points));
      flyToGeography(map, latest.geography);
    });

    map.on('click', 'pollution-circles', (event) => {
      const feature = event.features?.[0];
      const id = String(feature?.properties?.id ?? '');
      const point = pointsRef.current.get(id);
      if (point) setSelected(point);
    });

    map.on('click', 'zone-fills', (event) => {
      const feature = event.features?.[0];
      const id = String(feature?.properties?.id ?? '');
      const point = pointsRef.current.get(id);
      if (point) setSelected(point);
    });

    map.on('mouseenter', 'pollution-circles', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'pollution-circles', () => {
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });
    map.on('mousemove', 'pollution-circles', (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const point = pointsRef.current.get(String(feature.properties?.id ?? ''));
      if (!point) return;
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'ow-map-tooltip',
        offset: 14,
      })
        .setLngLat(event.lngLat)
        .setHTML(
          `<strong>${escapeHtml(point.name)}</strong><span>${escapeHtml(
            `${formatPercent(point.severity_score)} ${point.severity_label}`,
          )}</span>`,
        )
        .addTo(map);
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    if (map.getSource('pollution')) {
      map.getSource('pollution').setData(toPointCollection(points));
    }
    if (map.getSource('zones')) {
      map.getSource('zones').setData(toZoneCollection(points));
    }
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    configureLayerMode(map, mapMode);
  }, [mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    if (map.getLayer('pollution-heat')) {
      map.setPaintProperty('pollution-heat', 'heatmap-color', gradientExpression(oil));
    }
  }, [oil]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    flyToGeography(map, geography);
  }, [geography]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.flyTo({ center: [selected.lon, selected.lat], zoom: Math.max(map.getZoom(), 5.6), duration: 650 });
  }, [selected]);

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-[1.4rem] border border-slate-700/70 bg-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div ref={containerRef} className="h-full w-full" />
      {(mapMode === 'heatmap' || mapMode === 'zones') && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="pollution-cloud cloud-a" />
          <span className="pollution-cloud cloud-b" />
          <span className="pollution-cloud cloud-c" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/72 to-transparent" />

      <div className="absolute left-14 right-4 top-4 flex flex-wrap items-start justify-between gap-3">
        <div className="map-glass max-w-[410px] px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-100/70">
            <RadioTower size={13} />
            WebGL environmental intelligence
          </div>
          <p className="mt-2 text-lg font-semibold leading-tight text-slate-50">
            Possible oil-like anomaly surface
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300/80">
            MapLibre GL heat, area, and density layers render in the browser GPU. Context zones are decision-support signals, not confirmed detections.
          </p>
        </div>

        <div className="map-glass flex flex-wrap gap-1 p-1.5">
          {Object.entries(MAP_VIEWS).map(([id, item]) => {
            const Icon = item.icon;
            return (
              <button
                key={id}
                onClick={() => setMapMode(id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition duration-200 ${
                  mapMode === id
                    ? 'bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.32)]'
                    : 'text-slate-300 hover:bg-slate-800/90 hover:text-slate-50'
                }`}
                title={item.description}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <IntensityLegend oil={oil} points={points} />
    </div>
  );
}

export default function GlobalMap({ apiUrl, onGenerateReport }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const [surfacePayload, setSurfacePayload] = useState(null);
  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [query, setQuery] = useState('');
  const [mapMode, setMapMode] = useState('heatmap');
  const [geographyId, setGeographyId] = useState('global');
  const [severityId, setSeverityId] = useState('all');
  const [oilType, setOilType] = useState('all');
  const [recordType, setRecordType] = useState('all');
  const [timeWindow, setTimeWindow] = useState('all');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('insights');
  const [loadedAt, setLoadedAt] = useState(null);

  const selectedGeography = GEOGRAPHY_FILTERS.find((item) => item.id === geographyId) ?? GEOGRAPHY_FILTERS[0];
  const selectedSeverity = SEVERITY_FILTERS.find((item) => item.id === severityId) ?? SEVERITY_FILTERS[0];
  const selectedOil = OIL_TYPES[oilType] ?? OIL_TYPES.all;
  const selectedWindow = TIME_WINDOWS.find((item) => item.id === timeWindow) ?? TIME_WINDOWS[0];

  const loadIncidents = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const [data, surface] = await Promise.all([
        fetchNoaaIncidents({ threat: 'Oil', limit: 2400, startDate, endDate }, apiUrl),
        fetchOceanRiskSurface({ threat: 'Oil', limit: 2400, startDate, endDate }, apiUrl),
      ]);
      setPayload(data);
      setSurfacePayload(surface);
      setSelected(data.incidents?.[0] ?? null);
      setLoadedAt(new Date());
      setStatus('success');
    } catch (err) {
      setError(err.message ?? 'Failed to load official incident feed');
      setStatus('error');
    }
  }, [apiUrl, startDate, endDate]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  useEffect(() => {
    const handler = (event) => {
      if (event.key.toLowerCase() === 'k' && !event.metaKey && !event.ctrlKey) {
        const target = event.target?.tagName?.toLowerCase();
        if (target === 'input' || target === 'textarea' || target === 'select') return;
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const incidents = payload?.incidents ?? [];
  const surfacePoints = useMemo(
    () => [...(surfacePayload?.surface_points ?? incidents), ...OCEAN_CONTEXT_SUPPLEMENTS],
    [incidents, surfacePayload],
  );

  const filteredIncidents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const cutoff = selectedWindow.years
      ? new Date(new Date().setFullYear(new Date().getFullYear() - selectedWindow.years)).toISOString().slice(0, 10)
      : null;
    return incidents.filter((incident) => {
      const incidentOilType = classifyOilType(incident);
      const text = [incident.name, incident.location, incident.commodity, incident.tags]
        .join(' ')
        .toLowerCase();
      return (
        isMarineRelevant(incident) &&
        (!needle || text.includes(needle)) &&
        (!cutoff || incident.open_date >= cutoff) &&
        inBounds(incident, selectedGeography.bounds) &&
        incident.severity_score >= selectedSeverity.min &&
        (oilType === 'all' || incidentOilType === oilType)
      );
    });
  }, [incidents, oilType, query, selectedGeography.bounds, selectedSeverity.min, selectedWindow.years]);

  const filteredSurface = useMemo(() => {
    const incidentIds = new Set(filteredIncidents.map((incident) => incident.id));
    return surfacePoints.filter((point) => {
      const pointOilType = classifyOilType(point);
      const isContext = point.record_type === 'context_anchor';
      return (
        isMarineRelevant(point) &&
        inBounds(point, selectedGeography.bounds) &&
        point.severity_score >= selectedSeverity.min &&
        (recordType === 'all' ||
          (recordType === 'reported' && !isContext) ||
          (recordType === 'context' && isContext)) &&
        (oilType === 'all' || pointOilType === oilType) &&
        (isContext || incidentIds.has(point.id))
      );
    });
  }, [
    filteredIncidents,
    oilType,
    recordType,
    selectedGeography.bounds,
    selectedSeverity.min,
    surfacePoints,
  ]);

  const stats = useMemo(() => computeStats(filteredIncidents, filteredSurface), [filteredIncidents, filteredSurface]);
  const trends = useMemo(() => buildTrend(filteredIncidents), [filteredIncidents]);
  const rankedZones = useMemo(() => rankZones(filteredSurface), [filteredSurface]);
  const forecasts = useMemo(() => buildForecasts(stats, rankedZones), [rankedZones, stats]);

  useEffect(() => {
    if (!selected) return;
    const selectedStillVisible = filteredSurface.some((point) => point.id === selected.id);
    if (!selectedStillVisible) setSelected(null);
  }, [filteredSurface, selected]);

  function showRegion(regionId) {
    setGeographyId(regionId);
    setMapMode('heatmap');
    setRecordType('all');
    setSeverityId('all');
    setOilType('all');
    setSelected(null);
  }

  function resetFilters() {
    setGeographyId('global');
    setSeverityId('all');
    setOilType('all');
    setRecordType('all');
    setTimeWindow('all');
    setQuery('');
    setSelected(null);
  }

  const commands = [
    { label: 'Switch to Heatmap', action: () => setMapMode('heatmap'), hint: 'gpu layer' },
    { label: 'Switch to Pollution Zones', action: () => setMapMode('zones'), hint: 'area layer' },
    { label: 'Switch to Satellite', action: () => setMapMode('satellite'), hint: 'imagery' },
    { label: 'Show critical only', action: () => setSeverityId('critical'), hint: 'filter' },
    { label: 'Show Gulf of Mexico', action: () => showRegion('gulf-mexico'), hint: 'region' },
    { label: 'Show North Sea', action: () => showRegion('north-sea'), hint: 'region' },
    { label: 'Show Malacca Strait', action: () => showRegion('malacca'), hint: 'corridor' },
    { label: 'Reset filters', action: resetFilters, hint: 'clear' },
  ];

  return (
    <div className="mission-shell relative h-full min-h-0 overflow-hidden rounded-[1.6rem] border border-slate-700/70 bg-slate-950/80">
      <div className="pointer-events-none absolute inset-0 mission-aura" />
      <div className="relative flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 lg:p-5">
        <MissionHeader
          error={error}
          filteredSurface={filteredSurface}
          loadedAt={loadedAt}
          onRefresh={loadIncidents}
          onGenerateReport={onGenerateReport}
          stats={stats}
          status={status}
        />

        <FilterDeck
          endDate={endDate}
          geographyId={geographyId}
          oilType={oilType}
          query={query}
          recordType={recordType}
          setEndDate={setEndDate}
          setGeographyId={setGeographyId}
          setOilType={setOilType}
          setQuery={setQuery}
          setRecordType={setRecordType}
          setSeverityId={setSeverityId}
          setStartDate={setStartDate}
          setTimeWindow={setTimeWindow}
          severityId={severityId}
          startDate={startDate}
          timeWindow={timeWindow}
        />

        <section className="grid min-h-[760px] flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
          <WebGLPollutionMap
            geography={selectedGeography}
            mapMode={mapMode}
            oil={selectedOil}
            points={filteredSurface}
            selected={selected}
            setMapMode={setMapMode}
            setSelected={setSelected}
          />

          <aside className="flex min-h-0 flex-col gap-3">
            <PanelTabs activePanel={activePanel} setActivePanel={setActivePanel} />
            <section className="min-h-0 flex-1 overflow-y-auto rounded-[1.25rem] border border-slate-700/70 bg-slate-950/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
              {activePanel === 'insights' && (
                <InsightsPanel
                  forecasts={forecasts}
                  rankedZones={rankedZones}
                  selected={selected}
                  setGeographyId={setGeographyId}
                  setSelected={setSelected}
                  stats={stats}
                />
              )}
              {activePanel === 'records' && (
                <RecordsPanel incidents={filteredIncidents} setSelected={setSelected} />
              )}
              {activePanel === 'sources' && <SourcesPanel surfacePayload={surfacePayload} />}
              {activePanel === 'copilot' && (
                <CopilotPanel
                  mapMode={mapMode}
                  selectedGeography={selectedGeography}
                  selectedOil={selectedOil}
                  stats={stats}
                  status={status}
                />
              )}
            </section>
          </aside>
        </section>

        <AnalyticsGrid forecasts={forecasts} rankedZones={rankedZones} stats={stats} trends={trends} />
      </div>

      <CommandPalette commands={commands} open={paletteOpen} setOpen={setPaletteOpen} />
    </div>
  );
}

function MissionHeader({ error, filteredSurface, loadedAt, onGenerateReport, onRefresh, stats, status }) {
  return (
    <header className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
          <Sparkles size={13} />
          AI environmental intelligence
        </div>
        <h2 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight text-slate-50 sm:text-3xl lg:text-[2.35rem]">
          Global marine pollution analytics, rendered as a live risk surface.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-[15px]">
          OceanWatch blends official incident records with maritime oil-risk context, WebGL heat layers, zone overlays, and uncertainty-aware AI triage language.
        </p>
        {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
          <button onClick={onGenerateReport} className="premium-button justify-center">
            <FileText size={15} />
            Report
          </button>
          <button onClick={onRefresh} className="premium-button justify-center">
            <RefreshCcw size={15} />
            Refresh
          </button>
        </div>
      </div>

      <div className="hidden grid-cols-2 gap-2 rounded-[1.25rem] border border-slate-700/70 bg-slate-900/64 p-2.5 backdrop-blur-xl sm:grid sm:min-w-[320px] sm:gap-3 sm:p-3">
        <StatusPill status={status} />
        <button onClick={onGenerateReport} className="premium-button justify-center">
          <FileText size={15} />
          Generate report
        </button>
        <button onClick={onRefresh} className="premium-button justify-center">
          <RefreshCcw size={15} />
          Refresh feed
        </button>
        <QuickReadout label="Visible inputs" value={filteredSurface.length} />
        <QuickReadout label="Avg severity" value={formatPercent(stats.averageSeverity)} />
        <QuickReadout label="High zones" value={stats.highCount} />
        <QuickReadout label="Last sync" value={loadedAt ? loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'pending'} />
      </div>
    </header>
  );
}

function AnalyticsGrid({ forecasts, rankedZones, stats, trends }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricPanel
        icon={Gauge}
        label="Average pollution pressure"
        value={formatPercent(stats.averageSeverity)}
        tone="cyan"
        detail={`${stats.surfaceCount} blended map inputs`}
      >
        <SeverityBars distribution={stats.distribution} />
      </MetricPanel>
      <MetricPanel
        icon={Activity}
        label="Pollution trend"
        value={stats.trendLabel}
        tone="emerald"
        detail="Reported marine record history"
      >
        <TrendChart data={trends} />
      </MetricPanel>
      <MetricPanel
        icon={LocateFixed}
        label="Highest-risk zone"
        value={rankedZones[0]?.label ?? 'No zone'}
        tone="amber"
        detail={`${rankedZones[0]?.count ?? 0} visible inputs`}
      >
        <ZoneSpark zones={rankedZones.slice(0, 5)} />
      </MetricPanel>
      <MetricPanel
        icon={Bot}
        label="AI forecast"
        value={forecasts[0]?.title ?? 'Forecast pending'}
        tone="violet"
        detail={forecasts[0]?.body ?? 'Waiting for feed'}
      >
        <ForecastNeedle value={forecasts[0]?.score ?? 0} />
      </MetricPanel>
    </section>
  );
}

function MetricPanel({ children, detail, icon: Icon, label, tone, value }) {
  return (
    <article className={`analytics-card tone-${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-semibold leading-tight text-slate-50">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
        </div>
        <div className="analytics-icon">
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function FilterDeck(props) {
  return (
    <section className="rounded-[1.25rem] border border-slate-700/70 bg-slate-950/68 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Filter size={14} />
          Intelligence filters
        </div>
        <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
          <Command size={13} />
          Press K for commands
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
        <SelectField label="Geography" value={props.geographyId} onChange={props.setGeographyId}>
          {GEOGRAPHY_FILTERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.type})
            </option>
          ))}
        </SelectField>
        <SelectField label="Severity" value={props.severityId} onChange={props.setSeverityId}>
          {SEVERITY_FILTERS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </SelectField>
        <SelectField label="Oil signal" value={props.oilType} onChange={props.setOilType}>
          {Object.entries(OIL_TYPES).map(([id, item]) => (
            <option key={id} value={id}>{item.label}</option>
          ))}
        </SelectField>
        <SelectField label="Record type" value={props.recordType} onChange={props.setRecordType}>
          <option value="all">Reported + context</option>
          <option value="reported">Reported incidents</option>
          <option value="context">Context zones</option>
        </SelectField>
        <SelectField label="History" value={props.timeWindow} onChange={props.setTimeWindow}>
          {TIME_WINDOWS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </SelectField>
        <DateField label="Start" value={props.startDate} onChange={props.setStartDate} />
        <DateField label="End" value={props.endDate} onChange={props.setEndDate} />
        <label className="block sm:col-span-2 xl:col-span-1">
          <span className="label">Search</span>
          <span className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input-field h-11 rounded-xl border-slate-700/90 bg-slate-950/70 pl-9"
              value={props.query}
              onChange={(event) => props.setQuery(event.target.value)}
              placeholder="sea, port, fuel"
            />
          </span>
        </label>
      </div>
    </section>
  );
}

function SelectField({ children, label, onChange, value }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <select
        className="input-field h-11 rounded-xl border-slate-700/90 bg-slate-950/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function DateField({ label, onChange, value }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <input
        className="input-field h-11 rounded-xl border-slate-700/90 bg-slate-950/70"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function IntensityLegend({ oil, points }) {
  const reportedCount = points.filter((point) => point.record_type !== 'context_anchor').length;
  const contextCount = points.length - reportedCount;
  return (
    <div className="map-glass absolute bottom-4 left-4 w-[min(390px,calc(100%-2rem))] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Pollution intensity legend</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">{oil.label}</p>
        </div>
        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100">
          {points.length} inputs
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full shadow-[0_0_24px_rgba(248,113,113,0.2)]" style={{ background: `linear-gradient(90deg, ${oil.gradient.join(', ')})` }} />
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>lower</span>
        <span>critical</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
        <LegendSwatch color={oil.marker} label={`${reportedCount} reported records`} />
        <LegendSwatch color="#2dd4bf" label={`${contextCount} context zones`} />
        {oil.legend.map((item, index) => (
          <LegendSwatch key={item} color={oil.gradient[index + 1] ?? oil.marker} label={item} />
        ))}
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full border border-slate-200/30" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function PanelTabs({ activePanel, setActivePanel }) {
  const tabs = [
    ['insights', 'Insights', BarChart3],
    ['records', 'Records', Waves],
    ['sources', 'Sources', ShieldCheck],
    ['copilot', 'Copilot', Bot],
  ];
  return (
    <div className="grid grid-cols-4 gap-1 rounded-[1.1rem] border border-slate-700/70 bg-slate-950/72 p-1.5 backdrop-blur-xl">
      {tabs.map(([id, label, Icon]) => (
        <button
          key={id}
          onClick={() => setActivePanel(id)}
          className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition duration-200 ${
            activePanel === id
              ? 'bg-cyan-300 text-slate-950'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          <Icon size={14} />
          <span className="hidden sm:inline xl:hidden 2xl:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

function InsightsPanel({ forecasts, rankedZones, selected, setGeographyId, stats }) {
  return (
    <div className="space-y-5">
      {selected ? <IncidentDetails incident={selected} /> : <EmptyInspector />}
      <section>
        <PanelTitle label="Highest-risk zones" />
        <div className="space-y-2">
          {rankedZones.slice(0, 7).map((zone) => (
            <button
              key={zone.id}
              onClick={() => setGeographyId(zone.id)}
              className="group w-full rounded-2xl border border-slate-700/80 bg-slate-900/72 p-3 text-left transition duration-200 hover:border-cyan-300/50 hover:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">{zone.label}</span>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-400">{zone.count} inputs</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-red-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(6, zone.score * 100))}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </section>
      <section>
        <PanelTitle label="AI forecast blocks" />
        <div className="space-y-2">
          {forecasts.map((forecast) => (
            <div key={forecast.title} className="rounded-2xl border border-slate-700/80 bg-slate-900/72 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{forecast.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{forecast.body}</p>
                </div>
                <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-100">
                  {formatPercent(forecast.score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-700/80 bg-slate-900/72 p-3">
        <PanelTitle label="Historical comparison" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <QuickReadout label="Reported" value={stats.reportedCount} />
          <QuickReadout label="Context" value={stats.contextCount} />
          <QuickReadout label="Critical" value={stats.criticalCount} />
          <QuickReadout label="Avg score" value={formatPercent(stats.averageSeverity)} />
        </div>
      </section>
    </div>
  );
}

function RecordsPanel({ incidents, setSelected }) {
  return (
    <div className="space-y-2">
      {incidents.slice(0, 90).map((incident) => (
        <button
          key={incident.id}
          onClick={() => setSelected(incident)}
          className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/72 p-3 text-left transition duration-200 hover:border-cyan-300/50 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold leading-snug text-slate-100">{incident.name}</p>
            <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300">
              {Math.round(incident.severity_score * 100)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{incident.open_date} | {incident.location}</p>
          <p className="mt-2 text-[11px] text-slate-400">{incident.severity_label}</p>
        </button>
      ))}
      {!incidents.length && <p className="rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4 text-sm text-slate-400">No marine records match the active filters.</p>}
    </div>
  );
}

function SourcesPanel({ surfacePayload }) {
  const sources = surfacePayload?.context_sources ?? [];
  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <a
          key={source.name}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4 transition duration-200 hover:border-cyan-300/50 hover:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-100">{source.name}</p>
            <ExternalLink size={14} className="text-slate-500" />
          </div>
        </a>
      ))}
      <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-xs leading-relaxed text-cyan-50/80">
        The heat surface is a decision-support view. Context zones describe maritime oil-risk pressure, not confirmed pollution detections.
      </p>
    </div>
  );
}

function CopilotPanel({ mapMode, selectedGeography, selectedOil, stats, status }) {
  const steps = [
    ['Ingest official records', status === 'success' ? 'complete' : 'running'],
    [`Scope region: ${selectedGeography.label}`, 'complete'],
    [`Color model: ${selectedOil.label}`, 'complete'],
    [`Render WebGL ${MAP_VIEWS[mapMode].label.toLowerCase()} view`, 'complete'],
    [`Blend ${stats.contextCount} context anchors with ${stats.reportedCount} reported records`, 'complete'],
    ['Keep analyst review before operational decisions', 'guardrail'],
  ];
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Analyst copilot</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-100">Current review plan</h3>
      </div>
      {steps.map(([label, state]) => (
        <div key={label} className="flex items-start gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/72 p-3">
          <CheckCircle2
            size={16}
            className={state === 'guardrail' ? 'mt-0.5 text-amber-300' : 'mt-0.5 text-cyan-300'}
          />
          <p className="text-sm leading-6 text-slate-300">{label}</p>
        </div>
      ))}
    </div>
  );
}

function IncidentDetails({ incident }) {
  const oilType = classifyOilType(incident);
  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/70">Selected marine signal</p>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-slate-50">{incident.name}</h3>
      <p className="mt-1 text-xs text-slate-400">{incident.location} | {incident.open_date || 'context zone'}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <QuickReadout label="Severity" value={formatPercent(incident.severity_score)} />
        <QuickReadout label="Signal" value={OIL_TYPES[oilType]?.label ?? 'Unknown'} />
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <Detail label="Assessment" value={incident.severity_label} />
        <Detail label="Commodity" value={incident.commodity || 'Unknown'} />
        <Detail label="Release" value={formatGallons(incident.max_potential_release_gallons)} />
      </div>
      {incident.description && (
        <p className="mt-4 rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-400">
          {incident.description}
        </p>
      )}
      {incident.source_url && (
        <a href={incident.source_url} target="_blank" rel="noreferrer" className="premium-button mt-4 w-full justify-center">
          <ExternalLink size={14} /> Open source
        </a>
      )}
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-700/70 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-900/72 p-6 text-center text-slate-400">
      <Crosshair size={28} />
      <p className="mt-3 text-sm leading-6">Select a heat zone or marine marker to inspect a possible oil-like anomaly or context signal.</p>
    </div>
  );
}

function PanelTitle({ label }) {
  return <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>;
}

function StatusPill({ status }) {
  const map = {
    success: ['bg-emerald-400', 'Live feed'],
    loading: ['bg-cyan-300', 'Syncing'],
    error: ['bg-red-400', 'Feed issue'],
    idle: ['bg-slate-500', 'Idle'],
  };
  const [dot, label] = map[status] ?? map.idle;
  return (
    <div className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 text-xs font-semibold text-slate-200">
      <span className={`h-2 w-2 rounded-full ${dot} animate-pulse`} />
      {label}
    </div>
  );
}

function QuickReadout({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/64 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function SeverityBars({ distribution }) {
  const total = Math.max(1, Object.values(distribution).reduce((sum, value) => sum + value, 0));
  const bars = [
    ['Lower', distribution.lower, 'bg-cyan-300'],
    ['Moderate', distribution.moderate, 'bg-amber-300'],
    ['High', distribution.high, 'bg-orange-500'],
    ['Critical', distribution.critical, 'bg-red-500'],
  ];
  return (
    <div className="space-y-2">
      {bars.map(([label, value, color]) => (
        <div key={label} className="grid grid-cols-[68px_minmax(0,1fr)_34px] items-center gap-2 text-[11px] text-slate-400">
          <span>{label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.max(4, (value / total) * 100)}%` }} />
          </span>
          <span className="text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data }) {
  const max = Math.max(1, ...data.map((item) => item.count));
  const points = data.map((item, index) => {
    const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * 100;
    const y = 40 - (item.count / max) * 34;
    return `${x},${y}`;
  });
  return (
    <svg className="h-16 w-full overflow-visible" viewBox="0 0 100 44" role="img" aria-label="Pollution trend chart">
      <path d="M0 40 H100" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
      <polyline fill="none" points={points.join(' ')} stroke="#67e8f9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <polyline fill="none" points={points.join(' ')} stroke="rgba(103,232,249,0.28)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
      {data.map((item, index) => {
        const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * 100;
        const y = 40 - (item.count / max) * 34;
        return <circle key={item.year} cx={x} cy={y} r="1.7" fill="#e0faff" />;
      })}
    </svg>
  );
}

function ZoneSpark({ zones }) {
  const max = Math.max(1, ...zones.map((zone) => zone.count * zone.score));
  return (
    <div className="flex h-16 items-end gap-1.5">
      {zones.map((zone) => (
        <div key={zone.id} className="group relative flex flex-1 items-end">
          <span
            className="block w-full rounded-t-lg bg-gradient-to-t from-red-500 via-amber-300 to-cyan-300"
            style={{ height: `${Math.max(10, ((zone.count * zone.score) / max) * 58)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function ForecastNeedle({ value }) {
  return (
    <div className="relative h-3 rounded-full bg-slate-800">
      <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-red-500" style={{ width: `${Math.max(6, value * 100)}%` }} />
      <span className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-slate-50 shadow-[0_0_14px_rgba(255,255,255,0.6)]" style={{ left: `${Math.min(96, Math.max(3, value * 100))}%` }} />
    </div>
  );
}

function CommandPalette({ commands, open, setOpen }) {
  const [needle, setNeedle] = useState('');
  const visible = commands.filter((command) =>
    `${command.label} ${command.hint}`.toLowerCase().includes(needle.toLowerCase()),
  );
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[1000] flex items-start justify-center bg-slate-950/72 px-4 pt-24 backdrop-blur-xl">
      <div className="w-full max-w-[560px] rounded-[1.35rem] border border-cyan-300/20 bg-slate-950/92 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2 border-b border-slate-700/70 px-4 py-3">
          <Command size={16} className="text-cyan-300" />
          <input
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            value={needle}
            onChange={(event) => setNeedle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
            }}
            placeholder="Jump to region, switch mode, filter critical..."
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {visible.map((command) => (
            <button
              key={command.label}
              onClick={() => {
                command.action();
                setOpen(false);
                setNeedle('');
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition duration-150 hover:bg-cyan-300/10 hover:text-cyan-50"
            >
              {command.label}
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{command.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function computeStats(incidents, surface) {
  const severityTotal = surface.reduce((sum, point) => sum + Number(point.severity_score ?? 0), 0);
  const averageSeverity = surface.length ? severityTotal / surface.length : 0;
  const reportedCount = surface.filter((point) => point.record_type !== 'context_anchor').length;
  const contextCount = surface.length - reportedCount;
  const highCount = surface.filter((point) => point.severity_score >= 0.7).length;
  const criticalCount = surface.filter((point) => point.severity_score >= 0.9).length;
  const recentCount = incidents.filter((incident) => incident.open_date >= '2020-01-01').length;
  const earlierCount = Math.max(0, incidents.length - recentCount);
  const trendLabel = recentCount > earlierCount ? 'Rising watch' : recentCount === earlierCount ? 'Stable watch' : 'Cooling watch';
  return {
    averageSeverity,
    contextCount,
    criticalCount,
    distribution: {
      lower: surface.filter((point) => point.severity_score < 0.45).length,
      moderate: surface.filter((point) => point.severity_score >= 0.45 && point.severity_score < 0.7).length,
      high: surface.filter((point) => point.severity_score >= 0.7 && point.severity_score < 0.9).length,
      critical: criticalCount,
    },
    highCount,
    recentCount,
    reportedCount,
    surfaceCount: surface.length,
    trendLabel,
  };
}

function buildTrend(incidents) {
  const buckets = new Map();
  incidents.forEach((incident) => {
    const year = String(incident.open_date || '').slice(0, 4);
    if (!/^\d{4}$/.test(year)) return;
    buckets.set(year, (buckets.get(year) ?? 0) + 1);
  });
  const years = Array.from(buckets.keys()).sort().slice(-10);
  if (!years.length) return [{ year: 'now', count: 0 }];
  return years.map((year) => ({ year, count: buckets.get(year) ?? 0 }));
}

function buildForecasts(stats, rankedZones) {
  const top = rankedZones[0];
  const score = Math.min(0.98, Math.max(0.18, stats.averageSeverity * 0.72 + stats.highCount / Math.max(16, stats.surfaceCount)));
  return [
    {
      title: top ? `${top.label} watch` : 'Global watch',
      body: top
        ? `Next review should prioritize ${top.label}. The visible surface has ${top.count} inputs and an average pressure of ${formatPercent(top.score)}.`
        : 'No visible hotspot is selected. Broaden filters to build a forecast.',
      score,
    },
    {
      title: '30 day drift risk',
      body: `${stats.highCount} high-severity signals remain in scope. Treat this as a triage forecast, not a confirmed detection.`,
      score: Math.min(0.95, score * 0.86 + 0.08),
    },
    {
      title: 'Analyst confidence',
      body: `${stats.contextCount} context anchors support routing decisions, while ${stats.reportedCount} official reported records ground the view.`,
      score: Math.min(0.92, 0.35 + stats.reportedCount / Math.max(20, stats.surfaceCount + 1)),
    },
  ];
}

function rankZones(points) {
  return GEOGRAPHY_FILTERS.filter((zone) => zone.bounds)
    .map((zone) => {
      const zonePoints = points.filter((point) => inBounds(point, zone.bounds));
      const score = zonePoints.length
        ? zonePoints.reduce((total, point) => total + point.severity_score, 0) / zonePoints.length
        : 0;
      return { ...zone, count: zonePoints.length, score };
    })
    .sort((a, b) => b.score * b.count - a.score * a.count);
}
