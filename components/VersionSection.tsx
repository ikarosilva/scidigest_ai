
import React from 'react';
import { APP_VERSION } from '../services/dbService';

const VersionSection: React.FC = () => {
  const coreTools = [
    {
      title: "🐇 Rabbit Hole Explorer",
      tagline: "Automated Bibliography Mining",
      description: "Uses Gemini Search Grounding to crawl and map a paper's entire academic network. It automatically cross-references discovered citations against your library, allowing for one-click ingestion of new literature paths."
    },
    {
      title: "👿 Reviewer 2 Protocol",
      tagline: "Adversarial Methodology Audit",
      description: "A specialized AI persona designed to identify weak assumptions, logical fallacies, and citation bias. It provides a critical counter-weight to supportive summaries, ensuring a rigorous understanding of a paper's limitations."
    },
    {
      title: "🎓 Mastery Academy",
      tagline: "Conceptual Progress Mapping",
      description: "Visualizes your research proficiency using a Dunning-Kruger confidence map. Progress is tracked through AI-generated conceptual quizzes that validate your internal mastery of complex technical domains."
    },
    {
      title: "🕵️ Sonar Tracker",
      tagline: "Forward Citation Monitoring",
      description: "Actively sweeps the academic web for new forward citations of your key papers and new publications from tracked authors, bypassing the latency of traditional RSS feeds."
    },
    {
      title: "🔐 Local-First Privacy",
      tagline: "Secure Research Sovereignty",
      description: "Features client-side AES-GCM 256-bit encryption for cloud syncing. Your research graph and private annotations remain yours—never stored on our servers, only accessible via your private sync key."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <header className="text-center space-y-4">
        <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Academic Release</span>
        </div>
        <h2 className="text-5xl font-black text-white tracking-tight">SciDigest AI <span className="text-indigo-500">v{APP_VERSION}</span></h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          A high-performance research environment optimized for the high-velocity ingestion and critical synthesis of technical literature.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <span className="text-emerald-400">🚀</span> Modern Workflow
           </h3>
           <p className="text-sm text-slate-400 leading-relaxed">
             SciDigest replaces passive 'bookmarking' with active 'digestion'. It bridges the gap between discovering a title and mapping its significance within your personal knowledge graph.
           </p>
           <ul className="space-y-2 pt-2">
             {["Bilingual Technical Analysis", "Multi-Document Synthesis", "BibTeX Ecosystem Support"].map(f => (
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
             Unlike standard LLM tools, SciDigest prioritizes data integrity through Gemini's live Search Grounding, ensuring your discovery radar reflects the latest 2024-2025 updates.
           </p>
           <ul className="space-y-2 pt-2">
             {["Real-time Citation Retrieval", "Linguistic Marker Scanning", "Adversarial Stress Testing"].map(f => (
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
         <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Colleague Briefing Protocol • SciDigest AI System</p>
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
