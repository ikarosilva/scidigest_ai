import React, { useState, useMemo } from 'react';
import { AIConfig, RecommendationBias, SocialProfiles } from '../types';
import { dbService } from '../services/dbService';

interface SettingsSectionProps {
  aiConfig: AIConfig;
  onUpdateAIConfig: (config: AIConfig) => void;
  interests: string[];
  onUpdateInterests: (ni: string[]) => void;
  socialProfiles: SocialProfiles;
  onUpdateSocialProfiles: (profiles: SocialProfiles) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ 
  aiConfig, 
  onUpdateAIConfig, 
  interests, 
  onUpdateInterests,
  socialProfiles,
  onUpdateSocialProfiles
}) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const handleBiasChange = (bias: RecommendationBias) => {
    onUpdateAIConfig({ ...aiConfig, recommendationBias: bias });
  };

  const handleReviewerPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateAIConfig({ ...aiConfig, reviewer2Prompt: e.target.value });
  };

  const handleFeedbackUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateAIConfig({ ...aiConfig, feedbackUrl: e.target.value });
  };

  const deletionManifest = useMemo(() => {
    const data = dbService.getData();
    const feeds = dbService.getFeeds();
    return [
      { label: 'Research Articles', count: data.articles.length, icon: '📄' },
      { label: 'Reference Books', count: data.books.length, icon: '📚' },
      { label: 'Technical Notes', count: data.notes.length, icon: '✍️' },
      { label: 'Research Trajectories', count: interests.length, icon: '🎯' },
      { label: 'Monitored Feeds', count: feeds.length, icon: '📡' },
      { label: 'Library Shelves', count: data.shelves.length, icon: '📂' },
    ];
  }, [interests, showResetModal]);

  const handleFinalReset = () => {
    if (resetConfirmText.toUpperCase() === 'DELETE ALL DATA') {
      dbService.factoryReset();
    }
  };

  const handleEmergencyExport = () => {
    const backup = dbService.exportFullBackup();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emergency_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <span>⚙️</span> Settings
        </h2>
        <p className="text-slate-400 mt-1">
          Configure your research workflow preferences and AI discovery bias.
        </p>
      </header>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-red-500 uppercase tracking-tight">Factory Reset Manifest</h3>
                <p className="text-slate-500 text-xs mt-1">Review the data identified for permanent local deletion.</p>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                {deletionManifest.map((item) => (
                  <div key={item.label} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="text-lg font-black text-slate-200">{item.count}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl space-y-3">
                <p className="text-xs text-red-400 font-bold leading-relaxed">
                  ⚠️ This action will purge all local data from this browser profile. Cloud synchronization will remain in Google Drive, but this local client will be returned to zero state.
                </p>
                <button 
                  onClick={handleEmergencyExport}
                  className="text-[10px] font-black uppercase text-indigo-400 hover:text-white flex items-center gap-2"
                >
                  📥 Export safety backup before deleting?
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block text-center">Type "DELETE ALL DATA" to confirm</label>
                <input 
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  className="w-full bg-slate-950 border border-red-500/20 rounded-2xl px-6 py-4 text-center text-sm font-black text-red-500 tracking-widest outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="CONFIRMATION PHRASE"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalReset}
                  disabled={resetConfirmText.toUpperCase() !== 'DELETE ALL DATA'}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:grayscale text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-red-600/20 transition-all"
                >
                  Execute Purge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project & Support Configuration */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
        <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
          <span>🏗️</span> Project Metadata
        </h3>
        <p className="text-sm text-slate-400 mb-8">
          Configure where the "Submit Issues" feature sends your bug reports and feature requests.
        </p>

        <div className="space-y-4">
           <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">GitHub Repository / Issue URL</label>
           <input 
             type="url"
             value={aiConfig.feedbackUrl}
             onChange={handleFeedbackUrlChange}
             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
             placeholder="https://github.com/your-username/your-repo/issues/new"
           />
           <p className="text-[10px] text-slate-500 italic">
             Providing a valid GitHub URL allows the Feedback tool to pre-fill issues with system information.
           </p>
        </div>
      </section>

      {/* AI Recommendation Engine Config */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
        <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
          <span>🪄</span> AI Recommendation Engine
        </h3>
        <p className="text-sm text-slate-400 mb-8">
          Adjust the "Discovery Bias" of the Gemini-powered recommendation system.
        </p>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-4 block">Discovery Mode (Bias)</label>
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button 
                onClick={() => handleBiasChange('conservative')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  aiConfig.recommendationBias === 'conservative' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>🛡️ Conservative</span>
                <span className="text-[9px] font-medium opacity-60">High Confidence Only</span>
              </button>
              <button 
                onClick={() => handleBiasChange('balanced')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  aiConfig.recommendationBias === 'balanced' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>⚖️ Balanced</span>
                <span className="text-[9px] font-medium opacity-60">Similarity + Insight</span>
              </button>
              <button 
                onClick={() => handleBiasChange('experimental')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  aiConfig.recommendationBias === 'experimental' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>🚀 Exploratory</span>
                <span className="text-[9px] font-medium opacity-60">Novel & Experimental</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed italic">
              {aiConfig.recommendationBias === 'conservative' && "Gemini will only suggest papers that closely match your historical high ratings."}
              {aiConfig.recommendationBias === 'balanced' && "Gemini will suggest papers similar to your interests while introducing occasionally novel breakthroughs."}
              {aiConfig.recommendationBias === 'experimental' && "Gemini will actively seek out high-uncertainty, high-novelty articles that could expand your research horizons."}
            </p>
          </div>
        </div>
      </section>

      {/* Reviewer 2 Persona Config */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
        <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
          <span>👿</span> Reviewer 2 Persona
        </h3>
        <p className="text-sm text-slate-400 mb-8">
          Configure the critical bias and persona for the "Reviewer 2" tool in the Reader.
        </p>

        <div className="space-y-4">
           <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">Custom Rejection Prompt</label>
           <textarea 
             value={aiConfig.reviewer2Prompt}
             onChange={handleReviewerPromptChange}
             className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono leading-relaxed"
             placeholder="Define Reviewer 2's harshness level..."
           />
           <p className="text-[10px] text-slate-500 italic">
             This prompt is sent alongside the article title and abstract when you "Summon Reviewer 2" in the Reader panel.
           </p>
        </div>
      </section>

      {/* System Maintenance */}
      <section className="bg-red-500/5 border border-red-500/20 rounded-[2rem] p-8 shadow-xl">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
            <span>⚠️</span> System Maintenance
          </h3>
          <p className="text-sm text-slate-500 mt-1">Dangerous zone. Actions here are irreversible.</p>
        </div>
        
        <div className="bg-slate-900/50 border border-red-500/10 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200">Factory Reset Application</p>
              <p className="text-xs text-slate-500">Permanently delete all research data, library entries, notes, and trajectories. Recommended for clean testing or starting fresh.</p>
           </div>
           <button 
             onClick={() => setShowResetModal(true)}
             className="w-full md:w-auto bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-red-600/20"
           >
             Factory Reset
           </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsSection;
