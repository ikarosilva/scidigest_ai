
import React, { useState, useEffect, useRef } from 'react';
import { Article, Note, ReadingMode, FeedSourceType } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface ReaderProps {
  article: Article | null;
  notes: Note[];
  onNavigateToLibrary: () => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onCreateNote: (note: Note) => void;
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onAddArticle: (article: Article) => void;
  onAddReadTime: (id: string, seconds: number) => void;
}

const Reader: React.FC<ReaderProps> = ({ article, notes, onNavigateToLibrary, onUpdateNote, onCreateNote, onUpdateArticle, onAddArticle, onAddReadTime }) => {
  const [markdown, setMarkdown] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'notes' | 'lexicon' | 'reviewer2' | 'whatif' | 'rabbitHole' | 'quiz'>('notes');
  const [readingMode, setReadingMode] = useState<ReadingMode>('default');
  
  // Reviewer 2 state
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // What If state
  const [whatIfInput, setWhatIfInput] = useState('');
  const [whatIfResult, setWhatIfResult] = useState<string | null>(null);
  const [isExploring, setIsExploring] = useState(false);

  // Rabbit Hole state
  const [rabbitHoleResults, setRabbitHoleResults] = useState<any[]>([]);
  const [isMining, setIsMining] = useState(false);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (article) {
      setSessionSeconds(0);
      setIsTimerPaused(false);
      
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        if (!isTimerPaused) {
          setSessionSeconds(s => s + 1);
          onAddReadTime(article.id, 1);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [article?.id, isTimerPaused]);

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setMarkdown(newContent);
    if (!article) return;
    if (activeNoteId) {
      onUpdateNote(activeNoteId, { content: newContent, lastEdited: new Date().toISOString() });
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

  const handleSaveToNote = (type: 'Audit' | 'Scenario') => {
    if (!article) return;
    const result = type === 'Audit' ? auditResult : whatIfResult;
    if (!result) return;

    const newNoteId = Math.random().toString(36).substr(2, 9);
    const newNote: Note = {
      id: newNoteId,
      title: `${type === 'Audit' ? 'Reviewer 2' : 'What If'}: ${article.title.substring(0, 30)}...`,
      content: `## AI ${type === 'Audit' ? 'Adversarial Audit' : 'Scenario Analysis'} for "${article.title}"\n\n${type === 'Scenario' ? `**Hypothetical Input:** ${whatIfInput}\n\n` : ''}${result}`,
      articleIds: [article.id],
      lastEdited: new Date().toISOString()
    };
    onCreateNote(newNote);
    alert(`Knowledge item exported to Research Notes.`);
  };

  const handleRunAudit = async () => {
    if (!article || isAuditing) return;
    setIsAuditing(true);
    try {
      const result = await geminiService.runReviewer2Audit(article);
      setAuditResult(result);
    } catch (err) {
      console.error("Audit Error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRunWhatIf = async () => {
    if (!article || isExploring || !whatIfInput.trim()) return;
    setIsExploring(true);
    try {
      const result = await geminiService.askWhatIf(article, whatIfInput);
      setWhatIfResult(result);
    } catch (err) {
      console.error("What If Error:", err);
    } finally {
      setIsExploring(false);
    }
  };

  const handleDiscoverRabbitHole = async () => {
    if (!article || isMining) return;
    setIsMining(true);
    try {
      const { groundingSources } = await geminiService.discoverReferences(article);
      setRabbitHoleResults(groundingSources || []);
    } catch (err) {
      console.error("Rabbit Hole Discovery Error:", err);
    } finally {
      setIsMining(false);
    }
  };

  const handleAddToQueue = (res: any) => {
    if (!res.web) return;
    const newArt: Article = {
      id: Math.random().toString(36).substr(2, 9),
      title: res.web.title || "Untitled Citation",
      authors: ["Discovered via Rabbit Hole"],
      abstract: "Full abstract pending ingestion.",
      date: new Date().toISOString(),
      year: new Date().getFullYear().toString(),
      source: FeedSourceType.MANUAL,
      rating: 0,
      pdfUrl: res.web.uri,
      tags: ['Rabbit Hole', 'Citation'],
      isBookmarked: false,
      notes: `Discovered as citation for: ${article?.title}`,
      noteIds: [],
      userReadTime: 0,
      shelfIds: ['default-queue'],
      userReviews: {
        sentiment: 'Unknown',
        summary: 'Awaiting primary analysis.',
        citationCount: 0
      }
    };
    onAddArticle(newArt);
    alert(`Added "${newArt.title}" to your reading Queue.`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!article) return null;

  return (
    <div title={article.title} className={`h-screen flex overflow-hidden transition-colors duration-500 ${
      readingMode === 'night' ? 'bg-[#1a1110] text-slate-300' : 
      readingMode === 'paper' ? 'bg-[#f4f1ea] text-slate-800' : 
      'bg-slate-950 text-slate-100'
    }`}>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={onNavigateToLibrary} className="p-2 hover:bg-white/10 rounded-lg transition-colors">← Library</button>
            <h2 className="text-sm font-bold truncate max-w-md">"{article.title}"</h2>
            {showTimer && (
              <div className="flex items-center gap-3 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Session: {formatTime(sessionSeconds)}</span>
                <button onClick={() => setIsTimerPaused(!isTimerPaused)} className="text-xs">{isTimerPaused ? '▶️' : '⏸️'}</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowTimer(!showTimer)} 
              title={showTimer ? "Hide Timer" : "Show Timer"}
              className="p-2 hover:bg-white/10 rounded-lg text-xs"
            >
              ⏱️
            </button>
            <div className="flex bg-slate-800/50 p-1 rounded-lg">
              {(['default', 'paper', 'night'] as ReadingMode[]).map(m => (
                <button key={m} onClick={() => setReadingMode(m)} className={`px-3 py-1 text-[10px] font-black uppercase rounded ${readingMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => window.open(article.pdfUrl || '#', '_blank')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-lg">Open PDF</button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-8">
              <h1 className="text-4xl font-black leading-tight">{article.title}</h1>
              <p className="text-lg text-slate-400 font-medium">{article.authors.join(', ')}</p>
              <div className="prose prose-invert prose-indigo max-w-none">
                <p className="text-lg leading-relaxed italic text-slate-300">{article.abstract}</p>
              </div>
              <div className="pt-12 border-t border-slate-800/50">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Annotations</h3>
                 <textarea 
                   value={markdown} 
                   onChange={handleMarkdownChange} 
                   placeholder="Start typing your Markdown annotations here..." 
                   className="w-full h-[400px] bg-transparent text-lg leading-relaxed outline-none resize-none" 
                 />
              </div>
            </div>
          </div>

          <div className="w-96 bg-black/40 border-l border-slate-800/50 flex flex-col">
            <div className="p-4 border-b border-slate-800/50 flex gap-1 overflow-x-auto no-scrollbar">
               {(['notes', 'lexicon', 'reviewer2', 'whatif', 'rabbitHole', 'quiz'] as const).map(tab => (
                 <button key={tab} onClick={() => setSidebarTab(tab)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sidebarTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                   {tab === 'rabbitHole' ? 'Rabbit Hole' : tab === 'reviewer2' ? 'Reviewer 2' : tab === 'whatif' ? 'What If' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                 </button>
               ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {sidebarTab === 'notes' && <div className="text-xs text-slate-500">Note structure and metadata management.</div>}
              {sidebarTab === 'reviewer2' && (
                <div className="space-y-6">
                   <div className="flex items-center gap-3">
                      <span className="text-2xl">👿</span>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">Reviewer 2 Protocol</h4>
                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Adversarial Audit Mode</p>
                      </div>
                   </div>
                   
                   {!auditResult ? (
                     <div className="space-y-4">
                        <p className="text-xs text-slate-400 leading-relaxed">Standard AI summaries are often too optimistic. This protocol uses <strong>Gemini 3 Pro</strong> to simulate an adversarial peer reviewer looking for methodological errors, bias, and over-stated results.</p>
                        <button 
                          onClick={handleRunAudit}
                          disabled={isAuditing}
                          className="w-full bg-amber-500/10 text-amber-500 border border-amber-500/30 font-black text-[11px] uppercase py-3 rounded-xl hover:bg-amber-500 hover:text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          {isAuditing ? (
                            <>
                              <div className="w-3 h-3 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                              Auditing Methods...
                            </>
                          ) : 'Trigger Adversarial Audit'}
                        </button>
                     </div>
                   ) : (
                     <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-amber-950/20 border border-amber-500/20 p-5 rounded-2xl">
                           <div className="prose prose-invert prose-amber max-w-none text-xs leading-relaxed text-amber-100/80 whitespace-pre-line italic font-serif">
                              {auditResult}
                           </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSaveToNote('Audit')}
                            className="flex-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase py-2.5 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all"
                          >
                            💾 Export to Notes
                          </button>
                          <button 
                            onClick={() => setAuditResult(null)}
                            className="px-4 border border-slate-800 text-[9px] font-black text-slate-500 uppercase rounded-lg hover:text-white transition-all"
                          >
                            Reset
                          </button>
                        </div>
                     </div>
                   )}
                </div>
              )}
              {sidebarTab === 'whatif' && (
                <div className="space-y-6">
                   <div className="flex items-center gap-3">
                      <span className="text-2xl">🤔</span>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">What If Assistant</h4>
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Scenario Exploration</p>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <p className="text-xs text-slate-400 leading-relaxed">Explore hypothetical modifications to this research. Ask about alternative methods, different target devices, or edge cases.</p>
                      <textarea 
                        value={whatIfInput}
                        onChange={(e) => setWhatIfInput(e.target.value)}
                        placeholder="e.g. What if this was applied to low-power edge devices?"
                        className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                      <button 
                        onClick={handleRunWhatIf}
                        disabled={isExploring || !whatIfInput.trim()}
                        className="w-full bg-indigo-600/10 text-indigo-400 border border-indigo-600/30 font-black text-[11px] uppercase py-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isExploring ? 'Exploring Implications...' : 'Analyze Scenario'}
                      </button>
                   </div>

                   {whatIfResult && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl">
                           <div className="prose prose-invert prose-indigo max-w-none text-xs leading-relaxed text-indigo-100/80 whitespace-pre-line italic">
                              {whatIfResult}
                           </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSaveToNote('Scenario')}
                            className="flex-1 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase py-2.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            💾 Export to Notes
                          </button>
                          <button 
                            onClick={() => setWhatIfResult(null)}
                            className="px-4 border border-slate-800 text-[9px] font-black text-slate-500 uppercase rounded-lg hover:text-white transition-all"
                          >
                            Clear
                          </button>
                        </div>
                     </div>
                   )}
                </div>
              )}
              {sidebarTab === 'rabbitHole' && (
                <div className="space-y-4">
                   <h4 className="text-sm font-bold text-white">Rabbit Hole Discovery</h4>
                   <p className="text-xs text-slate-400 leading-relaxed">Map the forward lineage of this paper. Discovered citations can be instantly added to your reading Queue.</p>
                   <button 
                     onClick={handleDiscoverRabbitHole}
                     disabled={isMining}
                     className="w-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-bold py-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                   >
                     {isMining ? 'Mining Citations...' : '🔍 Discover Forward Citations'}
                   </button>
                   
                   <div className="space-y-3 mt-6">
                      {rabbitHoleResults.map((res, i) => (
                        <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2 group">
                           <h5 className="text-[11px] font-bold text-slate-200 line-clamp-2">{res.web?.title || "Cited Publication"}</h5>
                           <div className="flex items-center justify-between">
                             <a href={res.web?.uri} target="_blank" rel="noreferrer" className="text-[9px] text-indigo-400 hover:underline">View Source 🔗</a>
                             <button 
                               onClick={() => handleAddToQueue(res)}
                               className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded hover:bg-emerald-500 hover:text-white transition-all"
                             >
                               + Queue
                             </button>
                           </div>
                        </div>
                      ))}
                      {rabbitHoleResults.length === 0 && !isMining && (
                        <p className="text-[10px] text-slate-600 italic text-center py-8">No citations discovered yet. Click above to scan.</p>
                      )}
                   </div>
                </div>
              )}
              {sidebarTab === 'quiz' && (
                <div className="space-y-4">
                   <h4 className="text-sm font-bold text-white">Knowledge Validation</h4>
                   <p className="text-xs text-slate-400">Generate a 10-Question Quiz based on the technical methodology of this paper.</p>
                   <button className="w-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-bold py-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                     Generate 10-Question Quiz
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reader;
