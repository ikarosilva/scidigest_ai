
import React from 'react';
import { AIConfig, RecommendationBias, SocialProfiles } from '../types';
import InterestsManager from './InterestsManager';

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

  const handleBiasChange = (bias: RecommendationBias) => {
    onUpdateAIConfig({ ...aiConfig, recommendationBias: bias });
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

      {/* Topics Summary Link */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl opacity-80">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>🎯</span> Research Topics
          </h3>
          <p className="text-sm text-slate-500 mt-1">Configure your active research trajectories in the standalone Topics tab.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {interests.slice(0, 5).map(t => (
             <span key={t} className="text-[10px] font-bold text-slate-500 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full uppercase">{t}</span>
           ))}
           {interests.length > 5 && <span className="text-[10px] text-slate-600 italic self-center">+{interests.length - 5} more</span>}
        </div>
      </section>
    </div>
  );
};

export default SettingsSection;
