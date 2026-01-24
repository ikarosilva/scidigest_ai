
import React from 'react';
import { SyncStatus } from '../types';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onOpenFeedback: () => void;
  syncStatus: SyncStatus;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab, onOpenFeedback, syncStatus }) => {
  const groups = [
    {
      label: 'Discovery',
      items: [
        { id: 'feed', label: 'AI Recommends', icon: '✨' },
        { id: 'trending', label: 'Trending', icon: '🔥' },
      ]
    },
    {
      label: 'Workspace',
      items: [
        { id: 'shelves', label: 'Shelves', icon: '📥' },
        { id: 'reader', label: 'Reader', icon: '📖' },
        { id: 'library', label: 'Library', icon: '📚' },
        { id: 'notes', label: 'Notes', icon: '✍️' },
      ]
    },
    {
      label: 'Insights',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'networks', label: 'Networks', icon: '🕸️' },
      ]
    },
    {
      label: 'Configuration',
      items: [
        { id: 'topics', label: 'Topics', icon: '🎯' },
        { id: 'feeds', label: 'Feeds', icon: '📡' },
        { id: 'portability', label: 'Data & Privacy', icon: '💾' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
      ]
    }
  ];

  const statusColors: Record<SyncStatus, string> = {
    'disconnected': 'bg-slate-700',
    'synced': 'bg-emerald-500',
    'syncing': 'bg-indigo-500',
    'error': 'bg-red-500',
    'update-available': 'bg-amber-500'
  };

  const statusText: Record<SyncStatus, string> = {
    'disconnected': 'Cloud Off',
    'synced': 'Cloud Synced',
    'syncing': 'Syncing...',
    'error': 'Sync Error',
    'update-available': 'Update Found'
  };

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 overflow-y-auto z-50 shadow-2xl">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="relative inline-block">
            <span className="text-orange-400">🕯️</span>
            <span className="absolute -inset-1 bg-orange-500/20 blur-md rounded-full animate-pulse"></span>
          </span>
          SciDigest
        </h1>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.2em] font-black italic">Scholar's Focus</p>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">
              {group.label}
            </h3>
            {group.items.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                  currentTab === tab.id
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-4 mb-2">
        <button 
          onClick={onOpenFeedback}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-slate-500 hover:bg-slate-800 hover:text-orange-400 border border-transparent hover:border-orange-500/10"
        >
          <span className="text-lg">🐞</span>
          <span className="text-xs font-semibold">Submit Issues</span>
        </button>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Storage Status</span>
            <div className={`w-1.5 h-1.5 rounded-full ${statusColors[syncStatus]} ${syncStatus === 'syncing' ? 'sync-orbit' : ''}`}></div>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-lg">☁️</span>
             <div>
               <p className="text-[11px] font-bold text-slate-300">{statusText[syncStatus]}</p>
               <p className="text-[9px] text-slate-600">Encrypted Sync</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
