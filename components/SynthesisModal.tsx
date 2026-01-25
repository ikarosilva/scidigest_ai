
import React, { useState } from 'react';
import { Article, Note } from '../types';
import { geminiService } from '../services/geminiService';

interface SynthesisModalProps {
  articles: Article[];
  notes: Note[];
  onClose: () => void;
}

const SynthesisModal: React.FC<SynthesisModalProps> = ({ articles, notes, onClose }) => {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSynthesize = async () => {
    setLoading(true);
    const noteContents = notes.map(n => n.content);
    const synthesis = await geminiService.synthesizeResearch(articles, noteContents);
    setResult(synthesis || "Failed to generate synthesis.");
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <header className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-indigo-400">✨</span> Research Synthesis
            </h3>
            <p className="text-slate-500 text-sm mt-1">Cross-document analysis powered by Gemini 3 Pro.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {!result && !loading ? (
            <div className="text-center py-12 space-y-8">
              <div className="flex justify-center -space-x-4">
                {articles.slice(0, 3).map((a, i) => (
                  <div key={a.id} className="w-16 h-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex items-center justify-center text-2xl transform hover:-translate-y-2 transition-transform" style={{ zIndex: 3-i }}>📄</div>
                ))}
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-xl font-bold text-slate-200">Ready to synthesize {articles.length} sources</h4>
                <p className="text-slate-500 mt-2 text-sm">
                  Gemini will identify thematic overlaps, methodological conflicts, and future research trajectories across these selected works.
                </p>
              </div>
              <button 
                onClick={handleSynthesize}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-12 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
              >
                Begin Cross-Document Synthesis
              </button>
            </div>
          ) : loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">🧠</div>
              </div>
              <div className="text-center">
                <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs">Analyzing Knowledge Threads</p>
                <p className="text-slate-500 text-xs mt-2 italic">Gemini is mapping conceptual intersections...</p>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert prose-slate max-w-none animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-inner font-serif leading-relaxed text-slate-300 whitespace-pre-line">
                 {result}
               </div>
               <div className="flex justify-between mt-8">
                 <button 
                  onClick={() => {
                    const blob = new Blob([result!], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Synthesis_${new Date().toISOString().split('T')[0]}.md`;
                    a.click();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-6 py-3 rounded-xl transition-all border border-slate-700"
                 >
                   💾 Download Report (.md)
                 </button>
                 <button 
                  onClick={() => setResult(null)}
                  className="text-slate-500 hover:text-white text-xs font-bold"
                 >
                   Re-run Analysis
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SynthesisModal;
