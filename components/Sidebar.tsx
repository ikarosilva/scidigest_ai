
import React from 'react';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab }) => {
  const tabs = [
    { id: 'feed', label: 'Feed Monitor', icon: '⚡' },
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'interests', label: 'Topics of Interest', icon: '🎯' },
    { id: 'library', label: 'Article Library', icon: '📚' },
    { id: 'import', label: 'Import Books', icon: '📥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-indigo-400 flex items-center gap-2">
          <span>🔬</span> SciDigest AI
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Research Assistant</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentTab === tab.id
                ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950 rounded-lg p-3">
          <p className="text-xs text-slate-500">Powered by</p>
          <p className="text-sm font-semibold text-slate-300">Gemini 3 Pro</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
