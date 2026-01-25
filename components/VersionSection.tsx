
import React from 'react';
import { APP_VERSION } from '../services/dbService';

const VersionSection: React.FC = () => {
  const releaseNotes = [
    {
      title: "🐇 Rabbit Hole Explorer",
      description: "An automated bibliography miner that crawls paper references via Gemini Search Grounding. It cross-references citations with your existing library in real-time, allowing for one-click ingestion of new literature trails."
    },
    {
      title: "👿 Reviewer 2 Protocol",
      description: "A specialized adversarial AI mode designed to simulate the 'harsh peer reviewer'. It provides critical stress-testing of research methodology, identifies hidden assumptions, and detects potential flaws that supportive summaries might miss."
    },
    {
      title: "🎓 Mastery Academy",
      description: "Leverages the Dunning-Kruger effect visualization to map your conceptual competence. Through automated technical quizzes, the app tracks and gamifies your transition from surface-level awareness to deep research proficiency."
    },
    {
      title: "🕵️ Research Tracker (Sonar)",
      description: "Active monitoring of specific academic trajectories. Unlike static RSS feeds, this tool uses live web grounding to detect new forward citations of your key papers and new publications from tracked authors before they hit general feeds."
    },
    {
      title: "🔐 Privacy-First Portability",
      description: "Local-first architecture with AES-GCM 256-bit client-side encryption. Your research graph and private annotations are never stored on our servers; they stay in your browser or are synced securely via your personal cloud storage key."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header className="text-center space-y-4">
        <div className="inline-block bg-indigo-600/10 border border-indigo-500/20 px-4 py-1.5 rounded-full">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Scientific Release</span>
        </div>
        <h2 className="text-5xl font-black text-white tracking-tight">SciDigest AI <span className="text-indigo-500">v{APP_VERSION}</span></h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          A professional research environment optimized for the high-velocity ingestion and critical analysis of technical literature.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <span className="text-emerald-400">🚀</span> Modern Research Workflow
           </h3>
           <p className="text-sm text-slate-400 leading-relaxed">
             SciDigest is built to solve the 'Infinite Feed' problem. Instead of just listing titles, it helps you build a cohesive knowledge graph by bridging the gap between passive reading and active conceptual mapping.
           </p>
           <ul className="space-y-3 pt-2">
             {["Bilingual Technical Analysis", "Multi-Document Synthesis", "BibTeX Ecosystem Integration"].map(f => (
               <li key={f} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> {f}
               </li>
             ))}
           </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <span className="text-orange-400">⚖️</span> AI Integrity
           </h3>
           <p className="text-sm text-slate-400 leading-relaxed">
             We prioritize grounding. Every discovery hit and synthesis report is generated using Gemini's live search tools to ensure that data reflects the most current academic reality (2024-2025 updates).
           </p>
           <ul className="space-y-3 pt-2">
             {["Search-Grounded Recommendations", "Adversarial Methodology Checks", "Linguistic Integrity Scanning"].map(f => (
               <li key={f} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                 <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span> {f}
               </li>
             ))}
           </ul>
        </div>
      </div>

      <section className="space-y-6">
        <h3 className="text-sm font-black text-slate-600 uppercase tracking-[0.4em] text-center">Core Research Infrastructure</h3>
        <div className="space-y-4">
          {releaseNotes.map((note, idx) => (
            <div key={idx} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl group hover:border-indigo-500/30 transition-all">
               <h4 className="text-lg font-bold text-slate-200 mb-2 group-hover:text-indigo-400 transition-colors">{note.title}</h4>
               <p className="text-sm text-slate-500 leading-relaxed">{note.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center pt-8 border-t border-slate-800 flex flex-col items-center gap-4">
         <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Colleague Release Protocol • SciDigest AI</p>
         <button 
           onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
           className="text-indigo-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-tighter"
         >
           Back to Top ↑
         </button>
      </footer>
    </div>
  );
};

export default VersionSection;
