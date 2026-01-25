import React, { useState } from 'react';
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

  const data = dbService.getData();
  const trackedAuthors = data.trackedAuthors || [];
  const trackedPapers = data.articles.filter(a => a.isTracked).map(a => a.title);

  const handleScanRadar = async () => {
    if (trackedAuthors.length === 0 && trackedPapers.length === 0) {
      alert("No papers or authors marked for tracking. Set your name in Topics or click 'Track' on an article in your library.");
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>🕵️</span> Research Tracker
          </h2>
          <p className="text-slate-400 mt-1">Live Sonar for citations and academic trajectories.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Channels</span>
              <span className="text-lg font-bold text-indigo-400">{trackedAuthors.length + trackedPapers.length}</span>
           </div>
           <button 
            onClick={handleScanRadar}
            disabled={isScanning}
            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 py-3 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 ${isScanning ? 'opacity-50' : ''}`}
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

      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
        {/* Scanning Animation Background */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none opacity-20">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-2 border-indigo-500/40 rounded-full animate-ping"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-indigo-500/40 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border-2 border-indigo-500/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          </div>
        )}

        {radarHits.length === 0 && !isScanning ? (
          <div className="text-center space-y-6 relative z-10">
             <div className="w-24 h-24 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner group">
                <span className="group-hover:scale-125 transition-transform duration-500">🕵️</span>
             </div>
             <div className="max-w-md">
                <h3 className="text-xl font-bold text-slate-300">Sonar Silent</h3>
                <p className="text-slate-500 mt-2 text-sm">
                  We are tracking your citations and specific authors. Pinging the network will perform a live crawl for the most recent breakthroughs.
                </p>
             </div>
             <div className="flex justify-center gap-8 py-4 border-t border-slate-800/50 mt-4">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em]">Author Pins</span>
                   <span className="text-lg font-bold text-indigo-300">{trackedAuthors.length}</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em]">Paper Pins</span>
                   <span className="text-lg font-bold text-indigo-300">{trackedPapers.length}</span>
                </div>
             </div>
          </div>
        ) : radarHits.length > 0 ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
             {radarHits.map((hit, i) => (
               <div key={i} className="bg-slate-950/80 backdrop-blur-sm border border-indigo-500/30 rounded-[2rem] p-6 hover:border-indigo-400 transition-all group flex flex-col animate-in zoom-in duration-300">
                  <div className="flex justify-between items-start mb-4">
                     <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-500/30">
                       Pin Identified
                     </span>
                     <span className="text-[10px] text-slate-500 font-bold">{hit.year}</span>
                  </div>
                  <h4 onClick={() => onRead(createArticleFromCandidate(hit))} className="text-md font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2 cursor-pointer mb-2 leading-tight">
                    {hit.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-4 truncate italic">by {hit.authors?.join(', ') || 'N/A'}</p>
                  
                  <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-2xl p-4 mb-6 mt-auto">
                     <p className="text-[10px] font-bold text-indigo-300 flex items-start gap-2 leading-relaxed">
                        <span className="text-sm shrink-0">🎯</span> 
                        <span>Pinging because: <span className="text-white">{hit.reason}</span></span>
                     </p>
                  </div>

                  <div className="flex gap-3">
                     <button 
                       onClick={() => onAdd(createArticleFromCandidate(hit))} 
                       className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                     >
                        Ingest Pin
                     </button>
                     <button 
                       onClick={() => onRead(createArticleFromCandidate(hit))} 
                       className="px-5 py-3 border border-slate-800 text-slate-400 rounded-xl hover:text-white transition-all bg-slate-900"
                     >
                        📖
                     </button>
                  </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
             <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Crawl in progress...</p>
          </div>
        )}
      </section>

      <footer className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Sonar Methodology</h4>
         <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
           The Tracker utilizes Gemini 3 Pro's Search Grounding to perform real-time forward-citation scrapes. Unlike static databases, it finds papers that have cited your tracked collection in the last few months. Author tracking monitors the latest bibliography updates across Scholar, arXiv, and university repositories.
         </p>
      </footer>
    </div>
  );
};

export default Tracker;