
import React, { useState } from 'react';
import { SocialProfiles } from '../types';
import { geminiService } from '../services/geminiService';

interface InterestsManagerProps {
  interests: string[];
  onUpdateInterests: (interests: string[]) => void;
  socialProfiles: SocialProfiles;
  onUpdateSocialProfiles: (profiles: SocialProfiles) => void;
}

const InterestsManager: React.FC<InterestsManagerProps> = ({ 
  interests, 
  onUpdateInterests, 
  socialProfiles, 
  onUpdateSocialProfiles 
}) => {
  const [newInterest, setNewInterest] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newInterest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      onUpdateInterests([...interests, trimmed]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    onUpdateInterests(interests.filter(i => i !== interest));
  };

  const handleDiscoverInterests = async () => {
    if (!socialProfiles.medium && !socialProfiles.linkedin && !socialProfiles.googleScholar && !socialProfiles.usePublicWebSearch) {
      alert("Please provide at least one profile URL or enable 'User Public Web Search' to discover interests.");
      return;
    }

    if (socialProfiles.usePublicWebSearch && !socialProfiles.name) {
      alert("Please provide your full name for the Public Web Search.");
      return;
    }

    setIsDiscovering(true);
    try {
      const suggestedInterests = await geminiService.discoverInterestsFromProfiles(socialProfiles);
      
      // Filter out interests already in the list and limit to top 10 new ones
      const existingInterestsLower = interests.map(i => i.toLowerCase());
      const newTopics = suggestedInterests
        .filter(t => !existingInterestsLower.includes(t.toLowerCase()))
        .slice(0, 10);

      if (newTopics.length > 0) {
        const merged = [...interests, ...newTopics];
        onUpdateInterests(merged);
        alert(`Discovered ${newTopics.length} new topics! (Capped at top 10 unique results)`);
      } else {
        alert("Gemini couldn't find any NEW specific research topics. It might be finding topics you already have listed.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to analyze profiles. Check your internet connection or try again later.");
    }
    setIsDiscovering(false);
  };

  const updateProfileField = (field: keyof SocialProfiles, value: any) => {
    onUpdateSocialProfiles({ ...socialProfiles, [field]: value });
  };

  return (
    <div className="space-y-10">
      {/* Current Interests Display */}
      <div>
        <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-[0.2em]">Active Research Trajectories</h4>
        <div className="flex flex-wrap gap-3">
          {interests.map((interest) => (
            <div 
              key={interest} 
              className="flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-4 py-2 rounded-full font-medium group transition-all hover:bg-indigo-500/20"
            >
              <span className="text-sm">{interest}</span>
              <button 
                onClick={() => handleRemoveInterest(interest)}
                className="text-indigo-500/40 hover:text-red-400 transition-colors"
                title="Remove topic"
              >
                ✕
              </button>
            </div>
          ))}
          {interests.length === 0 && (
            <p className="text-slate-500 italic py-2 text-sm">No topics defined yet. Add some below or discover them from your profiles.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Manual Addition */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Manual Entry</h4>
          <form onSubmit={handleAddInterest} className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g., Signal Processing"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Add
            </button>
          </form>
          <p className="text-[11px] text-slate-500 leading-relaxed italic">
            Adding topics manually gives the most direct control over your feed discovery.
          </p>
        </div>

        {/* Social Profile Discovery */}
        <div className="space-y-4 bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Social Presence Analysis</h4>
          <p className="text-[11px] text-slate-500 mb-4">SciDigest can crawl your public profiles to find recurring research themes.</p>
          
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">👤</span>
              <input 
                type="text" 
                placeholder="Full Researcher Name"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                value={socialProfiles.name || ''}
                onChange={(e) => updateProfileField('name', e.target.value)}
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">✍️</span>
              <input 
                type="url" 
                placeholder="Medium URL"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                value={socialProfiles.medium || ''}
                onChange={(e) => updateProfileField('medium', e.target.value)}
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">💼</span>
              <input 
                type="url" 
                placeholder="LinkedIn URL"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                value={socialProfiles.linkedin || ''}
                onChange={(e) => updateProfileField('linkedin', e.target.value)}
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🎓</span>
              <input 
                type="url" 
                placeholder="Google Scholar URL"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                value={socialProfiles.googleScholar || ''}
                onChange={(e) => updateProfileField('googleScholar', e.target.value)}
              />
            </div>

            <label className="flex items-center gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800 transition-all">
              <input 
                type="checkbox"
                checked={!!socialProfiles.usePublicWebSearch}
                onChange={(e) => updateProfileField('usePublicWebSearch', e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">User Public Web Search</span>
                <span className="text-[10px] text-slate-500">Enable broad web discovery (Scholar, ResearchGate)</span>
              </div>
            </label>
          </div>

          <button 
            onClick={handleDiscoverInterests}
            disabled={isDiscovering}
            className={`w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              isDiscovering 
              ? 'bg-slate-800 text-slate-500 cursor-wait' 
              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20'
            }`}
          >
            {isDiscovering ? (
              <>
                <span className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
                Analyzing Profiles...
              </>
            ) : (
              <>🔎 Discover My Interests</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterestsManager;
