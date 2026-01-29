import React from 'react';
import { APP_VERSION, RELEASE_DATE } from '../services/dbService';

const VersionSection: React.FC = () => {
  const coreTools = [
    {
      title: "🐇 Rabbit Hole Explorer",
      tagline: "Automated Bibliography Mapping",
      description: "Unlike simple citation lists, Rabbit Hole uses Gemini Search Grounding to actively crawl a paper's entire academic network. It automatically cross-references discovered citations against your existing library, enabling high-velocity ingestion of new literature paths with real-time library-match indicators."
    },
    {
      title: "👿 Reviewer 2 Protocol",
      tagline: "Adversarial Methodology Audit",
      description: "A specialized AI module designed to provide a critical counter-weight to standard paper summaries. It identifies weak assumptions, logical fallacies, and over-stated conclusions, simulating the 'tough peer reviewer' experience to ensure scientific rigour in your analysis."
    },
    {
      title: "🎓 Mastery Academy",
      tagline: "Conceptual Competence Mapping",
      description: "Visualizes research proficiency using a Dunning-Kruger confidence map. Progress is tracked through AI-generated conceptual quizzes that validate deep internalization of technical domains, gamifying the transition from surface-level awareness to research mastery."
    },
    {
      title: "🕵️ Feeds",
      tagline: "Live Academic Web Sweep",
      description: "Bypasses the latency of traditional RSS. Feeds actively monitors specific academic trajectories for new forward-citations and author publications, keeping you ahead of the curve on critical research pivots before they hit the mainstream."
    },
    {
      title: "🔐 Sovereignty Architecture",
      tagline: "Local-First Encrypted Portability",
      description: "Built on a privacy-first foundation. All annotations, research graphs, and library data are encrypted client-side using AES-GCM 256-bit encryption before cloud sync. Your intellectual property remains under your control at all times."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <header className="text-center space-y-4">
        <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Colleague Release Protocol</span>
        </div>
        <h2 className="text-5xl font-black text-white tracking-tight">SciDigest AI <span className="text-indigo-500">v{APP_VERSION}</span></h2>
        <div className="flex items-center justify-center gap-4 text-slate-500 font-bold text-xs uppercase tracking-widest">
           <span>Release Date: {RELEASE_DATE}</span>
           <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
           <span className="text-emerald-500">Stability: Alpha-Stable</span>
        </div>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed mt-6">
          A high-performance research environment optimized for the high-velocity ingestion and critical synthesis of technical literature.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <span className="text-emerald-400">🚀</span> Modern Research Workflow
           </h3>
           <p className="text-sm text-slate-400 leading-relaxed">
             SciDigest replaces passive reading with active digestion. It bridges the gap between discovering a paper and mapping its significance within your personal knowledge graph.
           </p>
           <ul className="space-y-2 pt-2">
             {["Bilingual Technical Synthesis", "Multi-Paper Conflict Detection", "BibTeX Export Integration"].map(f => (
               <li key={f} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> {f}
               </li>
             ))}
           </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <span className="text-orange-400">⚖️</span> Grounded Intelligence
           </h3>
           <p className="text-sm text-slate-400 leading-relaxed">
             Leveraging Gemini 3 Pro with active Search Grounding, ensure your discovery radar reflects real-time academic activity from 2024 and 2025 repositories.
           </p>
           <ul className="space-y-2 pt-2">
             {["Real-time Citation Retrieval", "Linguistic Integrity Scanning", "Search-Grounded Recommendations"].map(f => (
               <li key={f} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                 <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span> {f}
               </li>
             ))}
           </ul>
        </div>
      </div>

      <section className="space-y-6">
        <h3 className="text-sm font-black text-slate-600 uppercase tracking-[0.4em] text-center">System Infrastructure Overview</h3>
        <div className="space-y-4">
          {coreTools.map((tool, idx) => (
            <div key={idx} className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl group hover:border-indigo-500/30 transition-all">
               <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{tool.title}</h4>
                  <span className="text-[10px] font-black uppercase text-indigo-500/60 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 tracking-widest">{tool.tagline}</span>
               </div>
               <p className="text-sm text-slate-500 leading-relaxed">{tool.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center pt-8 border-t border-slate-800 flex flex-col items-center gap-4">
         <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Researcher Briefing • v{APP_VERSION}</p>
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