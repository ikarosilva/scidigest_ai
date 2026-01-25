
import React, { useState } from 'react';
import { SocialProfiles } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';

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
  
  // Tracked Authors State
  const data = dbService.getData();
  const trackedAuthors = data.trackedAuthors || [];
  const [newAuthor, setNewAuthor] = useState('');

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

  const handleAddAuthor = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAuthor.trim();
    if (trimmed && !trackedAuthors.includes(trimmed)) {
      dbService.updateTrackedAuthors([...trackedAuthors, trimmed]);
      setNewAuthor('');
      window.dispatchEvent(new CustomEvent('db-update'));
    }
  };

  const handleRemoveAuthor = (author: string) => {
    dbService.updateTrackedAuthors(trackedAuthors.filter(a => a !== author));
    window.dispatchEvent(new CustomEvent('db-update'));
  };

  const handleDiscoverInterests = async () => {
    const hasAnyInput = socialProfiles.name || socialProfiles.medium || socialProfiles.linkedin || socialProfiles.googleScholar;
    
    if (!hasAnyInput && !socialProfiles.usePublicWebSearch) {
      alert("Please provide a Name, at least one profile URL, or enable 'User Public Web Search' to discover interests.");
      return;
    }

    setIsDiscovering(true);
    try {
      const suggestedInterests = await geminiService.discoverInterestsFromProfiles(socialProfiles);
      const existingLower = interests.map(i => i.toLowerCase());
      const filteredNew = suggestedInterests
        .filter(t => !existingLower.includes(t.toLowerCase()))
        .slice(0, 10);

      if (filteredNew.length > 0) {
        onUpdateInterests([...interests, ...filteredNew]);
        alert(`Discovered ${filteredNew.length} new research trajectories!`);
      } else {
        alert("Gemini couldn't find any NEW research topics not already in your list.");
      }
    } catch (err) {
      console.error(err);
    }
    setIsDiscovering(false);
  };

  const updateProfileField = (field: keyof SocialProfiles, value: any) => {
    onUpdateSocialProfiles({ ...socialProfiles, [field]: value });
  };

  return (
    <div className="space-y-10">
      {/* 1. Research Trajectories */}
      <div>
        <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-[0.2em]">Active Research Trajectories</h4>
        <div className="flex flex-wrap gap-3">
          {interests.map((interest) => (
            <div 
              key={interest} 
              className="flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-4 py-2 rounded-full font-medium group transition-all hover:bg-indigo-500/20"
            >
              <span className="text-sm">{interest}</span>
              <button onClick={() => handleRemoveInterest(interest)} className="text-indigo-500/40 hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Author Radar List */}
      <div className="bg-slate-950/30 border border-slate-800 p-6 rounded-[2rem]">
        <div className="flex justify-between items-start mb-6">
           <div>
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Author Radar</h4>
              <p className="text-xs text-slate-500 mt-1">New publications from these authors will trigger radar hits.</p>
           </div>
           <span className="text-2xl">📡</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {trackedAuthors.map(author => (
            <div key={author} className="flex items-center gap-2 bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl group">
               <span className="text-xs font-bold">{author}</span>
               {author === socialProfiles.name && (
                 <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1 rounded font-black uppercase">Self</span>
               )}
               <button onClick={() => handleRemoveAuthor(author)} className="text-slate-600 hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
          {trackedAuthors.length === 0 && <p className="text-[10px] text-slate-600 italic">No authors tracked. Set your name above to track yourself automatically.</p>}
        </div>

        <form onSubmit={handleAddAuthor} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Track author (e.g., Yoshua Bengio)"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
            />
            <button type="submit" className="bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Add</button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Manual Topic Entry</h4>
          <form onSubmit={handleAddInterest} className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g., Signal Processing"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase px-6 py-3 rounded-xl shadow-lg transition-all">Add</button>
          </form>
        </div>

        <div className="space-y-4 bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Social & Academic Profile</h4>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Full Researcher Name"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              value={socialProfiles.name || ''}
              onChange={(e) => updateProfileField('name', e.target.value)}
            />
            <input 
              type="url" 
              placeholder="Google Scholar URL"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              value={socialProfiles.googleScholar || ''}
              onChange={(e) => updateProfileField('googleScholar', e.target.value)}
            />
            <label className="flex items-center gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800">
              <input 
                type="checkbox"
                checked={!!socialProfiles.usePublicWebSearch}
                onChange={(e) => updateProfileField('usePublicWebSearch', e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500"
              />
              <span className="text-[10px] font-bold text-slate-200 uppercase">Use Public Web Search for Discovery</span>
            </label>
          </div>
          <button onClick={handleDiscoverInterests} disabled={isDiscovering} className={`w-full mt-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isDiscovering ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
            {isDiscovering ? 'Discovering...' : '🔎 Discover Trajectories'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterestsManager;
