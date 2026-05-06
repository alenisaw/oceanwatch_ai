import { useCallback, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  LayersControl,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Command,
  ExternalLink,
  Flame,
  Globe2,
  Layers,
  Map,
  Radar,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { fetchNoaaIncidents, fetchOceanRiskSurface } from '../api/oceanwatch.js';

const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_START = '2010-01-01';
const DEFAULT_END = TODAY;
const MAP_MODE_POINTS = 'points';
const MAP_MODE_HEAT = 'heat';

const GEOGRAPHY_FILTERS = [
  { id: 'global', label: 'Global', type: 'World', bounds: null },
  { id: 'north-america', label: 'North America', type: 'Continent', bounds: [[5, -170], [75, -45]] },
  { id: 'europe', label: 'Europe', type: 'Continent', bounds: [[34, -25], [72, 45]] },
  { id: 'asia', label: 'Asia', type: 'Continent', bounds: [[-10, 45], [72, 150]] },
  { id: 'africa', label: 'Africa', type: 'Continent', bounds: [[-36, -20], [38, 55]] },
  { id: 'south-america', label: 'South America', type: 'Continent', bounds: [[-56, -85], [14, -30]] },
  { id: 'gulf-mexico', label: 'Gulf of Mexico', type: 'Sea', bounds: [[18, -98], [31, -80]] },
  { id: 'north-sea', label: 'North Sea', type: 'Sea', bounds: [[51, -5], [62, 10]] },
  { id: 'mediterranean', label: 'Mediterranean', type: 'Sea', bounds: [[30, -6], [46, 37]] },
  { id: 'persian-gulf', label: 'Persian Gulf', type: 'Sea', bounds: [[23, 47], [31, 58]] },
  { id: 'south-china-sea', label: 'South China Sea', type: 'Sea', bounds: [[-2, 103], [24, 122]] },
  { id: 'malacca', label: 'Malacca Strait', type: 'Corridor', bounds: [[0, 95], [8, 105]] },
  { id: 'hormuz', label: 'Strait of Hormuz', type: 'Corridor', bounds: [[24, 53], [28, 59]] },
  { id: 'suez', label: 'Suez / Red Sea', type: 'Corridor', bounds: [[11, 31], [31, 44]] },
];

const SEVERITY_FILTERS = [
  { id: 'all', label: 'All severity', min: 0 },
  { id: 'moderate', label: 'Moderate+', min: 0.45 },
  { id: 'high', label: 'High+', min: 0.7 },
  { id: 'critical', label: 'Critical', min: 0.9 },
];

const OIL_TYPES = {
  all: {
    label: 'All oil-like signals',
    marker: '#f97316',
    gradient: {
      0.16: '#22d3ee',
      0.32: '#84cc16',
      0.5: '#facc15',
      0.68: '#f97316',
      0.84: '#dc2626',
      1.0: '#050505',
    },
    legend: ['cyan/green context', 'amber reported intensity', 'black critical severity'],
  },
  crude: {
    label: 'Crude / petroleum',
    marker: '#f97316',
    gradient: {
      0.18: '#fde68a',
      0.38: '#f59e0b',
      0.58: '#c2410c',
      0.78: '#7f1d1d',
      1.0: '#050505',
    },
    legend: ['amber sheen', 'red dense release', 'black severe heavy oil'],
  },
  refined: {
    label: 'Diesel / refined fuel',
    marker: '#38bdf8',
    gradient: {
      0.18: '#67e8f9',
      0.4: '#0ea5e9',
      0.62: '#2563eb',
      0.82: '#7c3aed',
      1.0: '#1e1b4b',
    },
    legend: ['cyan light sheen', 'blue refined fuel', 'violet concentrated signal'],
  },
  unknown: {
    label: 'Unknown oil-like anomaly',
    marker: '#facc15',
    gradient: {
      0.18: '#bef264',
      0.38: '#facc15',
      0.6: '#fb923c',
      0.8: '#ef4444',
      1.0: '#3f0a0a',
    },
    legend: ['green/yellow possible sheen', 'orange uncertain zone', 'dark red severe anomaly'],
  },
  context: {
    label: 'Maritime risk context',
    marker: '#2dd4bf',
    gradient: {
      0.2: '#2dd4bf',
      0.42: '#14b8a6',
      0.62: '#f59e0b',
      0.82: '#ea580c',
      1.0: '#111827',
    },
    legend: ['teal corridor context', 'amber oil transit pressure', 'dark concentrated context'],
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
  if (score >= 0.9) return '#08090A';
  if (score >= 0.7) return oilType === 'refined' ? '#7c3aed' : '#7f1d1d';
  if (score >= 0.45) return oilType === 'refined' ? '#0ea5e9' : '#f97316';
  return OIL_TYPES[oilType]?.marker ?? '#facc15';
}

function markerRadius(score) {
  return Math.max(5, Math.min(18, 5 + score * 14));
}

function gibsUrl(date) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

function esriWorldImageryUrl() {
  return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
}

function formatGallons(value) {
  if (value == null) return 'unknown release estimate';
  return `${Number(value).toLocaleString()} gal max potential`;
}

function FocusMap({ incident, geography }) {
  const map = useMap();
  useEffect(() => {
    if (incident) {
      map.flyTo([incident.lat, incident.lon], Math.max(map.getZoom(), 6), { duration: 0.7 });
      return;
    }
    if (geography?.bounds) {
      map.fitBounds(geography.bounds, { padding: [24, 24], duration: 0.7 });
    }
  }, [geography, incident, map]);
  return null;
}

function HeatSurfaceLayer({ gradient, incidents, pulseKey }) {
  const map = useMap();

  useEffect(() => {
    const sparseRegion = incidents.length > 0 && incidents.length < 12;
    const points = incidents.map((incident) => [
      incident.lat,
      incident.lon,
      Math.max(sparseRegion ? 0.48 : 0.22, incident.severity_score),
    ]);
    const layer = L.heatLayer(points, {
      radius: sparseRegion ? 58 : 36,
      blur: sparseRegion ? 34 : 30,
      maxZoom: 7,
      max: 1,
      minOpacity: sparseRegion ? 0.34 : 0.2,
      gradient,
    });
    layer.addTo(map);
    const canvas = layer._canvas;
    if (canvas) {
      canvas.classList.remove('heat-bloom');
      window.requestAnimationFrame(() => canvas.classList.add('heat-bloom'));
    }
    return () => {
      layer.remove();
    };
  }, [gradient, incidents, map, pulseKey]);

  return null;
}

export default function GlobalMap() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const [surfacePayload, setSurfacePayload] = useState(null);
  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [viewDate, setViewDate] = useState(DEFAULT_END);
  const [query, setQuery] = useState('');
  const [mapMode, setMapMode] = useState(MAP_MODE_POINTS);
  const [geographyId, setGeographyId] = useState('global');
  const [severityId, setSeverityId] = useState('all');
  const [oilType, setOilType] = useState('all');
  const [recordType, setRecordType] = useState('all');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('overview');
  const [pulseKey, setPulseKey] = useState(0);

  const selectedGeography = GEOGRAPHY_FILTERS.find((item) => item.id === geographyId) ?? GEOGRAPHY_FILTERS[0];
  const selectedSeverity = SEVERITY_FILTERS.find((item) => item.id === severityId) ?? SEVERITY_FILTERS[0];
  const selectedOil = OIL_TYPES[oilType] ?? OIL_TYPES.all;

  const loadIncidents = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const data = await fetchNoaaIncidents({
        threat: 'Oil',
        limit: 2000,
        startDate,
        endDate,
      });
      const surface = await fetchOceanRiskSurface({
        threat: 'Oil',
        limit: 2000,
        startDate,
        endDate,
      });
      setPayload(data);
      setSurfacePayload(surface);
      setSelected(data.incidents?.[0] ?? null);
      setPulseKey((key) => key + 1);
      setStatus('success');
    } catch (err) {
      setError(err.message ?? 'Failed to load NOAA incident feed');
      setStatus('error');
    }
  }, [startDate, endDate]);

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

  useEffect(() => {
    setPulseKey((key) => key + 1);
  }, [geographyId, mapMode, oilType, query, recordType, severityId]);

  const incidents = payload?.incidents ?? [];
  const surfacePoints = useMemo(
    () => [...(surfacePayload?.surface_points ?? incidents), ...OCEAN_CONTEXT_SUPPLEMENTS],
    [incidents, surfacePayload],
  );

  const filteredIncidents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return incidents.filter((incident) => {
      const incidentOilType = classifyOilType(incident);
      const text = [incident.name, incident.location, incident.commodity, incident.tags]
        .join(' ')
        .toLowerCase();
      return (
        isMarineRelevant(incident) &&
        (!needle || text.includes(needle)) &&
        inBounds(incident, selectedGeography.bounds) &&
        incident.severity_score >= selectedSeverity.min &&
        (oilType === 'all' || incidentOilType === oilType)
      );
    });
  }, [incidents, oilType, query, selectedGeography.bounds, selectedSeverity.min]);

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

  const criticalCount = filteredIncidents.filter((incident) => incident.severity_score >= 0.9).length;
  const highCount = filteredIncidents.filter((incident) => incident.severity_score >= 0.7).length;
  const contextCount = filteredSurface.filter((point) => point.record_type === 'context_anchor').length;
  const reportedSurfaceCount = filteredSurface.length - contextCount;
  const apiContextCount = surfacePayload?.context_anchor_count ?? 0;
  const rankedZones = useMemo(
    () => rankZones(filteredSurface),
    [filteredSurface],
  );

  function showRegion(regionId) {
    setGeographyId(regionId);
    setMapMode(MAP_MODE_HEAT);
    setRecordType('all');
    setSeverityId('all');
    setOilType('all');
    setSelected(null);
  }

  const commands = [
    { label: 'Switch to Satellite Heat', action: () => setMapMode(MAP_MODE_HEAT), hint: 'surface' },
    { label: 'Switch to Map', action: () => setMapMode(MAP_MODE_POINTS), hint: 'markers' },
    { label: 'Show critical only', action: () => setSeverityId('critical'), hint: 'filter' },
    { label: 'Show Gulf of Mexico', action: () => showRegion('gulf-mexico'), hint: 'region' },
    { label: 'Show North Sea', action: () => showRegion('north-sea'), hint: 'region' },
    { label: 'Show Malacca Strait', action: () => showRegion('malacca'), hint: 'corridor' },
    { label: 'Show analyst plan', action: () => setActivePanel('plan'), hint: 'copilot' },
    { label: 'Reset filters', action: resetFilters, hint: 'clear' },
  ];

  function resetFilters() {
    setGeographyId('global');
    setSeverityId('all');
    setOilType('all');
    setRecordType('all');
    setQuery('');
    setSelected(null);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-3">
      <section className="panel flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
        <div className="flex min-h-[48%] flex-1 min-w-0 flex-col xl:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ocean-700 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">OceanWatch Mission Control</h2>
              <p className="text-xs text-slate-500">
                Reported records, maritime risk context, and satellite heat intelligence.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-ocean-600 bg-ocean-900 p-1">
                <ModeButton
                  active={mapMode === MAP_MODE_POINTS}
                  icon={<Map size={13} />}
                  label="Map"
                  onClick={() => setMapMode(MAP_MODE_POINTS)}
                />
                <ModeButton
                  active={mapMode === MAP_MODE_HEAT}
                  icon={<Flame size={13} />}
                  label="Satellite Heat"
                  onClick={() => setMapMode(MAP_MODE_HEAT)}
                />
              </div>
              <button onClick={() => setPaletteOpen(true)} className="btn-ghost text-xs">
                <Command size={13} /> K
              </button>
              <button onClick={loadIncidents} className="btn-ghost text-xs" disabled={status === 'loading'}>
                <RefreshCcw size={13} /> Refresh
              </button>
            </div>
          </div>

          <FilterBar
            endDate={endDate}
            geographyId={geographyId}
            oilType={oilType}
            query={query}
            recordType={recordType}
            severityId={severityId}
            setEndDate={setEndDate}
            setGeographyId={setGeographyId}
            setOilType={setOilType}
            setQuery={setQuery}
            setRecordType={setRecordType}
            setSeverityId={setSeverityId}
            setStartDate={setStartDate}
            setViewDate={setViewDate}
            startDate={startDate}
            viewDate={viewDate}
          />

          <div className="relative min-h-[360px] flex-1">
            <MapContainer
              center={[20, 0]}
              zoom={2}
              minZoom={2}
              maxZoom={9}
              className="h-full w-full"
              worldCopyJump
            >
              {mapMode === MAP_MODE_POINTS ? (
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.Overlay name={`NASA GIBS imagery (${viewDate})`}>
                    <TileLayer
                      key={viewDate}
                      url={gibsUrl(viewDate)}
                      minZoom={1}
                      maxZoom={9}
                      opacity={0.62}
                      attribution="Satellite imagery: NASA GIBS"
                    />
                  </LayersControl.Overlay>
                </LayersControl>
              ) : (
                <>
                  <TileLayer
                    url={esriWorldImageryUrl()}
                    maxZoom={19}
                    opacity={0.9}
                    attribution="Satellite imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
                  />
                  <HeatSurfaceLayer
                    gradient={selectedOil.gradient}
                    incidents={filteredSurface}
                    pulseKey={pulseKey}
                  />
                  <DetailedLegend
                    contextCount={contextCount}
                    oil={selectedOil}
                    reportedCount={reportedSurfaceCount}
                    surfaceCount={filteredSurface.length}
                  />
                </>
              )}
              <FocusMap geography={selectedGeography} incident={selected} />
              {mapMode === MAP_MODE_POINTS &&
                filteredIncidents.map((incident) => {
                  const incidentOilType = classifyOilType(incident);
                  return (
                    <CircleMarker
                      key={incident.id}
                      center={[incident.lat, incident.lon]}
                      radius={markerRadius(incident.severity_score)}
                      pathOptions={{
                        color: '#F8FAFC',
                        weight: selected?.id === incident.id ? 2 : 0.7,
                        fillColor: severityColor(incident.severity_score, incidentOilType),
                        fillOpacity: selected?.id === incident.id ? 0.92 : 0.72,
                      }}
                      eventHandlers={{
                        click: () => setSelected(incident),
                      }}
                    >
                      <Popup>
                        <div className="space-y-1 text-slate-900">
                          <strong>{incident.name}</strong>
                          <div>{incident.open_date} | {incident.location}</div>
                          <div>{incident.severity_label}</div>
                          <div>{OIL_TYPES[incidentOilType]?.label}</div>
                          <div>{formatGallons(incident.max_potential_release_gallons)}</div>
                          <a href={incident.source_url} target="_blank" rel="noreferrer">
                            NOAA incident record
                          </a>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
            </MapContainer>
          </div>
        </div>

        <aside className="flex max-h-[44%] w-full flex-shrink-0 flex-col gap-3 border-t border-ocean-700 bg-ocean-900/70 p-3 xl:max-h-none xl:w-[390px] xl:border-l xl:border-t-0">
          <div className="grid grid-cols-3 gap-2">
          <MiniMetric label="Ocean Records" value={filteredIncidents.length} />
            <MiniMetric label="High+" value={highCount} />
            <MiniMetric label="Critical" value={criticalCount} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric label="Surface" value={filteredSurface.length} />
            <MiniMetric label="Context" value={contextCount} />
          </div>

          <PanelTabs activePanel={activePanel} setActivePanel={setActivePanel} />

          <section className="panel min-h-0 flex-1 overflow-y-auto scrollable p-3">
            {activePanel === 'overview' && (
          <OverviewPanel
                error={error}
                payload={payload}
                rankedZones={rankedZones}
                selected={selected}
                setGeographyId={setGeographyId}
                status={status}
                surfacePayload={surfacePayload}
              />
            )}
            {activePanel === 'records' && (
              <RecordsPanel incidents={filteredIncidents} setSelected={setSelected} />
            )}
            {activePanel === 'sources' && <SourcesPanel surfacePayload={surfacePayload} />}
            {activePanel === 'plan' && (
              <AnalystPlanPanel
                contextCount={contextCount}
                filteredSurfaceCount={filteredSurface.length}
                mapMode={mapMode}
                selectedGeography={selectedGeography}
                selectedOil={selectedOil}
                status={status}
              />
            )}
          </section>
        </aside>
      </section>

      <CommandPalette
        commands={commands}
        open={paletteOpen}
        setOpen={setPaletteOpen}
      />
    </div>
  );
}

function FilterBar(props) {
  return (
    <div className="flex min-h-[76px] items-end gap-2 overflow-x-auto overflow-y-hidden border-b border-ocean-700 bg-ocean-950/60 px-3 py-2">
      <SelectField label="Geography" value={props.geographyId} onChange={props.setGeographyId}>
        {GEOGRAPHY_FILTERS.map((item) => (
          <option key={item.id} value={item.id}>{item.label} ({item.type})</option>
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
      <label className="block w-[160px] flex-shrink-0">
        <span className="label">Satellite date</span>
        <input
          className="input-field h-9 py-1.5"
          type="date"
          value={props.viewDate}
          onChange={(event) => props.setViewDate(event.target.value)}
        />
      </label>
      <label className="relative block w-[230px] flex-shrink-0">
        <span className="label">Search</span>
        <Search size={14} className="pointer-events-none absolute left-3 top-[31px] text-slate-500" />
        <input
          className="input-field h-9 py-1.5 pl-9"
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="country, sea, commodity"
        />
      </label>
      <label className="block w-[160px] flex-shrink-0">
        <span className="label">Incident start</span>
        <input
          className="input-field h-9 py-1.5"
          type="date"
          value={props.startDate}
          onChange={(event) => props.setStartDate(event.target.value)}
        />
      </label>
      <label className="block w-[160px] flex-shrink-0">
        <span className="label">Incident end</span>
        <input
          className="input-field h-9 py-1.5"
          type="date"
          value={props.endDate}
          onChange={(event) => props.setEndDate(event.target.value)}
        />
      </label>
    </div>
  );
}

function SelectField({ children, label, onChange, value }) {
  return (
    <label className="block w-[190px] flex-shrink-0">
      <span className="label">{label}</span>
      <select className="input-field h-9 py-1.5" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function DetailedLegend({ contextCount, oil, reportedCount, surfaceCount }) {
  return (
    <div className="leaflet-bottom leaflet-left pointer-events-none">
                  <div className="mission-legend heat-bloom m-3 w-[330px] rounded-lg border border-ocean-600 p-3 shadow-ocean">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Pollution severity surface</p>
            <p className="mt-1 text-xs font-semibold text-slate-100">{oil.label}</p>
          </div>
      <span className="rounded bg-ocean-700 px-2 py-1 text-[10px] text-cyan-bright">
        {surfaceCount} inputs
      </span>
        </div>
        <div
          className="mt-3 h-2 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, ' +
              Object.values(oil.gradient).join(', ') +
              ')',
          }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>lower</span>
          <span>critical</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <LegendSwatch color={oil.marker} label={`${reportedCount} reported records`} />
          <LegendSwatch color="#2dd4bf" label={`${contextCount} context zones`} />
          {oil.legend.map((item) => (
            <LegendSwatch key={item} color="#64748b" label={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function PanelTabs({ activePanel, setActivePanel }) {
  const tabs = [
    ['overview', 'Overview', Radar],
    ['records', 'Records', Layers],
    ['sources', 'Sources', ShieldCheck],
    ['plan', 'Plan', Bot],
  ];
  return (
    <div className="flex gap-1 rounded-lg border border-ocean-700 bg-ocean-950 p-1">
      {tabs.map(([id, label, Icon]) => (
        <button
          key={id}
          onClick={() => setActivePanel(id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors duration-150 ${
            activePanel === id
              ? 'bg-ocean-700 text-cyan-bright'
              : 'text-slate-500 hover:bg-ocean-800 hover:text-slate-200'
          }`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}

function OverviewPanel({ error, payload, rankedZones, selected, setGeographyId, status, surfacePayload }) {
  return (
    <div className="space-y-4">
      {status === 'loading' && <p className="text-xs text-slate-500">Loading official records and context...</p>}
      {status === 'error' && <p className="text-xs text-red-300">{error}</p>}
      {selected ? <IncidentDetails incident={selected} /> : <EmptyInspector />}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Ranked visible zones</p>
        <div className="space-y-2">
          {rankedZones.slice(0, 6).map((zone) => (
            <button
              key={zone.id}
              onClick={() => setGeographyId(zone.id)}
              className="w-full rounded-md border border-ocean-700 bg-ocean-900 p-2 text-left hover:border-cyan-dark"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">{zone.label}</span>
                <span className="text-[10px] text-slate-500">{zone.count} inputs</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-ocean-700">
                <div
                  className="h-full rounded-full bg-cyan-bright"
                  style={{ width: `${Math.min(100, zone.score * 100)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
      <SourceNotes payload={payload} surfacePayload={surfacePayload} />
    </div>
  );
}

function RecordsPanel({ incidents, setSelected }) {
  return (
    <div className="space-y-2">
      {incidents.slice(0, 80).map((incident) => (
        <button
          key={incident.id}
          onClick={() => setSelected(incident)}
          className="w-full rounded-md border border-ocean-700 bg-ocean-900 p-3 text-left hover:border-cyan-dark"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold leading-snug text-slate-100">{incident.name}</p>
            <span className="rounded bg-ocean-700 px-1.5 py-0.5 text-[10px] text-slate-300">
              {Math.round(incident.severity_score * 100)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{incident.open_date} | {incident.location}</p>
        </button>
      ))}
      {!incidents.length && <p className="text-xs text-slate-500">No records match the active filters.</p>}
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
          className="block rounded-md border border-ocean-700 bg-ocean-900 p-3 hover:border-cyan-dark"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-100">{source.name}</p>
            <ExternalLink size={13} className="text-slate-500" />
          </div>
        </a>
      ))}
      <p className="rounded-md border border-ocean-700 bg-ocean-950 p-3 text-[11px] leading-relaxed text-slate-500">
        The heat surface is a decision-support view. Context zones describe maritime oil-risk pressure, not confirmed pollution detections.
      </p>
    </div>
  );
}

function AnalystPlanPanel({ contextCount, filteredSurfaceCount, mapMode, selectedGeography, selectedOil, status }) {
  const steps = [
    ['Fetch official records', status === 'success' ? 'complete' : 'running'],
    [`Apply geography: ${selectedGeography.label}`, 'complete'],
    [`Color by signal: ${selectedOil.label}`, 'complete'],
    [`Build ${mapMode === MAP_MODE_HEAT ? 'satellite heat surface' : 'reported incident map'}`, 'complete'],
    [`Blend ${contextCount} context anchors with ${filteredSurfaceCount - contextCount} reported records`, 'complete'],
    ['Analyst review required before operational decisions', 'guardrail'],
  ];
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500">Analyst copilot</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-100">Current review plan</h3>
      </div>
      {steps.map(([label, state]) => (
        <div key={label} className="flex items-start gap-3 rounded-md border border-ocean-700 bg-ocean-900 p-3">
          <CheckCircle2
            size={15}
            className={state === 'guardrail' ? 'mt-0.5 text-amber-300' : 'mt-0.5 text-cyan-bright'}
          />
          <p className="text-xs leading-relaxed text-slate-300">{label}</p>
        </div>
      ))}
      <div className="rounded-md border border-ocean-700 bg-ocean-950 p-3">
        <p className="text-xs font-semibold text-slate-200">Try command palette</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Press K to jump to a sea, switch map modes, show critical zones, or reset the workspace.
        </p>
      </div>
    </div>
  );
}

function SourceNotes({ payload, surfacePayload }) {
  return (
    <div className="space-y-2">
      {payload?.coverage_note && (
        <p className="rounded-md border border-ocean-700 bg-ocean-950 p-3 text-[11px] leading-relaxed text-slate-500">
          {payload.coverage_note}
        </p>
      )}
      {surfacePayload?.coverage_note && (
        <p className="rounded-md border border-ocean-700 bg-ocean-950 p-3 text-[11px] leading-relaxed text-slate-500">
          {surfacePayload.coverage_note}
        </p>
      )}
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
    <div className="absolute inset-0 z-[1000] flex items-start justify-center bg-ocean-950/60 pt-24 backdrop-blur-sm">
      <div className="w-[520px] rounded-xl border border-ocean-600 bg-ocean-900 shadow-ocean">
        <div className="flex items-center gap-2 border-b border-ocean-700 px-3 py-3">
          <Command size={16} className="text-cyan-bright" />
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
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-ocean-700"
            >
              {command.label}
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{command.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-ocean-700 bg-ocean-950 p-6 text-center text-slate-500">
      <Globe2 size={26} />
              <p className="mt-2 text-sm">Select a marine marker to inspect a reported possible oil incident.</p>
    </div>
  );
}

function ModeButton({ active, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
        active
          ? 'bg-ocean-700 text-cyan-bright'
          : 'text-slate-500 hover:bg-ocean-800 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="metric-card">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function IncidentDetails({ incident }) {
  const oilType = classifyOilType(incident);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500">Selected marine record</p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-slate-100">{incident.name}</h3>
        <p className="mt-1 text-xs text-slate-500">
          {incident.location} | {incident.open_date}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniMetric label="Severity" value={`${Math.round(incident.severity_score * 100)}%`} />
        <MiniMetric label="Signal" value={OIL_TYPES[oilType]?.label ?? 'Unknown'} />
      </div>
      <div className="space-y-2 text-xs text-slate-400">
        <Detail label="Assessment" value={incident.severity_label} />
        <Detail label="Commodity" value={incident.commodity || 'Unknown'} />
        <Detail label="Release" value={formatGallons(incident.max_potential_release_gallons)} />
        <Detail label="Tags" value={incident.tags || 'None listed'} />
      </div>
      {incident.description && (
        <p className="rounded-md border border-ocean-700 bg-ocean-900 p-3 text-xs leading-relaxed text-slate-400">
          {incident.description}
        </p>
      )}
      <a
        href={incident.source_url}
        target="_blank"
        rel="noreferrer"
        className="btn-ghost inline-flex w-full justify-center border border-ocean-600 text-xs"
      >
        <ExternalLink size={13} /> Open source
      </a>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ocean-700 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-300">{value}</span>
    </div>
  );
}

function rankZones(points) {
  return GEOGRAPHY_FILTERS.filter((zone) => zone.bounds).map((zone) => {
    const zonePoints = points.filter((point) => inBounds(point, zone.bounds));
    const score = zonePoints.length
      ? zonePoints.reduce((total, point) => total + point.severity_score, 0) / zonePoints.length
      : 0;
    return { ...zone, count: zonePoints.length, score };
  }).sort((a, b) => b.score * b.count - a.score * a.count);
}
