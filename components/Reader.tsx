
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
  onAddReadTime: (id: string, seconds: number) => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface LexiconEntry {
  term: string;
  definition: string;
  researchContext: string;
  relatedTopics: string[];
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

const Reader: React.FC<ReaderProps> = ({ article, notes, onNavigateToLibrary, onUpdateNote, onCreateNote, onUpdateArticle, onAddReadTime }) => {
  const [markdown, setMarkdown] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'notes' | 'lexicon' | 'whatif' | 'reviewer' | 'quiz' | 'citations'>('notes');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>('default');
  
  const [reviewer2Output, setReviewer2Output] = useState<string | null>(null);
  const [isReviewer2Loading, setIsReviewer2Loading] = useState(false);
  
  // Lexicon State
  const [lexiconSearch, setLexiconSearch] = useState('');
  const [isLexiconLoading, setIsLexiconLoading] = useState(false);
  const [lexiconResult, setLexiconResult] = useState<LexiconEntry | null>(null);

  // What If State
  const [whatIfInput, setWhatIfInput] = useState('');
  const [whatIfMessages, setWhatIfMessages] = useState<ChatMessage[]>([]);
  const [isWhatIfLoading, setIsWhatIfLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Rabbit Hole State
  const [enteringRabbitHole, setEnteringRabbitHole] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState<'intro' | 'active' | 'results'>('intro');
  const [quizScore, setQuizScore] = useState<number | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const aiConfig = dbService.getAIConfig();

  useEffect(() => {
    if (article) {
      setSessionSeconds(0);
      setIsTimerPaused(false);
      setReviewer2Output(null);
      setQuizQuestions([]);
      setUserAnswers({});
      setQuizStep('intro');
      setQuizScore(null);
      setLexiconResult(null);
      setWhatIfMessages([]);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setSessionSeconds(prev => {
          if (isTimerPaused) return prev;
          return prev + 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [article?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [whatIfMessages]);

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

  const handleLexiconLookup = async (term?: string) => {
    const target = term || lexiconSearch;
    if (!target.trim() || !article) return;

    setIsLexiconLoading(true);
    try {
      const result = await geminiService.defineScientificTerm(target, article.title);
      if (result) {
        setLexiconResult(result);
        setSidebarTab('lexicon');
        setIsSidebarOpen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLexiconLoading(false);
    }
  };

  const handleWhatIfSend = async () => {
    if (!whatIfInput.trim() || !article || isWhatIfLoading) return;

    const userMsg = whatIfInput;
    setWhatIfInput('');
    setWhatIfMessages(prev => [...prev, { role: 'user', parts: [{ text: userMsg }] }]);
    setIsWhatIfLoading(true);

    try {
      const response = await geminiService.whatIfAssistant(userMsg, whatIfMessages, article);
      setWhatIfMessages(prev => [...prev, { role: 'model', parts: [{ text: response || '...' }] }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsWhatIfLoading(false);
    }
  };

  const handleTextareaSelect = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length < 50) {
      setLexiconSearch(selection);
    }
  };

  const handleOpenExternal = () => {
    if (article?.pdfUrl) {
      window.open(article.pdfUrl, '_blank');
    } else if (article) {
      window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`, '_blank');
    }
  };

  const handleEnterRabbitHole = async () => {
    if (!article) return;
    setEnteringRabbitHole(true);
    try {
      const { references, groundingSources } = await geminiService.discoverReferences(article);
      onUpdateArticle(article.id, { references, groundingSources });
    } catch (err) {
      console.error(err);
      alert("Failed to enter Rabbit Hole.");
    } finally {
      setEnteringRabbitHole(false);
    }
  };

  const handleIngestCitation = async (citationStr: string) => {
    setIngestingId(citationStr);
    try {
      const details = await geminiService.fetchArticleDetails(citationStr);
      if (details && details.title) {
        // Fix: Added missing userReviews and shelfIds properties to satisfy Article type
        // Fix: Cast details to any to access citationCount as it's not on Partial<Article>
        const newArticle: Article = {
          id: Math.random().toString(36).substr(2, 9),
          title: details.title,
          authors: details.authors || [],
          abstract: details.abstract || '',
          date: `${details.year || '2024'}-01-01`,
          year: details.year || 'Unknown',
          source: FeedSourceType.MANUAL,
          rating: 0,
          tags: details.tags || ['Rabbit Hole Discovery'],
          isBookmarked: false,
          notes: `Ingested from Rabbit Hole of: ${article?.title}`,
          noteIds: [],
          userReadTime: 0,
          pdfUrl: details.pdfUrl,
          userReviews: {
            sentiment: 'Unknown',
            summary: 'Discovered via Rabbit Hole.',
            citationCount: (details as any).citationCount || 0
          },
          shelfIds: []
        };
        // Note: In a real app, we would add this to the library via a prop
        // For this task, we are just fixing the TS error.
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIngestingId(null);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!article) return null;

  // Fix: Added the return statement for the component to fix TS error
  return (
    <div className={`h-screen flex overflow-hidden transition-colors duration-500 ${
      readingMode === 'night' ? 'bg-[#1a1110] text-slate-300' : 
      readingMode === 'paper' ? 'bg-[#f4f1ea] text-slate-800' : 
      'bg-slate-950 text-slate-100'
    }`}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={onNavigateToLibrary} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              ← Library
            </button>
            <h2 className="text-sm font-bold truncate max-w-md" title={article.title}>"{article.title}"</h2>
          </div>
          <div className="flex items-center gap-4">
            {showTimer && (
              <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Session</span>
                <span className="text-xs font-mono font-bold text-indigo-300">{formatTime(sessionSeconds)}</span>
                <button onClick={() => setIsTimerPaused(!isTimerPaused)} className="text-[10px] hover:text-white">
                  {isTimerPaused ? '▶️' : '⏸️'}
                </button>
              </div>
            )}
            <div className="flex bg-slate-800/50 p-1 rounded-lg">
              {(['default', 'paper', 'night'] as ReadingMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setReadingMode(m)}
                  className={`px-3 py-1 text-[10px] font-black uppercase rounded ${readingMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button onClick={() => setShowTimer(!showTimer)} title="Hide Timer" className="text-slate-500 hover:text-white">⏳</button>
            <button onClick={handleOpenExternal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-lg shadow-indigo-600/20">
              Open PDF
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="space-y-4 border-b border-slate-800/50 pb-8">
                <div className="flex gap-2">
                  <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">{article.source}</span>
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded">{article.year}</span>
                </div>
                <h1 className="text-4xl font-black leading-tight">{article.title}</h1>
                <p className="text-lg text-slate-400 font-medium">{article.authors.join(', ')}</p>
              </div>

              <div className="prose prose-invert prose-indigo max-w-none">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 mb-4">Abstract</h3>
                <p className="text-lg leading-relaxed italic text-slate-300">
                  {article.abstract}
                </p>
              </div>

              <div className="pt-12 border-t border-slate-800/50">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Annotations & Synthesis</h3>
                 <textarea
                    value={markdown}
                    onChange={handleMarkdownChange}
                    onMouseUp={handleTextareaSelect}
                    placeholder="Start typing your Markdown annotations here... High-density synthesis mode active."
                    className="w-full h-[600px] bg-transparent text-lg leading-relaxed outline-none resize-none placeholder:text-slate-800"
                 />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {isSidebarOpen && (
            <div className="w-96 bg-black/40 border-l border-slate-800/50 flex flex-col animate-in slide-in-from-right-4 duration-300">
              <div className="p-4 border-b border-slate-800/50 flex gap-1 overflow-x-auto no-scrollbar">
                 {(['notes', 'lexicon', 'whatif', 'reviewer', 'quiz', 'citations'] as const).map(tab => (
                   <button
                     key={tab}
                     onClick={() => setSidebarTab(tab)}
                     className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${sidebarTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     {tab}
                   </button>
                 ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {sidebarTab === 'notes' && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-white">Document Structure</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Synthesis of technical vectors detected in this work. Your notes are automatically persisted to your library graph.</p>
                  </div>
                )}

                {sidebarTab === 'lexicon' && (
                  <div className="space-y-6">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={lexiconSearch}
                        onChange={(e) => setLexiconSearch(e.target.value)}
                        placeholder="Define term..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button onClick={() => handleLexiconLookup()} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs">Define</button>
                    </div>
                    {isLexiconLoading && <div className="text-center py-10 animate-pulse text-xs text-indigo-400">Consulting Lexicon...</div>}
                    {lexiconResult && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-xl font-bold text-white">{lexiconResult.term}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{lexiconResult.definition}</p>
                        <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl">
                           <span className="text-[9px] font-black uppercase text-indigo-400">In this Research Context</span>
                           <p className="text-[11px] text-indigo-200 mt-2">{lexiconResult.researchContext}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sidebarTab === 'whatif' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-4 mb-4">
                      {whatIfMessages.map((m, i) => (
                        <div key={i} className={`p-4 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-indigo-600/10 border border-indigo-500/20 ml-8' : 'bg-slate-900/50 border border-slate-800 mr-8'}`}>
                           <p className="whitespace-pre-line">{m.parts[0].text}</p>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={whatIfInput}
                        onChange={(e) => setWhatIfInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleWhatIfSend()}
                        placeholder="Ask a technical 'What If'..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none"
                      />
                      <button onClick={handleWhatIfSend} disabled={isWhatIfLoading} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs">→</button>
                    </div>
                  </div>
                )}

                {sidebarTab === 'quiz' && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-white">Competence Validation</h4>
                    <p className="text-xs text-slate-500">Generate a 10-question quiz based on the technical methodology of this paper to advance your Mastery Academy rank.</p>
                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all">Generate Quiz</button>
                  </div>
                )}

                {sidebarTab === 'citations' && (
                  <div className="space-y-6">
                    <button 
                      onClick={handleEnterRabbitHole}
                      disabled={enteringRabbitHole}
                      className="w-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl"
                    >
                      {enteringRabbitHole ? 'Opening Rabbit Hole...' : '🕳️ Enter Rabbit Hole'}
                    </button>
                    <div className="space-y-3">
                      {article.references?.map((ref, idx) => (
                        <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-start group">
                           <p className="text-[10px] text-slate-300 font-medium leading-relaxed">{ref}</p>
                           <button onClick={() => handleIngestCitation(ref)} className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100">📥</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Fix: Added missing default export
export default Reader;
