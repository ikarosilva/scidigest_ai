
import React from 'react';
import { SyncStatus } from '../types';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onOpenFeedback: () => void;
  syncStatus: SyncStatus;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setTab, 
  onOpenFeedback, 
  syncStatus, 
  isCollapsed, 
  setIsCollapsed 
}) => {
  const groups = [
    {
      label: 'Discovery',
      items: [
        { id: 'feed', label: 'AI Recommends', icon: '✨' },
        { id: 'tracker', label: 'Tracker', icon: '🕵️' },
        { id: 'trending', label: 'Trending', icon: '🔥' },
      ]
    },
    {
      label: 'Workspace',
      items: [
        { id: 'reader', label: 'Reader', icon: '📖' },
        { id: 'library', label: 'Library', icon: '📚' },
        { id: 'notes', label: 'Notes', icon: '✍️' },
      ]
    },
    {
      label: 'Insights',
      items: [
        { id: 'academy', label: 'Academy', icon: '🎓' },
        { id: 'networks', label: 'Networks', icon: '🕸️' },
        { id: 'telemetry', label: 'AI Usage', icon: '🤖' },
      ]
    },
    {
      label: 'Configuration',
      items: [
        { id: 'sources', label: 'Sources & Topics', icon: '📡' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
      ]
    },
    {
      label: 'Help',
      items: [
        { id: 'version', label: 'App Version', icon: '🏷️' },
        { id: 'logs', label: 'System Logs', icon: '📝' },
        { id: 'feedback', label: 'Submit Issues', icon: '🐞' },
      ]
    }
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === 'feedback') {
      onOpenFeedback();
    } else {
      setTab(tabId);
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/50 flex flex-col fixed left-0 top-0 overflow-y-auto z-50 shadow-2xl transition-all duration-300 group/sidebar`}>
      
      {/* Collapse Toggle Button - Positioned further left (inset) with hover info */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute right-1 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-50 shadow-lg`}
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      <div className={`p-6 pb-2 ${isCollapsed ? 'items-center px-0' : ''} flex flex-col`}>
        <h1 className={`text-2xl font-bold text-white flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <span className="relative inline-block">
            <span className="text-orange-400">🕯️</span>
            <span className="absolute -inset-1 bg-orange-500/20 blur-md rounded-full animate-pulse"></span>
          </span>
          {!isCollapsed && <span>SciDigest</span>}
        </h1>
        {!isCollapsed && <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.2em] font-black italic">Scholar's Focus</p>}
      </div>
      
      <nav className={`flex-1 px-4 py-4 space-y-6 ${isCollapsed ? 'px-2' : ''}`}>
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">
                {group.label}
              </h3>
            )}
            {group.items.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={isCollapsed ? tab.label : ''}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2.5 rounded-xl transition-all ${
                  currentTab === tab.id
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {!isCollapsed && <span className="text-sm font-semibold">{tab.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className={`p-4 border-t border-slate-800/50 ${isCollapsed ? 'px-2' : ''}`}>
        <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest text-center">
          {!isCollapsed ? 'End-to-End Encrypted' : '🔒'}
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
