
import React, { useState, useMemo } from 'react';
import { AIConfig, RecommendationBias, SocialProfiles, GeminiUsageEvent } from '../types';
import { dbService } from '../services/dbService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  const usageStats = useMemo(() => dbService.getUsageStats(), [aiConfig]);
  const data = dbService.getData();
  const usageHistory = data.usageHistory || [];
  
  const tokenLimit = aiConfig.monthlyTokenLimit || 1000000;
  // Added explicit number casting to fix arithmetic operation type error on line 37 (approximate due to file headers)
  const tokenUsagePercent = Math.min(100, ((usageStats.totalTokens as number) / (tokenLimit as number)) * 100);

  const chartData = useMemo(() => {
    return Object.entries(usageStats.byFeature)
      .map(([name, tokens]) => ({ name, tokens }))
      // Added explicit number casting to ensure arithmetic safety during sorting
      .sort((a, b) => (b.tokens as number) - (a.tokens as number))
      .slice(0, 8);
  }, [usageStats]);

  const COLORS = ['#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#fb923c', '#34d399', '#22d3ee', '#818cf8'];

  const handleUpdateBias = (bias: RecommendationBias) => {
    onUpdateAIConfig({ ...aiConfig, recommendationBias: bias });
  };

  const handleReset = () => {
    if (resetConfirmText === 'FACTORY RESET') {
      dbService.factoryReset();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <span>⚙️</span> System Settings
        </h2>
        <p className="text-slate-400 mt-1">Configure your research assistant's intelligence and telemetry.</p>
      </header>

      {/* 1. Gemini Telemetry Dashboard */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <span className="text-8xl">📊</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400">⚡</span> Gemini Telemetry
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest">Real-time API Ingestion & Cost Attribution</p>
          </div>
          <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 flex items-center gap-4">
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Avg Latency</span>
                <span className="text-sm font-bold text-emerald-400">{Math.round(usageStats.avgLatency)}ms</span>
             </div>
             <div className="w-px h-6 bg-slate-800"></div>
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Requests</span>
                <span className="text-sm font-bold text-indigo-400">{usageHistory.length}</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Monthly Token Budget</label>
                <span className="text-xs font-bold text-slate-300">
                  {usageStats.totalTokens.toLocaleString()} / {tokenLimit.toLocaleString()} <span className="text-[9px] text-slate-500 font-normal">tokens</span>
                </span>
              </div>
              <div className="h-4 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                    tokenUsagePercent > 90 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                    tokenUsagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  }`}
                  style={{ width: `${tokenUsagePercent}%` }}
                >
                  {tokenUsagePercent > 15 && (
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                       <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-600 italic">Self-imposed ceiling to manage API tier limits and prevent runaway usage.</p>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Usage Breakdown by Feature</h4>
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData} layout="vertical" margin={{ left: -20 }}>
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                     <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                     />
                     <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
                       {chartData.map((_, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[400px]">
             <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Granular Usage Logs</span>
                <span className="text-[9px] text-indigo-400 font-bold">Recent 200 Sessions</span>
             </div>
             <div className="flex-1 overflow-y-auto p-0">
                <table className="w-full text-left text-[10px]">
                   <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 z-10">
                      <tr className="text-slate-600">
                         <th className="px-4 py-3 font-black uppercase tracking-tighter">Feature</th>
                         <th className="px-4 py-3 font-black uppercase tracking-tighter">Tokens</th>
                         <th className="px-4 py-3 font-black uppercase tracking-tighter text-right">Lat</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-900/50">
                      {usageHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-900/40 transition-colors group">
                           <td className="px-4 py-3">
                              <p className="font-bold text-slate-300 truncate max-w-[120px]">{h.feature}</p>
                              <p className="text-[8px] text-slate-600">{new Date(h.timestamp).toLocaleTimeString()}</p>
                           </td>
                           <td className="px-4 py-3 font-mono">
                              <span className="text-slate-400">{h.totalTokens}</span>
                           </td>
                           <td className="px-4 py-3 text-right font-mono text-slate-500">
                              {h.latencyMs}ms
                           </td>
                        </tr>
                      ))}
                      {usageHistory.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-10 text-center text-slate-600 italic">No telemetry data recorded yet.</td>
                        </tr>
                      )}
                   </tbody>
                </table>
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

      {/* 3. Global Configuration URLS */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6">Project Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Feedback Repository URL</label>
              <input 
                type="url"
                value={aiConfig.feedbackUrl}
                onChange={(e) => onUpdateAIConfig({ ...aiConfig, feedbackUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="https://github.com/..."
              />
           </div>
           <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start gap-4">
              <span className="text-xl">🛠️</span>
              <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                Updating the Feedback URL allows you to route bug reports and feature requests directly to your own research group's GitHub issues page.
              </p>
           </div>
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
