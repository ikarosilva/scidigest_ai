
import React, { useState, useEffect } from 'react';
import { Article, FeedSourceType } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface TrackerProps {
  onAdd: (article: Article) => void;
  onRead: (article: Article) => void;
}

const Tracker: React.FC<TrackerProps> = ({ onAdd, onRead }) => {
  const [radarHits, setRadarHits] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [newAuthor, setNewAuthor] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const data = dbService.getData();
  const trackedAuthors = data.trackedAuthors || [];
  const libraryArticles = data.articles;
  const trackedPapers = libraryArticles.filter(a => a.isTracked).map(a => a.title);

  const handleScanRadar = async () => {
    if (trackedAuthors.length === 0 && trackedPapers.length === 0) {
      alert("No papers or authors marked for tracking. Add them in the Configuration panel below.");
      setShowConfig(true);
      return;
    }
    setIsScanning(true);
    try {
      const hits = await geminiService.getRadarUpdates(trackedPapers, trackedAuthors);
      setRadarHits(hits);
    } catch (err) {
      console.error(err);
      alert("Sonar scan failed. Ensure search grounding is available.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddAuthor = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAuthor.trim() && !trackedAuthors.includes(newAuthor.trim())) {
      dbService.updateTrackedAuthors([...trackedAuthors, newAuthor.trim()]);
      setNewAuthor('');
      window.dispatchEvent(new CustomEvent('db-update'));
    }
  };

  const handleRemoveAuthor = (author: string) => {
    dbService.updateTrackedAuthors(trackedAuthors.filter(a => a !== author));
    window.dispatchEvent(new CustomEvent('db-update'));
  };

  const toggleTrackPaper = (id: string, current: boolean) => {
    dbService.updateArticle(id, { isTracked: !current });
    window.dispatchEvent(new CustomEvent('db-update'));
  };

  const createArticleFromCandidate = (hit: any): Article => ({
    id: Math.random().toString(36).substr(2, 9),
    title: hit.title,
    authors: hit.authors || ['Research Group'],
    abstract: hit.abstract || hit.snippet,
    date: `${hit.year || '2025'}-01-01`,
    year: hit.year || '2025',
    source: (hit.source as FeedSourceType) || FeedSourceType.MANUAL,
    rating: 5,
    tags: ['Radar Hit', hit.reason.includes('author') ? 'Author Tracking' : 'Citation Tracking'],
    isBookmarked: false,
    notes: `Tracker Hit: ${hit.reason}`,
    noteIds: [],
    userReadTime: 0,
    pdfUrl: hit.url,
    shelfIds: [],
    userReviews: {
      sentiment: 'Unknown',
      summary: hit.reason,
      citationCount: hit.citationCount || 0,
      citedByUrl: `https://scholar.google.com/scholar?q=${encodeURIComponent(hit.title)}`
    }
  });

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>🕵️</span> Research Tracker
          </h2>
          <p className="text-slate-400 mt-1">Live Sonar for citations and academic updates.</p>
        </div>
        <div className="flex gap-4">
           <button 
            onClick={() => setShowConfig(!showConfig)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all border border-slate-700"
          >
            {showConfig ? "Hide Config" : "Manage Targets"}
          </button>
           <button 
            onClick={handleScanRadar}
            disabled={isScanning}
            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 py-3 rounded-xl transition-all shadow-lg flex items-center gap-3 ${isScanning ? 'opacity-50' : ''}`}
          >
            {isScanning ? (
              <>
                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                Sweeping...
              </>
            ) : "Pinging Network"}
          </button>
        </div>
      </header>

      {showConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
             <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
               <span>👥</span> Tracked Authors
             </h3>
             <form onSubmit={handleAddAuthor} className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Researcher Name..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Add</button>
             </form>
             <div className="flex flex-wrap gap-2">
                {trackedAuthors.map(a => (
                  <span key={a} className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full text-[10px] text-slate-300 flex items-center gap-2 group">
                    {a}
                    <button onClick={() => handleRemoveAuthor(a)} className="text-slate-600 hover:text-red-400">✕</button>
                  </span>
                ))}
                {trackedAuthors.length === 0 && <p className="text-[10px] text-slate-600 italic">No authors tracked.</p>}
             </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
             <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
               <span>📄</span> Followed Literature
             </h3>
             <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-widest font-black">Sonar tracks new citations for these papers</p>
             <div className="max-height-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {libraryArticles.map(a => (
                  <button 
                    key={a.id}
                    onClick={() => toggleTrackPaper(a.id, !!a.isTracked)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${a.isTracked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                  >
                    <span className={`text-[10px] font-bold truncate max-w-[200px] ${a.isTracked ? 'text-emerald-400' : 'text-slate-400'}`}>{a.title}</span>
                    <span className={`text-[9px] font-black uppercase ${a.isTracked ? 'text-emerald-500' : 'text-slate-600 group-hover:text-slate-400'}`}>
                      {a.isTracked ? 'Tracking Active' : 'Track Citation'}
                    </span>
                  </button>
                ))}
                {libraryArticles.length === 0 && <p className="text-[10px] text-slate-600 italic">Add papers to library to start tracking citations.</p>}
             </div>
          </div>
        </div>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
        {radarHits.length === 0 && !isScanning ? (
          <div className="text-center space-y-6 relative z-10 max-w-md">
             <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
                <span>🕵️</span>
             </div>
             <div>
                <h3 className="text-xl font-bold text-slate-300">Sonar Disengaged</h3>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                  Start tracking breakthroughs by marking specific papers or authors. Pinging the network will perform a live crawl for the most recent activity across repositories.
                </p>
             </div>
             <button 
               onClick={handleScanRadar}
               className="text-[10px] font-black uppercase text-indigo-400 border border-indigo-500/30 px-6 py-2 rounded-xl hover:bg-indigo-500/10 transition-all"
             >
               Perform Initial Sweep
             </button>
          </div>
        ) : radarHits.length > 0 ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
             {radarHits.map((hit, i) => (
               <div key={i} className="bg-slate-950 border border-indigo-500/10 rounded-2xl p-6 hover:border-indigo-500/40 transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                     <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                       Radar Ping
                     </span>
                     <span className="text-[10px] text-slate-600 font-bold">{hit.year}</span>
                  </div>
                  <h4 onClick={() => onRead(createArticleFromCandidate(hit))} className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2 cursor-pointer mb-2">
                    {hit.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 mb-4 italic">by {hit.authors?.join(', ') || 'N/A'}</p>
                  
                  <div className="bg-indigo-900/10 border border-indigo-500/10 rounded-xl p-3 mb-4 mt-auto">
                     <p className="text-[10px] text-indigo-300">
                        Matches: <span className="font-bold text-white">{hit.reason}</span>
                     </p>
                  </div>

                  <div className="flex gap-2">
                     <button onClick={() => onAdd(createArticleFromCandidate(hit))} className="flex-1 bg-indigo-600 text-white text-[10px] font-black uppercase py-2 rounded-lg">Ingest</button>
                     <button onClick={() => onRead(createArticleFromCandidate(hit))} className="px-3 py-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white">📖</button>
                  </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
             <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em]">Scanning academic repositories...</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Tracker;
