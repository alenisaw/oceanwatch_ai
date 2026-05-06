import { useState, useEffect, useCallback } from 'react';
import { healthCheck } from './api/oceanwatch.js';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import GlobalMap from './tabs/GlobalMap.jsx';
import SingleTile from './tabs/SingleTile.jsx';
import BatchAnalysis from './tabs/BatchAnalysis.jsx';
import Incidents from './tabs/Incidents.jsx';
import AmdBenchmark from './tabs/AmdBenchmark.jsx';
import Settings from './tabs/Settings.jsx';

const STORAGE_KEY = 'oceanwatch_incidents';
const SETTINGS_KEY = 'oceanwatch_settings';

const DEFAULT_SETTINGS = {
  apiUrl: 'http://localhost:8000',
  confidenceThreshold: 0.5,
  minComponentPixels: 8,
};

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('global');
  const [apiStatus, setApiStatus] = useState('unknown');
  const [incidents, setIncidents] = useState(() => loadStorage(STORAGE_KEY, []));
  const [settings, setSettings]   = useState(() => loadStorage(SETTINGS_KEY, DEFAULT_SETTINGS));

  /* Persist incidents */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
  }, [incidents]);

  /* Persist settings */
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  /* Health check on mount and when API URL changes */
  useEffect(() => {
    setApiStatus('unknown');
    healthCheck()
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('error'));
  }, [settings.apiUrl]);

  const addIncident = useCallback((report) => {
    setIncidents((prev) => {
      const exists = prev.some((r) => r.incident_id === report.incident_id);
      if (exists) return prev;
      return [report, ...prev].slice(0, 200);
    });
  }, []);

  const clearIncidents = useCallback(() => setIncidents([]), []);

  const saveSettings = useCallback((s) => setSettings(s), []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ocean-950">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        incidentCount={incidents.length}
      />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          activeTab={activeTab}
          apiStatus={apiStatus}
          apiUrl={settings.apiUrl}
        />

        {/* Tab content */}
        <main className="flex-1 min-h-0 overflow-hidden p-4">
          {activeTab === 'global' && (
            <GlobalMap />
          )}
          {activeTab === 'single' && (
            <SingleTile onNewIncident={addIncident} />
          )}
          {activeTab === 'batch' && (
            <BatchAnalysis />
          )}
          {activeTab === 'incidents' && (
            <Incidents incidents={incidents} onClear={clearIncidents} />
          )}
          {activeTab === 'benchmark' && (
            <AmdBenchmark />
          )}
          {activeTab === 'settings' && (
            <Settings settings={settings} onSave={saveSettings} />
          )}
        </main>
      </div>
    </div>
  );
}
