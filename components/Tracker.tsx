
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
      alert("No papers or authors marked for tracking. Set your name in 'Topics' or click 'Track' on an article in your library.");
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
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>🕵️</span> Research Tracker
          </h2>
          <p className="text-slate-400 mt-1">Live Sonar for citations and academic updates.</p>
        </div>
        <div className="flex gap-4">
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

      <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 shadow-xl relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
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
