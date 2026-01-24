
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Article, Note } from '../types';
import { geminiService } from '../services/geminiService';

interface ReaderProps {
  article: Article | null;
  notes: Note[];
  onNavigateToLibrary: () => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onCreateNote: (note: Note) => void;
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onAddReadTime: (id: string, seconds: number) => void;
}

const Reader: React.FC<ReaderProps> = ({ article, notes, onNavigateToLibrary, onUpdateNote, onCreateNote, onUpdateArticle, onAddReadTime }) => {
  const [markdown, setMarkdown] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<'notes' | 'intel'>('notes');
  const [critique, setCritique] = useState<string | null>(null);
  const [isCritiquing, setIsCritiquing] = useState(false);
  
  const [aiDetection, setAiDetection] = useState<{ probability: number, assessment: string, markers: string[] } | null>(null);
  const [isDetectingAI, setIsDetectingAI] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (article) {
      setSessionSeconds(0);
      setCritique(null); // Reset critique when changing papers
      setAiDetection(null); // Reset detection
      timerRef.current = window.setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [article?.id]);

  useEffect(() => {
    return () => {
      if (article && sessionSeconds > 0) {
        onAddReadTime(article.id, sessionSeconds);
      }
    };
  }, [article?.id, sessionSeconds, onAddReadTime]);

  useEffect(() => {
    if (article) {
      const existingNote = notes.find(n => n.articleIds.includes(article.id));
      if (existingNote) {
        setMarkdown(existingNote.content);
        setActiveNoteId(existingNote.id);
      } else {
        setMarkdown('');
        setActiveNoteId(null);
      }
    }
  }, [article, notes]);

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setMarkdown(newContent);

    if (!article) return;

    if (activeNoteId) {
      onUpdateNote(activeNoteId, { 
        content: newContent, 
        lastEdited: new Date().toISOString() 
      });
    } else if (newContent.trim() !== '') {
      const newNoteId = Math.random().toString(36).substr(2, 9);
      const newNote: Note = {
        id: newNoteId,
        title: `Notes: ${article.title.substring(0, 40)}...`,
        content: newContent,
        articleIds: [article.id],
        lastEdited: new Date().toISOString()
      };
      onCreateNote(newNote);
      setActiveNoteId(newNoteId);
    }
  };

  const handleOpenExternal = () => {
    if (article?.pdfUrl) {
      window.open(article.pdfUrl, '_blank');
    } else if (article) {
      window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`, '_blank');
    }
  };

  const handlePerplexityCrossCheck = () => {
    if (!article) return;
    const query = encodeURIComponent(`Search for the latest data/discussions on: "${article.title}". Is there any newer version of this research or critical community consensus?`);
    window.open(`https://www.perplexity.ai/search?q=${query}`, '_blank');
  };

  const handleGenerateCritique = async () => {
    if (!article) return;
    setIsCritiquing(true);
    try {
      const result = await geminiService.critiqueArticle(article.title, article.abstract);
      setCritique(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCritiquing(false);
    }
  };

  const handleDetectAI = async () => {
    if (!article) return;
    setIsDetectingAI(true);
    try {
      const result = await geminiService.analyzeAIProbability(article.title, article.abstract);
      setAiDetection(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetectingAI(false);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!article) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center p-10 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl animate-in fade-in duration-500">
        <div className="bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-slate-800">
          <span className="text-4xl">📖</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-200">Reader is Empty</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Select an article from your library or feeds to begin reading and annotating.
        </p>
        <button 
          onClick={onNavigateToLibrary}
          className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-2xl transition-all hover:scale-105 shadow-xl shadow-indigo-600/20"
        >
          Go to Library
        </button>
      </div>
    );
  }

  const containerClasses = isMaximized 
    ? "fixed inset-0 z-[100] bg-slate-950 p-4 flex flex-col gap-4 animate-in zoom-in duration-300" 
    : "h-[calc(100vh-120px)] flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500";

  return (
    <div className={containerClasses}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest px-2 py-0.5 rounded flex-shrink-0">Research Reader</span>
            <div className="flex items-center gap-3 ml-2 border-l border-slate-700 pl-3">
               <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Est. Read</span>
                  <span className="text-xs font-bold text-indigo-400">{article.estimatedReadTime || 20}m</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Session</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{formatTime(sessionSeconds)}</span>
               </div>
            </div>
            <h2 className="text-lg font-bold text-slate-100 truncate ml-auto">{article.title}</h2>
          </div>
          <div className="flex items-center gap-4">
             <p className="text-xs text-slate-500 truncate">{article.authors.join(', ')} • {article.year}</p>
             <div className="flex items-center gap-1.5 ml-auto md:ml-0 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">My Rating</span>
                <div className="flex items-center gap-1">
                   {[...Array(10)].map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => onUpdateArticle(article.id, { rating: i + 1 })}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${i < article.rating ? 'bg-indigo-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                        title={`Rate ${i + 1}/10`}
                      />
                   ))}
                   <span className="text-xs font-bold text-indigo-300 ml-1">{article.rating}</span>
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePerplexityCrossCheck}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-xl border border-emerald-500/20 transition-all flex items-center gap-2 group"
          >
            <span>🌐</span> Deep Check
          </button>
          <button 
            onClick={toggleMaximize}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold p-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-2 group"
            title={isMaximized ? "Exit Maximize" : "Maximize Screen"}
          >
            {isMaximized ? "縮" : "全"}
          </button>
          <button 
            onClick={handleOpenExternal}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-slate-800 flex items-center gap-2 group"
          >
            <span className="group-hover:rotate-12 transition-transform">🚀</span> Open in Host App
          </button>
          <button 
            onClick={isMaximized ? toggleMaximize : onNavigateToLibrary}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
             {isMaximized ? 'Exit Maximize' : 'Close Reader'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-[7] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          {article.pdfUrl ? (
            <iframe 
              src={`${article.pdfUrl}#toolbar=0`}
              className="w-full h-full border-none"
              title={article.title}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-slate-950/50">
              <div className="text-6xl mb-4">🔍</div>
              <h4 className="text-xl font-bold text-slate-300">Direct PDF link not found</h4>
              <p className="text-sm text-slate-500 mt-2 max-w-md">
                We couldn't automatically locate a PDF for this paper. Try opening it in your host application to search academic repositories.
              </p>
              <button 
                onClick={handleOpenExternal}
                className="mt-6 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold px-6 py-2.5 rounded-xl border border-indigo-500/20 transition-all"
              >
                Search on Google Scholar
              </button>
            </div>
          )}
        </div>

        <div className="flex-[3] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-xl">
          <div className="flex border-b border-slate-800 bg-slate-950/50">
            <button 
              onClick={() => setSidebarTab('notes')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'notes' ? 'bg-slate-900 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-600 hover:text-slate-400'}`}
            >
              ✍️ Notes
            </button>
            <button 
              onClick={() => setSidebarTab('intel')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'intel' ? 'bg-slate-900 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-600 hover:text-slate-400'}`}
            >
              📡 Extern Intel
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'notes' ? (
              <textarea
                value={markdown}
                onChange={handleMarkdownChange}
                placeholder="Start typing your Markdown annotations here... Your notes are automatically saved to your Research Notes library."
                className="w-full h-full bg-slate-950 p-6 text-sm text-slate-300 outline-none border-none resize-none font-mono leading-relaxed placeholder:text-slate-700"
              />
            ) : (
              <div className="p-6 space-y-8 animate-in fade-in duration-300 pb-20">
                <section>
                   <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">AI Critical Appraisal</h4>
                   {!critique && !isCritiquing ? (
                     <div className="bg-slate-950/50 border border-dashed border-slate-800 p-6 rounded-2xl text-center">
                        <p className="text-xs text-slate-600 mb-4">Generate an automated peer-review critique focused on methodology and novelty.</p>
                        <button 
                          onClick={handleGenerateCritique}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase py-2 px-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                        >
                          Generate Critique
                        </button>
                     </div>
                   ) : isCritiquing ? (
                     <div className="bg-slate-950/50 border border-emerald-500/20 p-8 rounded-2xl flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest animate-pulse">Analyzing Methods...</p>
                     </div>
                   ) : (
                     <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/20 text-xs text-slate-300 leading-relaxed whitespace-pre-line relative group">
                        <button 
                          onClick={() => setCritique(null)}
                          className="absolute top-2 right-2 text-slate-600 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                        {critique}
                     </div>
                   )}
                </section>

                <section>
                   <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">Integrity Check (AI Detection)</h4>
                   {!aiDetection && !isDetectingAI ? (
                     <div className="bg-slate-950/50 border border-dashed border-slate-800 p-6 rounded-2xl text-center">
                        <p className="text-xs text-slate-600 mb-4">Analyze linguistic markers to determine if this abstract was potentially generated by an LLM.</p>
                        <button 
                          onClick={handleDetectAI}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase py-2 px-4 rounded-xl transition-all shadow-lg shadow-amber-600/20"
                        >
                          Scan for AI Markers
                        </button>
                     </div>
                   ) : isDetectingAI ? (
                     <div className="bg-slate-950/50 border border-amber-500/20 p-8 rounded-2xl flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest animate-pulse">Scanning Linguistically...</p>
                     </div>
                   ) : (
                     <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/20 space-y-3 relative group">
                        <button 
                          onClick={() => setAiDetection(null)}
                          className="absolute top-2 right-2 text-slate-600 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-[10px] font-black uppercase text-slate-500">AI Probability</span>
                           <span className={`text-xs font-black ${aiDetection.probability > 60 ? 'text-red-400' : aiDetection.probability > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {aiDetection.probability}%
                           </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                           <div 
                              className={`h-full transition-all duration-1000 ${aiDetection.probability > 60 ? 'bg-red-500' : aiDetection.probability > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${aiDetection.probability}%` }}
                           ></div>
                        </div>
                        <p className="text-xs text-slate-200 font-bold italic">{aiDetection.assessment}</p>
                        <div className="space-y-1">
                           {aiDetection.markers.map((m, i) => (
                              <div key={i} className="text-[10px] text-slate-500 flex items-start gap-2">
                                 <span className="text-indigo-500">•</span>
                                 <span>{m}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                   )}
                </section>

                <section>
                   <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">External Grounding</h4>
                   <div className="space-y-3">
                      <button 
                        onClick={handlePerplexityCrossCheck}
                        className="w-full bg-slate-950 border border-slate-800 hover:border-emerald-500/30 p-4 rounded-2xl text-left flex items-center justify-between transition-all group"
                      >
                         <div>
                            <p className="text-[11px] font-bold text-slate-300">Perplexity Deep Dive</p>
                            <p className="text-[9px] text-slate-500">Search for citations & community consensus</p>
                         </div>
                         <span className="text-slate-600 group-hover:text-emerald-400 transition-colors">↗</span>
                      </button>
                      
                      <button 
                        onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`, '_blank')}
                        className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/30 p-4 rounded-2xl text-left flex items-center justify-between transition-all group"
                      >
                         <div>
                            <p className="text-[11px] font-bold text-slate-300">Google Scholar Network</p>
                            <p className="text-[9px] text-slate-500">Track cited-by and version history</p>
                         </div>
                         <span className="text-slate-600 group-hover:text-indigo-400 transition-colors">↗</span>
                      </button>
                   </div>
                </section>
                
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-[9px] text-slate-600 italic text-center">Grounding data is retrieved in real-time using search-grounded models.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
            <span className="text-[9px] text-slate-600 font-bold uppercase">{sidebarTab === 'notes' ? 'Markdown Editor' : 'Research Intel Panel'}</span>
            <span className="text-[9px] text-slate-600 font-medium">{sidebarTab === 'notes' ? 'Linked to Research Notes' : 'Grounded AI Analysis'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reader;
