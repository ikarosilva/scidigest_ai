
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
  const [sidebarTab, setSidebarTab] = useState<'reviewer2' | 'whatif' | 'rabbitHole' | 'quiz'>('reviewer2');
  const [readingMode, setReadingMode] = useState<ReadingMode>('default');
  
  // Layout Collapsible states
  const [isTopBarCollapsed, setIsTopBarCollapsed] = useState(false);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  
  // AI Feature results
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [whatIfInput, setWhatIfInput] = useState('');
  const [whatIfResult, setWhatIfResult] = useState<string | null>(null);
  const [isExploring, setIsExploring] = useState(false);
  const [rabbitHoleResults, setRabbitHoleResults] = useState<any[]>([]);
  const [isMining, setIsMining] = useState(false);

  const timerRef = useRef<number | null>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (article) {
      setSessionSeconds(0);
      setIsTimerPaused(false);
      
      const existingNote = notes.find(n => n.articleIds.includes(article.id));
      if (existingNote) {
        setMarkdown(existingNote.content);
        setActiveNoteId(existingNote.id);
      } else {
        setMarkdown('');
        setActiveNoteId(null);
      }

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

  // Sync Markdown with parent when it changes
  useEffect(() => {
    if (!article || markdown === '') return;
    const existingNote = notes.find(n => n.articleIds.includes(article.id));
    
    if (existingNote) {
      if (existingNote.content !== markdown) {
        onUpdateNote(existingNote.id, { content: markdown, lastEdited: new Date().toISOString() });
      }
    } else if (markdown.trim() !== '') {
      const newNoteId = Math.random().toString(36).substr(2, 9);
      const newNote: Note = {
        id: newNoteId,
        title: `Notes: ${article.title.substring(0, 40)}...`,
        content: markdown,
        articleIds: [article.id],
        lastEdited: new Date().toISOString()
      };
      onCreateNote(newNote);
      setActiveNoteId(newNoteId);
    }
  }, [markdown]);

  const handleAppendToNotes = (text: string, title: string) => {
    const divider = "\n\n---\n\n";
    const header = `### AI Insight: ${title}\n\n`;
    const newContent = `${markdown}${markdown ? divider : ''}${header}${text}`;
    
    setMarkdown(newContent);
    setIsNotesCollapsed(false); // Automatically make sure notes window is visible
    setTimeout(() => {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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
    handleAppendToNotes(`Discovered citation: [${newArt.title}](${newArt.pdfUrl})`, "Rabbit Hole Discovery");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!article) return null;

  return (
    <div title={article.title} className={`h-screen flex flex-col overflow-hidden transition-colors duration-500 ${
      readingMode === 'night' ? 'bg-[#1a1110] text-slate-300' : 
      readingMode === 'paper' ? 'bg-[#f4f1ea] text-slate-800' : 
      'bg-slate-950 text-slate-100'
    }`}>
      {/* 1. READER HEADER */}
      <header className="p-3 border-b border-slate-800/50 flex items-center justify-between bg-black/20 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={onNavigateToLibrary} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-xs font-bold">← Library</button>
          <h2 className="text-sm font-bold truncate max-w-xs md:max-w-md">"{article.title}"</h2>
          {showTimer && (
            <div className="flex items-center gap-3 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Session: {formatTime(sessionSeconds)}</span>
              <button onClick={() => setIsTimerPaused(!isTimerPaused)} className="text-xs">{isTimerPaused ? '▶️' : '⏸️'}</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsTopBarCollapsed(!isTopBarCollapsed)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${!isTopBarCollapsed ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Insights {isTopBarCollapsed ? '▼' : '▲'}
          </button>
          <button 
            onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${!isNotesCollapsed ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Notes {isNotesCollapsed ? '▶' : '◀'}
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1"></div>
          <div className="flex bg-slate-800/50 p-1 rounded-lg">
            {(['default', 'paper', 'night'] as ReadingMode[]).map(m => (
              <button key={m} onClick={() => setReadingMode(m)} className={`px-2 py-1 text-[9px] font-black uppercase rounded ${readingMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                {m.charAt(0)}
              </button>
            ))}
          </div>
          <button onClick={() => window.open(article.pdfUrl || `https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`, '_blank')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-lg">Native View</button>
        </div>
      </header>

      {/* 2. TOP BAR: INTEGRATED INSIGHTS */}
      {!isTopBarCollapsed && (
        <div className="bg-slate-900 border-b border-slate-800 animate-in slide-in-from-top duration-300 z-20">
          <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800/50 overflow-x-auto no-scrollbar">
             {(['reviewer2', 'whatif', 'rabbitHole', 'quiz'] as const).map(tab => (
               <button key={tab} onClick={() => setSidebarTab(tab)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${sidebarTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                 {tab === 'rabbitHole' ? 'Rabbit Hole' : tab === 'reviewer2' ? 'Reviewer 2' : tab === 'whatif' ? 'What If' : 'Quiz'}
               </button>
             ))}
          </div>
          <div className="p-4 h-40 overflow-y-auto custom-scrollbar bg-black/10">
            {sidebarTab === 'reviewer2' && (
              <div className="flex gap-6 items-start h-full">
                <div className="shrink-0 space-y-2">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Methodology Audit</h4>
                  <button 
                    onClick={handleRunAudit}
                    disabled={isAuditing}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isAuditing ? 'Auditing...' : 'Run Reviewer 2'}
                  </button>
                  {auditResult && (
                    <button 
                      onClick={() => handleAppendToNotes(auditResult, "Reviewer 2 Audit")} 
                      className="w-full bg-indigo-600/20 text-indigo-400 text-[8px] font-black uppercase px-2 py-1.5 rounded border border-indigo-500/20 hover:bg-indigo-500/30 transition-all"
                    >
                      Append to Notes ↓
                    </button>
                  )}
                </div>
                <div className="flex-1 text-xs text-slate-400 italic font-serif leading-relaxed max-w-5xl overflow-y-auto pr-4 custom-scrollbar h-full">
                  {auditResult || "Simulate an adversarial peer reviewer looking for methodological errors and biased assumptions. Click 'Run' to begin analysis."}
                </div>
              </div>
            )}
            {sidebarTab === 'whatif' && (
              <div className="flex gap-4 items-start h-full">
                <div className="flex flex-col gap-2 w-72">
                  <textarea 
                    value={whatIfInput}
                    onChange={(e) => setWhatIfInput(e.target.value)}
                    placeholder="Ask a scenario question..."
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleRunWhatIf}
                      disabled={isExploring || !whatIfInput.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase py-2 rounded-lg disabled:opacity-50 transition-all"
                    >
                      Explore
                    </button>
                    {whatIfResult && (
                      <button 
                        onClick={() => handleAppendToNotes(`**Scenario:** ${whatIfInput}\n\n**AI Response:**\n${whatIfResult}`, "What If Analysis")}
                        className="bg-slate-800 text-indigo-400 text-[8px] font-black uppercase px-4 py-2 rounded-lg border border-slate-700 hover:text-white transition-all"
                      >
                        Append
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 text-xs text-slate-500 italic leading-relaxed h-full overflow-y-auto pr-4 custom-scrollbar">
                   {whatIfResult || "Explore hypothetical modifications: 'What if the sample size was doubled?' or 'What if this was applied to cross-platform datasets?'"}
                </div>
              </div>
            )}
            {sidebarTab === 'rabbitHole' && (
              <div className="flex items-center gap-4 h-full overflow-hidden">
                 <div className="shrink-0 flex flex-col gap-2">
                    <button onClick={handleDiscoverRabbitHole} disabled={isMining} className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap">
                      {isMining ? 'Mining...' : '🔍 Discover Citations'}
                    </button>
                    <p className="text-[9px] text-slate-600 uppercase font-black text-center">Grounding Active</p>
                 </div>
                 <div className="flex gap-3 h-full overflow-x-auto no-scrollbar pb-2 pt-1 items-start">
                   {rabbitHoleResults.map((res, i) => (
                     <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl min-w-[240px] max-w-[240px] flex flex-col gap-2 group transition-all hover:border-indigo-500/30">
                        <p className="text-[10px] font-bold text-slate-200 line-clamp-2">{res.web?.title || "Cited Paper Found"}</p>
                        <div className="flex gap-2">
                           <button onClick={() => handleAddToQueue(res)} className="flex-1 text-[8px] font-black text-emerald-400 uppercase bg-emerald-500/5 py-1.5 rounded hover:bg-emerald-500/10 border border-emerald-500/10 transition-all">+ Ingest</button>
                           <a href={res.web?.uri} target="_blank" rel="noreferrer" className="flex-1 text-[8px] font-black text-slate-500 uppercase bg-slate-900 py-1.5 rounded hover:bg-slate-800 border border-slate-800 transition-all text-center">View 🔗</a>
                        </div>
                     </div>
                   ))}
                   {rabbitHoleResults.length === 0 && !isMining && (
                      <div className="flex items-center justify-center h-full px-12 opacity-30 text-xs italic">Citation network lineage results appear here.</div>
                   )}
                 </div>
              </div>
            )}
            {sidebarTab === 'quiz' && (
              <div className="flex items-center gap-8 h-full">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Competence Validation</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Dunning-Kruger Alignment</p>
                </div>
                <p className="text-xs text-slate-400 max-w-sm">Generate a randomized 10-Question proficiency quiz based on the technical methodology of this paper to validate your internalization of the material.</p>
                <button className="bg-indigo-600 text-white text-[10px] font-black uppercase px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Generate Mastery Quiz</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN SPLIT AREA: NOTES (SIDEBAR) & PDF VIEWER (MAIN WINDOW) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT BAR: NOTES COMPONENT */}
        {!isNotesCollapsed && (
          <aside className="w-96 border-r border-slate-800/50 bg-black/10 flex flex-col animate-in slide-in-from-left duration-300">
            <header className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-black/10">
               <div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Annotations</h3>
                 <p className="text-[9px] text-indigo-400 font-bold mt-0.5">Linked Research Notes</p>
               </div>
               <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">Markdown</span>
            </header>
            <div className="flex-1 flex flex-col p-5 space-y-4 overflow-hidden">
               <textarea 
                 value={markdown} 
                 onChange={(e) => setMarkdown(e.target.value)} 
                 placeholder="Start typing scientific insights or append from the Insights bar above..." 
                 className="flex-1 bg-transparent text-sm leading-relaxed outline-none resize-none custom-scrollbar font-serif" 
               />
               <div ref={notesEndRef} />
               <div className="pt-4 border-t border-slate-800/50 shrink-0">
                  <p className="text-[9px] text-slate-600 uppercase font-black mb-2 tracking-widest">Metadata Context</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed italic line-clamp-3">"{article.abstract.substring(0, 150)}..."</p>
               </div>
            </div>
          </aside>
        )}

        {/* MAIN VIEW: PDF VIEWER */}
        <main className="flex-1 bg-slate-900 relative flex flex-col overflow-hidden">
          {article.pdfUrl ? (
            <iframe 
              src={article.pdfUrl} 
              className="w-full h-full border-none bg-white"
              title="PDF Viewer"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
               <div className="w-24 h-24 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center text-4xl shadow-inner grayscale opacity-30">
                  📄
               </div>
               <div>
                  <h3 className="text-xl font-bold text-slate-300">PDF Rendering Unavailable</h3>
                  <p className="text-slate-500 mt-2 text-sm max-w-sm">The source for this paper does not allow direct embedding. Please use the 'Native View' button to open the document in a browser tab.</p>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`, '_blank')} className="bg-slate-800 text-slate-300 px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all hover:text-white">Search Scholar</button>
                  <button onClick={() => window.open(article.pdfUrl || '#', '_blank')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shadow-lg">Open Source Link</button>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* 4. FOOTER STATUS BAR */}
      <footer className="p-1.5 border-t border-slate-800 bg-black/40 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.3em] text-slate-600 z-30">
         <div className="flex items-center gap-4 px-3">
            <span className="flex items-center gap-1.5">
               <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></span>
               Sovereignty: Local Encrypted
            </span>
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <span>v1.6.0 Protocol</span>
         </div>
         <div className="px-3 text-indigo-500/50">
            Analysis Engine: {sidebarTab === 'reviewer2' ? 'Reviewer 2' : sidebarTab === 'whatif' ? 'What If' : 'Citation Sonar'} Active
         </div>
      </footer>
    </div>
  );
};

export default Reader;
