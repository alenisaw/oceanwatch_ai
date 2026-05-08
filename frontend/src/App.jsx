import { useState, useEffect, useCallback } from 'react';
import { healthCheck } from './api/oceanwatch.js';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import GlobalMap from './tabs/GlobalMap.jsx';
import SingleTile from './tabs/SingleTile.jsx';
import BatchAnalysis from './tabs/BatchAnalysis.jsx';
import Incidents from './tabs/Incidents.jsx';
import AmdBenchmark from './tabs/AmdBenchmark.jsx';
import Reports from './tabs/Reports.jsx';
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
  const [activeTab, setActiveTab] = useState(() => window.location.hash.replace('#/', '') || 'global');
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
    healthCheck(settings.apiUrl)
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

  const navigate = useCallback((tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#/${tab}`);
  }, []);

  useEffect(() => {
    const onHashChange = () => setActiveTab(window.location.hash.replace('#/', '') || 'global');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="app-chrome flex h-dvh w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigate}
        incidentCount={incidents.length}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          apiStatus={apiStatus}
          apiUrl={settings.apiUrl}
        />

        <main className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3 lg:p-4">
          {activeTab === 'global' && (
            <GlobalMap apiUrl={settings.apiUrl} onGenerateReport={() => navigate('reports')} />
          )}
          {activeTab === 'single' && (
            <SingleTile apiUrl={settings.apiUrl} onNewIncident={addIncident} />
          )}
          {activeTab === 'batch' && (
            <BatchAnalysis apiUrl={settings.apiUrl} />
          )}
          {activeTab === 'incidents' && (
            <Incidents incidents={incidents} onClear={clearIncidents} />
          )}
          {activeTab === 'benchmark' && (
            <AmdBenchmark apiUrl={settings.apiUrl} />
          )}
          {activeTab === 'reports' && (
            <Reports apiUrl={settings.apiUrl} />
          )}
          {activeTab === 'settings' && (
            <Settings settings={settings} onSave={saveSettings} />
          )}
        </main>
      </div>
    </div>
  );
}
