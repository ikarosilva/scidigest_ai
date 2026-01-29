import React, { useState } from 'react';
import { Feed } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { FEED_CATALOG, EXTERNAL_CATALOG_LINKS } from '../services/feedCatalog';

interface FeedsSectionProps {
  feeds: Feed[];
  onUpdateFeeds: (feeds: Feed[]) => void;
}

const FeedsSection: React.FC<FeedsSectionProps> = ({ feeds, onUpdateFeeds }) => {
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<any[]>([]);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [selectedCatalogUrls, setSelectedCatalogUrls] = useState<Set<string>>(new Set());

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

  const handleDiscover = async () => {
    const interests = dbService.getInterests();
    if (interests.length === 0) {
      alert("Please define research topics in the 'Topics' tab first.");
      return;
    }

    setIsDiscovering(true);
    try {
      const results = await geminiService.discoverScientificFeeds(interests);
      // Filter out feeds we already have
      const existingUrls = new Set(feeds.map(f => f.url.toLowerCase()));
      const uniqueResults = results.filter(r => !existingUrls.has(r.url.toLowerCase()));
      setDiscoveredFeeds(uniqueResults);
    } catch (err) {
      alert("Failed to discover feeds. Please check your network or API key.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAddDiscovered = (df: any) => {
    const newFeed: Feed = {
      id: Math.random().toString(36).substr(2, 9),
      name: df.name,
      url: df.url,
      active: true
    };
    onUpdateFeeds([...feeds, newFeed]);
    setDiscoveredFeeds(prev => prev.filter(f => f.url !== df.url));
  };

  const toggleFeed = (id: string) => {
    onUpdateFeeds(feeds.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  const removeFeed = (id: string) => {
    onUpdateFeeds(feeds.filter(f => f.id !== id));
  };

  const existingUrls = new Set(feeds.map(f => f.url.toLowerCase()));

  const toggleCatalogSelection = (url: string) => {
    setSelectedCatalogUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleAddSelectedFromCatalog = () => {
    const toAdd: Feed[] = [];
    FEED_CATALOG.forEach(cat => {
      cat.feeds.forEach(f => {
        if (selectedCatalogUrls.has(f.url) && !existingUrls.has(f.url.toLowerCase())) {
          toAdd.push({
            id: Math.random().toString(36).substr(2, 9),
            name: f.name,
            url: f.url,
            active: true,
          });
        }
      });
    });
    if (toAdd.length > 0) onUpdateFeeds([...feeds, ...toAdd]);
    setSelectedCatalogUrls(new Set());
    setCatalogModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <span>📡</span> Feeds
          </h2>
          <p className="text-slate-400 mt-1">
            Configure the scientific sources monitored by the AI discovery engine.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            onClick={() => setCatalogModalOpen(true)}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          >
            📋 Add from catalog
          </button>
          <button 
            onClick={handleDiscover}
            disabled={isDiscovering}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border ${
              isDiscovering 
              ? 'bg-slate-800 text-slate-500 cursor-wait border-slate-700' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 border-indigo-500'
            }`}
          >
            {isDiscovering ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-500/20 border-t-slate-500 rounded-full animate-spin"></span>
                Exploring...
              </>
            ) : (
              <>🔍 Discover with AI</>
            )}
          </button>
        </div>
      </header>

      {/* Add from catalog modal */}
      {catalogModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-white">Add feeds from catalog</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Curated science & tech RSS</p>
              </div>
              <button onClick={() => { setCatalogModalOpen(false); setSelectedCatalogUrls(new Set()); }} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {FEED_CATALOG.map(cat => (
                <div key={cat.category}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">{cat.category}</h4>
                  <ul className="space-y-2">
                    {cat.feeds.map(f => {
                      const alreadyAdded = existingUrls.has(f.url.toLowerCase());
                      return (
                        <li key={f.url} className="flex items-center gap-3 py-1.5">
                          <input
                            type="checkbox"
                            id={`cat-${f.url}`}
                            checked={selectedCatalogUrls.has(f.url)}
                            onChange={() => toggleCatalogSelection(f.url)}
                            disabled={alreadyAdded}
                            className="rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                          />
                          <label htmlFor={`cat-${f.url}`} className={`flex-1 text-sm ${alreadyAdded ? 'text-slate-500' : 'text-slate-200'} cursor-pointer`}>
                            {f.name}
                            {alreadyAdded && <span className="ml-2 text-[10px] text-slate-600">(already added)</span>}
                          </label>
                          <span className="text-[10px] font-mono text-slate-600 truncate max-w-[180px]" title={f.url}>{f.url}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <footer className="p-6 border-t border-slate-800 bg-slate-950 flex flex-col gap-4 shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={handleAddSelectedFromCatalog}
                  disabled={selectedCatalogUrls.size === 0}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Add selected to Monitoring Feeds ({selectedCatalogUrls.size})
                </button>
                <button onClick={() => { setCatalogModalOpen(false); setSelectedCatalogUrls(new Set()); }} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
              </div>
              <p className="text-[10px] text-slate-500">Find more feeds:</p>
              <div className="flex flex-wrap gap-2">
                {EXTERNAL_CATALOG_LINKS.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs font-bold underline">
                    {link.label}
                  </a>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Found a feed there? Copy its RSS/Atom URL, close this modal, then paste the <strong className="text-slate-300">name</strong> and <strong className="text-slate-300">URL</strong> into <strong className="text-indigo-400">Add Custom RSS/JSON Feed</strong> below on this page and click Add New Source.
              </p>
            </footer>
          </div>
        </div>
      )}

      {/* Discovery Results Section */}
      {discoveredFeeds.length > 0 && (
        <section className="bg-slate-900 border border-indigo-500/20 rounded-[2rem] p-8 shadow-2xl shadow-indigo-500/5 animate-in slide-in-from-top-4 duration-500">
           <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-indigo-300">Discovered Sources</h3>
                <p className="text-sm text-slate-400 mt-1">Found based on your active research trajectories.</p>
              </div>
              <button 
                onClick={() => setDiscoveredFeeds([])}
                className="text-slate-500 hover:text-white text-xs font-bold"
              >
                Clear Results
              </button>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {discoveredFeeds.map((df, idx) => (
                <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all flex flex-col">
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {df.type}
                      </span>
                      <button 
                        onClick={() => handleAddDiscovered(df)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-all"
                      >
                        + Add to Feeds
                      </button>
                   </div>
                   <h4 className="text-sm font-bold text-slate-200 mb-1">{df.name}</h4>
                   <p className="text-xs text-slate-500 line-clamp-2 italic mb-3">"{df.description}"</p>
                   <p className="text-[10px] font-mono text-slate-600 truncate mt-auto">{df.url}</p>
                </div>
              ))}
           </div>
        </section>
      )}

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
          {feeds.length === 0 && !isDiscovering && discoveredFeeds.length === 0 && (
            <div className="text-center py-20 bg-slate-950/50 rounded-[2rem] border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-6">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-4xl shadow-inner border border-slate-800/50">
                🔭
              </div>
              <div className="max-w-md">
                <h4 className="text-lg font-bold text-slate-300">Your Radar is Quiet</h4>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  No feed sources are currently configured. SciDigest works best when connected to major journals, preprint servers, and technical blogs.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <button 
                  onClick={() => setCatalogModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-8 py-3 rounded-2xl shadow-xl transition-all flex items-center gap-2"
                >
                  <span>📋</span> Add from catalog
                </button>
                <button 
                  onClick={handleDiscover}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs uppercase tracking-widest px-8 py-3 rounded-2xl border border-slate-700 transition-all flex items-center gap-2"
                >
                  <span>🔍</span> Discover with AI
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-800" id="add-custom-feed">
          <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Add Custom RSS/JSON Feed</h4>
          <p className="text-xs text-slate-500 mb-4">
            Paste any RSS/Atom URL from Feedspot, Awesome RSS Feeds, or elsewhere. Enter a name and the feed URL, then click Add New Source.
          </p>
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
          AI Discovery works best when your Topics are specific. Instead of "Biology", use "CRISPR gene editing in infectious diseases". 
          Discovered sources include conference notification pages, pre-print server categories (arXiv/MedRxiv), and major journal alert RSS feeds.
        </p>
      </section>
    </div>
  );
};

export default FeedsSection;
