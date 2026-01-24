
import React, { useState } from 'react';

interface InterestsManagerProps {
  interests: string[];
  onUpdateInterests: (interests: string[]) => void;
}

const InterestsManager: React.FC<InterestsManagerProps> = ({ interests, onUpdateInterests }) => {
  const [newInterest, setNewInterest] = useState('');

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-100">Research Focus Areas</h2>
        <p className="text-slate-400 mt-2">
          Define your areas of expertise and interest. Gemini uses these topics to filter book imports and rank incoming research papers.
        </p>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="flex flex-wrap gap-3 mb-10">
          {interests.map((interest) => (
            <div 
              key={interest} 
              className="flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-4 py-2 rounded-full font-medium group transition-all hover:bg-indigo-500/20"
            >
              <span>{interest}</span>
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
            <p className="text-slate-500 italic py-4">No topics defined yet. Add some below to get started.</p>
          )}
        </div>

        <div className="max-w-md">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Add New Topic</h3>
          <form onSubmit={handleAddInterest} className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g., Reinforcement Learning"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Add Topic
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h4 className="text-sm font-bold text-indigo-400 uppercase mb-2">Book Filtering</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            When you upload a GoodReads export, the AI librarian checks each book against this list. Only relevant non-fiction works will be ingested.
          </p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h4 className="text-sm font-bold text-indigo-400 uppercase mb-2">Feed Ranking</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            The "Rank with AI" tool in your feed uses these topics to prioritize papers that match your current research trajectory.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InterestsManager;
