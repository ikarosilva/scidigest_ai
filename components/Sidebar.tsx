
import React from 'react';
import { SyncStatus } from '../types';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onOpenFeedback: () => void;
  syncStatus: SyncStatus;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab, onOpenFeedback, syncStatus }) => {
  const tabs = [
    { id: 'feed', label: 'AI Recommends', icon: '✨' },
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'networks', label: 'Research Networks', icon: '🕸️' },
    { id: 'reader', label: 'Reader', icon: '📖' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'notes', label: 'Research Notes', icon: '✍️' },
    { id: 'interests', label: 'Topics of Interest', icon: '🎯' },
    { id: 'library', label: 'Article Library', icon: '📚' },
    { id: 'portability', label: 'Data & Privacy', icon: '💾' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
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
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 overflow-y-auto z-50">
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

      <div className="px-4 mb-4">
        <button 
          onClick={onOpenFeedback}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800 hover:text-orange-400 border border-transparent hover:border-orange-500/20"
        >
          <span className="text-xl">🐞</span>
          Submit Issues
        </button>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Storage Status</span>
            <div className={`w-2 h-2 rounded-full ${statusColors[syncStatus]} ${syncStatus === 'syncing' ? 'sync-orbit' : ''}`}></div>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-xl">☁️</span>
             <div>
               <p className="text-xs font-bold text-slate-200">{statusText[syncStatus]}</p>
               <p className="text-[10px] text-slate-500">Local-First Encryption</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
