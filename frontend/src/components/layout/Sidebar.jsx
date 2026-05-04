import { Layers, Grid2x2, AlertTriangle, Cpu, Settings, Waves } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'single',    label: 'Single Tile',     icon: Layers      },
  { id: 'batch',     label: 'Batch Analysis',  icon: Grid2x2     },
  { id: 'incidents', label: 'Incidents',        icon: AlertTriangle },
  { id: 'benchmark', label: 'AMD Benchmark',   icon: Cpu         },
];

/**
 * @param {{ activeTab: string, setActiveTab: fn, incidentCount: number }} props
 */
export default function Sidebar({ activeTab, setActiveTab, incidentCount }) {
  return (
    <aside
      className="flex flex-col h-full w-[220px] flex-shrink-0 bg-ocean-900 border-r border-ocean-700"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-ocean-700">
        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-ocean-750 border border-cyan-dark flex items-center justify-center">
          <Waves size={14} className="text-cyan-bright" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate leading-tight">OceanWatch AI</p>
          <p className="text-[10px] text-slate-500 leading-tight">SAR Pollution Triage</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollable" aria-label="Tabs">
        <p className="section-label px-2 pb-2 pt-1">Analysis</p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`tab-nav-item ${activeTab === id ? 'active' : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={15} className="flex-shrink-0" aria-hidden="true" />
            <span className="truncate flex-1 text-left">{label}</span>
            {id === 'incidents' && incidentCount > 0 && (
              <span className="text-[10px] font-semibold bg-ocean-700 text-slate-400 rounded px-1.5 py-0.5 flex-shrink-0">
                {incidentCount > 99 ? '99+' : incidentCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="px-2 pb-3 border-t border-ocean-700 pt-2">
        <button
          onClick={() => setActiveTab('settings')}
          className={`tab-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
        >
          <Settings size={15} className="flex-shrink-0" aria-hidden="true" />
          <span className="truncate flex-1 text-left">Settings</span>
        </button>
      </div>
    </aside>
  );
}
