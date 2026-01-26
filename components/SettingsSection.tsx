
import React, { useState, useRef } from 'react';
import { AIConfig, RecommendationBias, SocialProfiles, SyncStatus } from '../types';
import { dbService } from '../services/dbService';
import { exportService } from '../services/exportService';
import { cloudSyncService } from '../services/cloudSyncService';

interface SettingsSectionProps {
  aiConfig: AIConfig;
  onUpdateAIConfig: (config: AIConfig) => void;
  interests: string[];
  onUpdateInterests: (ni: string[]) => void;
  socialProfiles: SocialProfiles;
  onUpdateSocialProfiles: (profiles: SocialProfiles) => void;
  syncStatus: SyncStatus;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ 
  aiConfig, 
  onUpdateAIConfig, 
  interests, 
  onUpdateInterests,
  socialProfiles,
  onUpdateSocialProfiles,
  syncStatus
}) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  // Fix: Move useRef declaration to the top of the component and avoid re-assignment
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusColors: Record<SyncStatus, string> = {
    'disconnected': 'bg-slate-700',
    'synced': 'bg-emerald-500',
    'syncing': 'bg-indigo-500',
    'error': 'bg-red-500',
    'update-available': 'bg-amber-500'
  };

  const statusText: Record<SyncStatus, string> = {
    'disconnected': 'Cloud Off',
    'synced': 'Sync Active',
    'syncing': 'Syncing...',
    'error': 'Sync Error',
    'update-available': 'Update Found'
  };

  const handleUpdateBias = (bias: RecommendationBias) => {
    onUpdateAIConfig({ ...aiConfig, recommendationBias: bias });
  };

  const handleReset = () => {
    if (resetConfirmText === 'FACTORY RESET') {
      dbService.factoryReset();
    }
  };

  const handleExportJSON = () => {
    const backup = dbService.exportFullBackup();
    exportService.downloadFile(backup, `scidigest_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleExportBibTeX = () => {
    const articles = dbService.getData().articles;
    if (articles.length === 0) {
      alert("Library is empty. Nothing to export.");
      return;
    }
    const bibtex = exportService.generateBibTeX(articles);
    exportService.downloadFile(bibtex, `scidigest_library_${new Date().toISOString().split('T')[0]}.bib`, 'text/plain');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = dbService.importFullBackup(content);
      if (result.success) {
        alert("Import successful. Application will reload to reflect changes.");
        window.location.reload();
      } else {
        alert("Import failed. Invalid backup file structure.");
      }
    };
    reader.readAsText(file);
  };

  const handleSyncSignIn = () => {
    cloudSyncService.signIn((success) => {
      if (success) {
        alert("Cloud Sync Activated. Your data is now end-to-end encrypted and backed up to Google Drive.");
        window.location.reload();
      }
    });
  };

  const handleSyncSignOut = () => {
    cloudSyncService.signOut();
    window.location.reload();
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <span>⚙️</span> System Settings
        </h2>
        <p className="text-slate-400 mt-1">Configure your research assistant's intelligence, cloud synchronization, and privacy.</p>
      </header>

      {/* 1. Cloud Sync & Sovereignty */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
             <h3 className="text-lg font-bold text-white mb-2">Cloud Synchronization</h3>
             <p className="text-xs text-slate-500 max-w-md">Backup your research trajectory to your own Google Drive using client-side AES-256 encryption. Only your Sync Key can decrypt this data.</p>
           </div>
           <div className="flex gap-3">
              {syncStatus === 'disconnected' ? (
                <button 
                  onClick={handleSyncSignIn}
                  className="bg-white text-slate-900 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all hover:bg-slate-200"
                >
                  Enable Cloud Sync
                </button>
              ) : (
                <button 
                  onClick={handleSyncSignOut}
                  className="bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all hover:text-white"
                >
                  Disable Sync
                </button>
              )}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Private Sync Key</label>
              <div className="flex gap-2">
                 <input 
                   type="password"
                   readOnly
                   value={dbService.getSyncKey()}
                   className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-indigo-400 font-mono"
                 />
                 <button 
                   onClick={() => {
                     navigator.clipboard.writeText(dbService.getSyncKey());
                     alert("Sync Key copied. Store this safely!");
                   }}
                   className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 hover:text-white transition-all"
                   title="Copy Key"
                 >
                   📋
                 </button>
              </div>
              <p className="text-[10px] text-slate-600 italic">This key is required to decrypt your data on other devices. It never leaves your browser.</p>
           </div>

           <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                 <div className={`w-3 h-3 rounded-full ${statusColors[syncStatus]} ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`}></div>
                 <div>
                    <p className="text-xs font-bold text-slate-300">Storage Status: {statusText[syncStatus]}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">
                      {syncStatus === 'synced' ? 'Direct connection to appDataFolder' : 'No active cloud connection'}
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* 2. Intelligence Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-8">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Recommendation Profile</h3>
            <p className="text-xs text-slate-500 mb-6">Tune the discovery engine's response to your rating patterns.</p>
            
            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1">
               {(['conservative', 'balanced', 'experimental'] as RecommendationBias[]).map(bias => (
                 <button
                   key={bias}
                   onClick={() => handleUpdateBias(bias)}
                   className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                     aiConfig.recommendationBias === bias 
                       ? 'bg-indigo-600 text-white shadow-lg' 
                       : 'text-slate-500 hover:text-slate-300'
                   }`}
                 >
                   {bias}
                 </button>
               ))}
            </div>
            <div className="mt-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
               <p className="text-[10px] text-slate-400 leading-relaxed italic">
                 {aiConfig.recommendationBias === 'conservative' && "Narrow match: Prioritizes papers very similar to your highest rated topics."}
                 {aiConfig.recommendationBias === 'balanced' && "Standard mix: Combines proven interests with logical neighboring fields."}
                 {aiConfig.recommendationBias === 'experimental' && "Novelty peak: Focuses on breakthrough potential and low-correlation trajectories."}
               </p>
            </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Monthly Token Ceiling</label>
             <div className="flex gap-4 items-center">
                <input 
                  type="range"
                  min="100000"
                  max="10000000"
                  step="100000"
                  value={aiConfig.monthlyTokenLimit}
                  onChange={(e) => onUpdateAIConfig({ ...aiConfig, monthlyTokenLimit: parseInt(e.target.value) })}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-xs font-mono font-bold text-indigo-400 w-24 text-right">
                   {(aiConfig.monthlyTokenLimit / 1000000).toFixed(1)}M
                </span>
             </div>
             <p className="text-[10px] text-slate-600 italic">Control the maximum token expenditure allowed per month.</p>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
               <div>
                  <h4 className="text-sm font-bold text-white">System Debug Mode</h4>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest">High-Fidelity Telemetry</p>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                   type="checkbox" 
                   className="sr-only peer" 
                   checked={aiConfig.debugMode}
                   onChange={(e) => onUpdateAIConfig({ ...aiConfig, debugMode: e.target.checked })}
                 />
                 <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
               </label>
            </div>
            <p className="text-[10px] text-slate-600 italic mt-3 leading-relaxed">
              Enabling debug mode captures verbose API responses and internal service state in the System Logs. This may increase storage overhead and should only be active for troubleshooting.
            </p>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-2">Reviewer 2 Personality</h3>
          <p className="text-xs text-slate-500 mb-6">Customize the prompt for adversarial methodology audits.</p>
          
          <textarea 
            value={aiConfig.reviewer2Prompt}
            onChange={(e) => onUpdateAIConfig({ ...aiConfig, reviewer2Prompt: e.target.value })}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-serif leading-relaxed"
            placeholder="Review this paper as a journal Reviewer 2..."
          />
          <button 
             onClick={() => onUpdateAIConfig({ ...aiConfig, reviewer2Prompt: 'Review this paper as a journal Reviewer 2. Provide criticism on methods, weak or hidden assumptions, logical/mathematical/reasoning mistakes.' })}
             className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-4 hover:underline self-end"
          >
             Reset to Factory Persona
          </button>
        </section>
      </div>

      {/* 3. Data Portability & Export */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6">Scientific Data Portability</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <button 
             onClick={handleExportJSON}
             className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all text-left group"
           >
              <span className="text-2xl mb-3 block">💾</span>
              <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400">Full JSON Backup</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Export everything: library, notes, settings, and research trajectories.</p>
           </button>

           <button 
             onClick={() => fileInputRef.current?.click()}
             className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-all text-left group"
           >
              <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
              <span className="text-2xl mb-3 block">📥</span>
              <h4 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400">Restore Library</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Import a previously exported SciDigest JSON backup file.</p>
           </button>

           <button 
             onClick={handleExportBibTeX}
             className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/50 transition-all text-left group"
           >
              <span className="text-2xl mb-3 block">📚</span>
              <h4 className="text-sm font-bold text-slate-200 group-hover:text-amber-400">BibTeX (.bib)</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Export your library in standard academic format for Zotero or LaTeX.</p>
           </button>
        </div>
      </section>

      {/* 4. Dangerous Area */}
      <section className="bg-red-950/20 border border-red-500/20 rounded-[2.5rem] p-8 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-lg font-bold text-red-400">Data Sovereignty Control</h3>
            <p className="text-xs text-red-500/60 mt-1 uppercase font-black tracking-widest">Irreversible System Purge</p>
          </div>
          <button 
            onClick={() => setShowResetModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3 rounded-xl transition-all shadow-lg shadow-red-600/20"
          >
            Trigger Factory Reset
          </button>
        </div>
      </section>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/20 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-3">
               <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-4xl mx-auto border border-red-500/20">☣️</div>
               <h3 className="text-2xl font-bold text-white">Full System Deletion</h3>
               <p className="text-slate-400 text-sm">This will permanently purge your library, research notes, trajectories, and telemetry. This action is irreversible.</p>
            </div>
            
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center block">Type "FACTORY RESET" to confirm</label>
               <input 
                 autoFocus
                 type="text"
                 value={resetConfirmText}
                 onChange={(e) => setResetConfirmText(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-center text-red-500 font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-red-500"
               />
            </div>

            <div className="flex gap-4">
               <button 
                 onClick={() => setShowResetModal(false)}
                 className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl transition-all"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleReset}
                 disabled={resetConfirmText !== 'FACTORY RESET'}
                 className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-xl shadow-red-600/20"
               >
                 Purge System
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsSection;
