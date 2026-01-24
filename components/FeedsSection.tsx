
import React, { useState } from 'react';
import { Feed } from '../types';

interface FeedsSectionProps {
  feeds: Feed[];
  onUpdateFeeds: (feeds: Feed[]) => void;
}

const FeedsSection: React.FC<FeedsSectionProps> = ({ feeds, onUpdateFeeds }) => {
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');

  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFeedName.trim() && newFeedUrl.trim()) {
      const newFeed: Feed = {
        id: Math.random().toString(36).substr(2, 9),
        name: newFeedName.trim(),
        url: newFeedUrl.trim(),
        active: true
      };
      onUpdateFeeds([...feeds, newFeed]);
      setNewFeedName('');
      setNewFeedUrl('');
    }
  };

  const toggleFeed = (id: string) => {
    onUpdateFeeds(feeds.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  const removeFeed = (id: string) => {
    onUpdateFeeds(feeds.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <span>📡</span> Feeds
        </h2>
        <p className="text-slate-400 mt-1">
          Configure the scientific sources monitored by the AI discovery engine.
        </p>
      </header>

      <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
        <div className="mb-8">
          <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <span>📚</span> Active Sources
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Papers in your "AI Recommends" tab are prioritized from these feeds.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          {feeds.map(feed => (
            <div key={feed.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className={`font-bold text-sm ${feed.active ? 'text-slate-200' : 'text-slate-600'}`}>
                    {feed.name}
                  </h4>
                  {!feed.active && (
                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">Disabled</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{feed.url}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleFeed(feed.id)}
                  className={`text-xs font-bold px-4 py-1.5 rounded-xl transition-all ${
                    feed.active 
                      ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {feed.active ? 'Disable' : 'Enable'}
                </button>
                <button 
                  onClick={() => removeFeed(feed.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors px-2"
                  title="Remove Feed"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {feeds.length === 0 && (
            <div className="text-center py-10 bg-slate-950 rounded-2xl border-2 border-dashed border-slate-800 text-slate-500 italic text-sm">
              No feed sources configured. Add one below to start discovery.
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-800">
          <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-4">Add Custom RSS/JSON Feed</h4>
          <form onSubmit={handleAddFeed} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Feed Name (e.g., DeepMind Blog)"
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              value={newFeedName}
              onChange={(e) => setNewFeedName(e.target.value)}
            />
            <input 
              type="url" 
              placeholder="Feed URL (RSS/Atom)"
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Add New Source
            </button>
          </form>
        </div>
      </section>

      <section className="bg-indigo-900/10 border border-indigo-500/20 rounded-[2rem] p-8">
        <h3 className="text-xl font-bold text-indigo-300 mb-2 flex items-center gap-2">
          <span>💡</span> Pro Tip
        </h3>
        <p className="text-sm text-indigo-400/80 leading-relaxed">
          SciDigest works best with direct RSS feeds from journal publishers and pre-print servers like arXiv. 
          When adding a manual source, ensure the URL points to a valid XML/RSS feed for the highest reliability.
        </p>
      </section>
    </div>
  );
};

export default FeedsSection;
