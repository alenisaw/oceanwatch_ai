import { AlertTriangle, Cpu, FileText, Grid2x2, Layers, Settings, Waves, Globe2 } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'global',    label: 'Global Map',      icon: Globe2      },
  { id: 'single',    label: 'Single Tile',     icon: Layers      },
  { id: 'batch',     label: 'Batch Analysis',  icon: Grid2x2     },
  { id: 'incidents', label: 'Incidents',        icon: AlertTriangle },
  { id: 'benchmark', label: 'Runtime',         icon: Cpu         },
  { id: 'reports',   label: 'Reports',         icon: FileText    },
];

/**
 * @param {{ activeTab: string, setActiveTab: fn, incidentCount: number }} props
 */
export default function Sidebar({ activeTab, setActiveTab, incidentCount }) {
  return (
    <aside
      className="z-20 flex h-auto w-full flex-shrink-0 flex-col border-b border-slate-800/90 bg-slate-950/88 backdrop-blur-xl lg:h-full lg:w-[236px] lg:border-b-0 lg:border-r"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-3 lg:py-5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.16)] lg:h-9 lg:w-9">
          <Waves size={14} className="text-cyan-bright" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-slate-100 sm:text-base lg:text-sm">OceanWatch AI</p>
          <p className="leading-tight text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs lg:text-[10px]">Environmental intelligence</p>
        </div>
      </div>

      <nav className="scrollable flex flex-1 gap-1 overflow-x-auto px-2 py-2 lg:block lg:space-y-1 lg:overflow-y-auto lg:py-4" aria-label="Tabs">
        <p className="section-label hidden px-2 pb-2 pt-1 lg:block">Analysis</p>
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

      <div className="hidden border-t border-slate-800/80 px-2 pb-3 pt-2 lg:block">
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
