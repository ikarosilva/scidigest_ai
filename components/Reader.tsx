
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Article, Note, QuizStatus, ReadingMode, FeedSourceType } from '../types';
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
  const [sidebarTab, setSidebarTab] = useState<'notes' | 'intel' | 'lexicon' | 'whatif' | 'reviewer' | 'quiz' | 'citations'>('notes');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>('default');
  
  const [critique, setCritique] = useState<string | null>(null);
  const [isCritiquing, setIsCritiquing] = useState(false);
  
  const [reviewer2Output, setReviewer2Output] = useState<string | null>(null);
  const [isReviewer2Loading, setIsReviewer2Loading] = useState(false);
  
  const [aiDetection, setAiDetection] = useState<{ probability: number, assessment: string, markers: string[] } | null>(null);
  const [isDetectingAI, setIsDetectingAI] = useState(false);

  // Lexicon State
  const [lexiconSearch, setLexiconSearch] = useState('');
  const [isLexiconLoading, setIsLexiconLoading] = useState(false);
  const [lexiconResult, setLexiconResult] = useState<LexiconEntry | null>(null);
  const [lexiconHistory, setLexiconHistory] = useState<LexiconEntry[]>([]);

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
  const libraryArticles = dbService.getData().articles;

  useEffect(() => {
    if (article) {
      setSessionSeconds(0);
      setCritique(null); 
      setReviewer2Output(null);
      setAiDetection(null); 
      setQuizQuestions([]);
      setUserAnswers({});
      setQuizStep('intro');
      setQuizScore(null);
      setLexiconResult(null);
      setWhatIfMessages([]);
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
        setLexiconHistory(prev => [result, ...prev.filter(h => h.term !== result.term)].slice(0, 10));
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

  const handleSaveWhatIfAsNote = () => {
    if (!article || whatIfMessages.length === 0) return;
    
    const discussion = whatIfMessages.map(m => `**${m.role === 'user' ? 'Researcher' : 'Colleague'}**: ${m.parts[0].text}`).join('\n\n');
    const newNoteId = Math.random().toString(36).substr(2, 9);
    const newNote: Note = {
      id: newNoteId,
      title: `What If Study: ${article.title.substring(0, 30)}...`,
      content: `### Hypothetical Scenario Discussion\n\n${discussion}`,
      articleIds: [article.id],
      lastEdited: new Date().toISOString()
    };
    
    onCreateNote(newNote);
    dbService.linkNoteToArticle(newNoteId, article.id);
    alert("Colleague discussion saved to Research Notes.");
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

  const handlePerplexityCrossCheck = () => {
    if (!article) return;
    const query = encodeURIComponent(`Search for the latest data/discussions on: "${article.title}". Is there any newer version of this research or critical community consensus?`);
    window.open(`https://www.perplexity.ai/search?q=${query}`, '_blank');
  };

  const handleEnterRabbitHole = async () => {
    if (!article) return;
    setEnteringRabbitHole(true);
    try {
      const { references, groundingSources } = await geminiService.discoverReferences(article);
      onUpdateArticle(article.id, { references, groundingSources });
    } catch (err) {
      console.error(err);
      alert("Failed to enter Rabbit Hole. Ensure Search Grounding is available.");
    } finally {
      setEnteringRabbitHole(false);
    }
  };

  const handleIngestCitation = async (citationStr: string) => {
    setIngestingId(citationStr);
    try {
      const details = await geminiService.fetchArticleDetails(citationStr);
      if (details && details.title) {
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
          shelfIds: ['default-queue'],
          groundingSources: details.groundingSources,
          userReviews: {
            sentiment: 'Unknown',
            summary: 'Citation discovered via AI Rabbit Hole explorer.',
            citationCount: (details as any).citationCount || 0
          }
        };
        dbService.addArticle(newArticle);
        window.dispatchEvent(new CustomEvent('db-update'));
        alert(`"${newArticle.title}" added to your library!`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to ingest citation details.");
    } finally {
      setIngestingId(null);
    }
  };

  const findLibraryMatch = (citationStr: string) => {
    const titleOnly = citationStr.split(',')[0].toLowerCase().trim();
    return libraryArticles.find(a => 
      a.title.toLowerCase().includes(titleOnly) || 
      titleOnly.includes(a.title.toLowerCase())
    );
  };

  const handleSummonReviewer2 = async () => {
    if (!article) return;
    setIsReviewer2Loading(true);
    try {
      const result = await geminiService.reviewAsReviewer2(
        article.title, 
        article.abstract, 
        aiConfig.reviewer2Prompt
      );
      setReviewer2Output(result || "Reviewer 2 found the paper so lacking they didn't even respond.");
    } catch (err) {
      console.error(err);
      setReviewer2Output("An error occurred. Reviewer 2 is likely writing an angry rebuttal.");
    } finally {
      setIsReviewer2Loading(false);
    }
  };

  const handleSaveReviewAsNote = () => {
    if (!article || !reviewer2Output) return;
    
    const newNoteId = Math.random().toString(36).substr(2, 9);
    const newNote: Note = {
      id: newNoteId,
      title: `Adversarial Audit: ${article.title.substring(0, 30)}...`,
      content: `### Reviewer 2 Audit Output\n\n${reviewer2Output}`,
      articleIds: [article.id],
      lastEdited: new Date().toISOString()
    };
    
    onCreateNote(newNote);
    dbService.linkNoteToArticle(newNoteId, article.id);
    alert("Reviewer 2 audit saved as a research note.");
  };

  const handleGenerateCritique = async () => {
    if (!article) return;
    setIsCritiquing(true);
    try {
      const result = await geminiService.critiqueArticle(article.title, article.abstract);
      setCritique(result || "Could not generate critique.");
    } catch (err) {
      console.error(err);
      setCritique("Error generating critique.");
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

  const handleGenerateQuiz = async () => {
    if (!article) return;
    setIsGeneratingQuiz(true);
    try {
      const questions = await geminiService.generateQuiz(article.title, article.abstract);
      if (questions && questions.length > 0) {
        setQuizQuestions(questions);
        setQuizStep('active');
        setUserAnswers({});
      } else {
        alert("Could not generate a quiz for this article.");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating quiz.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleQuizFinish = () => {
    if (!article || quizQuestions.length === 0) return;
    
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        score++;
      }
    });

    const status: QuizStatus = score >= 7 ? 'pass' : 'fail';
    setQuizScore(score);
    setQuizStep('results');
    onUpdateArticle(article.id, { quizStatus: status });
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleTabToggle = (tab: typeof sidebarTab) => {
    if (sidebarTab === tab) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setSidebarTab(tab);
      setIsSidebarOpen(true);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFilterStyle = (): React.CSSProperties => {
    switch (readingMode) {
      case 'paper':
        return { backgroundColor: 'rgba(244, 236, 216, 0.15)', mixBlendMode: 'multiply' };
      case 'night':
        return { backgroundColor: 'rgba(255, 100, 0, 0.1)', mixBlendMode: 'multiply' };
      default:
        return { display: 'none' };
    }
  };

  const getReaderClasses = () => {
    switch (readingMode) {
      case 'paper':
        return 'bg-[#f4ecd8]';
      case 'night':
        return 'bg-[#1a1110]';
      default:
        return 'bg-slate-900';
    }
  };

  const getTextClasses = () => {
    switch (readingMode) {
      case 'paper':
        return 'text-[#5b4636]';
      case 'night':
        return 'text-[#d48a85]';
      default:
        return 'text-slate-300';
    }
  };

  const containerClasses = `flex flex-col h-full space-y-4 ${isMaximized ? 'fixed inset-0 z-[100] p-8 bg-slate-950' : ''}`;

  if (!article) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
        <span className="text-5xl mb-4">📖</span>
        <h3 className="text-xl font-bold text-slate-100">No article selected</h3>
        <p className="text-slate-400 max-w-xs mt-2 text-sm">Select a paper from your library to start reading and annotating.</p>
        <button onClick={onNavigateToLibrary} className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 shadow-xl shadow-indigo-600/20">Go to Library</button>
      </div>
    );
  }

  const tabButtons = [
    { id: 'notes', label: 'Notes', icon: '✍️', color: 'indigo' },
    { id: 'intel', label: 'Intel', icon: '📡', color: 'emerald' },
    { id: 'lexicon', label: 'Lexicon', icon: '📖', color: 'indigo' },
    { id: 'whatif', label: 'What If', icon: '💡', color: 'amber' },
    { id: 'citations', label: 'Rabbit Hole', icon: '🐇', color: 'indigo' },
    { id: 'reviewer', label: 'Reviewer 2', icon: '👿', color: 'red' },
    { id: 'quiz', label: 'Quiz', icon: '🎓', color: 'indigo' },
  ] as const;

  return (
    <div className={containerClasses}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest px-2 py-0.5 rounded flex-shrink-0">Reader</span>
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
            <h2 className="text-sm font-bold text-slate-100 truncate ml-auto opacity-70 italic">"{article.title}"</h2>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
               {tabButtons.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => handleTabToggle(tab.id)}
                   className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                     isSidebarOpen && sidebarTab === tab.id 
                       ? `bg-indigo-600 text-white shadow-lg` 
                       : 'text-slate-500 hover:text-slate-300'
                   }`}
                 >
                   <span>{tab.icon}</span>
                   <span className="hidden lg:inline">{tab.label}</span>
                 </button>
               ))}
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
             <button 
               onClick={() => setReadingMode('default')}
               className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${readingMode === 'default' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Normal
             </button>
             <button 
               onClick={() => setReadingMode('paper')}
               className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${readingMode === 'paper' ? 'bg-amber-100 text-amber-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Paper
             </button>
             <button 
               onClick={() => setReadingMode('night')}
               className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${readingMode === 'night' ? 'bg-orange-950 text-orange-400 shadow-md border border-orange-500/30' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Night
             </button>
          </div>

          <button 
            onClick={toggleMaximize}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold p-2.5 rounded-xl transition-all border border-slate-700"
            title={isMaximized ? "Exit Maximize" : "Maximize Screen"}
          >
            {isMaximized ? "縮" : "全"}
          </button>
          <button 
            onClick={handleOpenExternal}
            className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-indigo-500/20 flex items-center gap-2"
          >
            <span>🚀</span> Host App
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-4 overflow-hidden relative">
        {/* Main PDF Content (Left Side - Maximized width) */}
        <div className={`flex-1 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative ${getReaderClasses()}`}>
          <div 
            className="absolute inset-0 pointer-events-none z-10 transition-colors duration-500" 
            style={getFilterStyle()}
          />
          
          {article.pdfUrl ? (
            <iframe 
              src={`${article.pdfUrl}#toolbar=0`}
              className={`w-full h-full border-none transition-all duration-500 ${readingMode === 'night' ? 'invert hue-rotate-180 brightness-90 contrast-110' : ''}`}
              title={article.title}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-slate-950/50">
              <div className="text-6xl mb-4">🔍</div>
              <h4 className="text-xl font-bold text-slate-300">PDF Not Found</h4>
              <button 
                onClick={handleOpenExternal}
                className="mt-6 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold px-6 py-2.5 rounded-xl border border-indigo-500/20"
              >
                Search Scholarship
              </button>
            </div>
          )}
        </div>

        {/* Intelligence Side Window (Right Side - Controlled width) */}
        <div 
          className={`flex flex-col border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-[400px] opacity-100' : 'w-0 opacity-0 pointer-events-none'
          } ${getReaderClasses()}`}
        >
          {isSidebarOpen && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {tabButtons.find(t => t.id === sidebarTab)?.label}
                 </h3>
                 <button onClick={() => setIsSidebarOpen(false)} className="text-slate-600 hover:text-white transition-colors">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sidebarTab === 'notes' && (
                  <textarea
                    value={markdown}
                    onChange={handleMarkdownChange}
                    onSelect={handleTextareaSelect}
                    placeholder="Start typing your Markdown annotations here..."
                    className={`w-full h-full p-6 text-sm outline-none border-none resize-none font-mono leading-relaxed transition-colors duration-500 bg-transparent ${getTextClasses()}`}
                  />
                )}

                {sidebarTab === 'lexicon' && (
                  <div className="p-6 space-y-6 pb-20">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Quick Term Lookup</label>
                       <div className="flex gap-2">
                          <input 
                            type="text"
                            value={lexiconSearch}
                            onChange={(e) => setLexiconSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLexiconLookup()}
                            placeholder="Type or select from notes..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button 
                            onClick={() => handleLexiconLookup()}
                            disabled={isLexiconLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase px-4 rounded-xl shadow-lg transition-all"
                          >
                            {isLexiconLoading ? '...' : '🔍'}
                          </button>
                       </div>
                       <p className="text-[9px] text-slate-600 italic">Tip: Selecting text in your notes will auto-fill this box.</p>
                    </div>

                    {lexiconResult ? (
                      <div className="bg-slate-950/40 border border-indigo-500/20 rounded-2xl p-6 space-y-4 shadow-inner">
                         <div className="flex justify-between items-start">
                            <h4 className="text-lg font-black text-indigo-400 tracking-tight">{lexiconResult.term}</h4>
                            <span className="text-[8px] bg-indigo-500/20 text-indigo-500 px-2 py-0.5 rounded font-black uppercase tracking-widest">Scientific Definition</span>
                         </div>
                         <p className={`text-xs leading-relaxed font-serif ${getTextClasses()}`}>{lexiconResult.definition}</p>
                         <div className="pt-3 border-t border-slate-800">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Research Context</span>
                            <p className="text-[11px] text-slate-400 italic leading-relaxed">{lexiconResult.researchContext}</p>
                         </div>
                         <div className="pt-3">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Related Vectors</span>
                            <div className="flex flex-wrap gap-2">
                               {lexiconResult.relatedTopics.map(t => (
                                 <button key={t} onClick={() => handleLexiconLookup(t)} className="text-[9px] bg-slate-900 border border-slate-800 text-slate-500 px-2 py-1 rounded hover:border-indigo-500 transition-colors">
                                   {t}
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>
                    ) : !isLexiconLoading && (
                      <div className="text-center py-12 opacity-30">
                        <span className="text-4xl block mb-4">📖</span>
                        <p className="text-xs">Enter a technical term to see its scientific blueprint.</p>
                      </div>
                    )}

                    {lexiconHistory.length > 1 && (
                      <div className="space-y-3 mt-8">
                         <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Recent Lexicon Queries</span>
                         <div className="flex flex-col gap-2">
                            {lexiconHistory.slice(1).map((h, i) => (
                              <button 
                                key={i} 
                                onClick={() => setLexiconResult(h)}
                                className="text-left p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all group"
                              >
                                <span className="text-[11px] font-bold text-slate-400 group-hover:text-indigo-400">{h.term}</span>
                              </button>
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {sidebarTab === 'whatif' && (
                  <div className="flex flex-col h-full bg-slate-950/20">
                     <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">Exploring Hypotheticals</p>
                        <button 
                          onClick={handleSaveWhatIfAsNote}
                          disabled={whatIfMessages.length === 0}
                          className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-30"
                        >
                          Save to Notes
                        </button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {whatIfMessages.length === 0 && (
                          <div className="text-center py-12 opacity-40">
                             <span className="text-4xl block mb-4">💡</span>
                             <p className="text-xs max-w-[200px] mx-auto">Ask your colleague hypothetical "What if" questions about the paper's methodology or results.</p>
                          </div>
                        )}
                        {whatIfMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                               msg.role === 'user' 
                               ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' 
                               : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                             }`}>
                                {msg.parts[0].text}
                             </div>
                          </div>
                        ))}
                        {isWhatIfLoading && (
                          <div className="flex justify-start">
                             <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700">
                                <div className="flex gap-1">
                                   <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                                   <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                   <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                             </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                     </div>

                     <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                        <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
                           <input 
                             type="text"
                             value={whatIfInput}
                             onChange={(e) => setWhatIfInput(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleWhatIfSend()}
                             placeholder="What if we used X instead of Y?"
                             className="flex-1 bg-transparent text-xs text-slate-200 p-2.5 outline-none"
                           />
                           <button 
                             onClick={handleWhatIfSend}
                             disabled={!whatIfInput.trim() || isWhatIfLoading}
                             className="bg-amber-600 hover:bg-amber-700 text-white px-3 rounded-lg transition-all disabled:opacity-30 shadow-lg"
                           >
                              ➤
                           </button>
                        </div>
                     </div>
                  </div>
                )}

                {sidebarTab === 'citations' && (
                  <div className="p-6 space-y-6 pb-20">
                    <header className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-xl shrink-0">🐇</div>
                        <div>
                          <h4 className="text-sm font-bold text-indigo-400">Rabbit Hole Explorer</h4>
                        </div>
                      </div>
                      {!article.references?.length && (
                        <button 
                          onClick={handleEnterRabbitHole}
                          disabled={enteringRabbitHole}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
                        >
                          {enteringRabbitHole ? 'Diving...' : 'Enter Rabbit Hole'}
                        </button>
                      )}
                    </header>

                    {article.groundingSources && article.groundingSources.length > 0 && (
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Grounding Sources</p>
                        {article.groundingSources.map((source: any, idx: number) => (
                          source.web && (
                            <a key={idx} href={source.web.uri} target="_blank" rel="noreferrer" className="block text-[10px] text-indigo-400 hover:underline truncate">
                              {source.web.title || source.web.uri}
                            </a>
                          )
                        ))}
                      </div>
                    )}

                    {article.references?.length ? (
                      <div className="space-y-3">
                        {article.references.map((citation, idx) => {
                          const match = findLibraryMatch(citation);
                          const isIngesting = ingestingId === citation;
                          
                          return (
                            <div key={idx} className={`p-4 rounded-2xl border transition-all ${match ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-slate-950/40 border-slate-800'}`}>
                               <p className={`text-[11px] font-medium leading-relaxed mb-3 ${getTextClasses()}`}>{citation}</p>
                               <div className="flex justify-between items-center">
                                  {match ? (
                                    <button 
                                      onClick={() => alert(`Paper "${match.title}" is already in your library.`)}
                                      className="text-[10px] bg-indigo-600 text-white font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg shadow-lg"
                                    >
                                      📖 In Library
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => handleIngestCitation(citation)}
                                      disabled={isIngesting}
                                      className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg transition-all ${isIngesting ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 text-indigo-400 hover:bg-indigo-500 hover:text-white'}`}
                                    >
                                      {isIngesting ? '🔍 Hydrating...' : '📥 Ingest'}
                                    </button>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-20 opacity-40">
                         <span className="text-4xl block mb-4">🕳️</span>
                         <p className="text-xs">No path found yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {sidebarTab === 'quiz' && (
                  <div className="p-6 space-y-6 pb-20">
                    {quizStep === 'intro' && (
                      <div className="text-center py-12 space-y-6">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-3xl mx-auto">🎓</div>
                        <p className="text-xs text-slate-500 italic px-4 leading-relaxed">
                          "Internalize the methodology through conceptual validation."
                        </p>
                        <button 
                          onClick={handleGenerateQuiz}
                          disabled={isGeneratingQuiz}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest py-3 px-8 rounded-2xl shadow-xl transition-all"
                        >
                          {isGeneratingQuiz ? "Constructing Exam..." : "Generate 10-Question Quiz"}
                        </button>
                      </div>
                    )}

                    {quizStep === 'active' && (
                      <div className="space-y-8">
                        {quizQuestions.map((q, qIdx) => (
                          <div key={qIdx} className="space-y-4">
                            <p className={`text-xs font-bold leading-relaxed ${getTextClasses()}`}>
                              <span className="text-indigo-500 mr-2">{qIdx + 1}.</span> {q.question}
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              {q.options.map((opt, oIdx) => (
                                <button
                                  key={oIdx}
                                  onClick={() => setUserAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                  className={`text-left p-3 rounded-xl text-[11px] border transition-all ${
                                    userAnswers[qIdx] === oIdx 
                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button 
                          onClick={handleQuizFinish}
                          disabled={Object.keys(userAnswers).length < 10}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-black text-[10px] uppercase py-4 rounded-2xl"
                        >
                          Submit Examination
                        </button>
                      </div>
                    )}

                    {quizStep === 'results' && (
                      <div className="text-center py-12 space-y-8">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl shadow-2xl border-4 ${quizScore! >= 7 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                           {quizScore! >= 7 ? '🏆' : '📚'}
                        </div>
                        <h3 className={`text-2xl font-black uppercase tracking-widest mt-4 ${quizScore! >= 7 ? 'text-emerald-400' : 'text-red-400'}`}>
                           {quizScore! >= 7 ? 'PASSED' : 'FAILED'}
                        </h3>
                        <p className="text-sm font-bold text-slate-500">You scored {quizScore} / 10</p>
                        <button 
                           onClick={() => setQuizStep('intro')}
                           className="w-full bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase py-3 rounded-xl"
                        >
                           Retake Exam
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {sidebarTab === 'reviewer' && (
                  <div className="p-6 space-y-6 pb-20">
                    <header className="bg-red-900/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-xl shrink-0">👿</div>
                      <div>
                        <h4 className="text-sm font-bold text-red-400">Reviewer 2 Protocol</h4>
                      </div>
                    </header>

                    {!reviewer2Output && !isReviewer2Loading ? (
                      <div className="text-center py-12">
                        <p className="text-xs text-slate-500 mb-6 italic">"Your methodology is likely derivative..."</p>
                        <button 
                          onClick={handleSummonReviewer2}
                          className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest py-3 px-6 rounded-2xl"
                        >
                          Summon Reviewer 2
                        </button>
                      </div>
                    ) : isReviewer2Loading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-red-500/10 border-t-red-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] text-red-400 font-black uppercase tracking-widest animate-pulse">Finding reasons to reject...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-slate-950/60 border border-red-500/20 p-5 rounded-2xl text-xs text-slate-300 leading-relaxed whitespace-pre-line font-serif shadow-inner">
                          {reviewer2Output}
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={handleSaveReviewAsNote}
                             className="flex-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl border border-slate-700 transition-all"
                           >
                             Save as Note
                           </button>
                           <button 
                             onClick={handleSummonReviewer2} 
                             className="flex-1 text-[10px] text-slate-500 hover:text-red-400 font-bold uppercase py-3 rounded-xl border border-slate-800"
                           >
                             Re-Review
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sidebarTab === 'intel' && (
                  <div className="p-6 space-y-8 pb-20">
                    <section>
                       <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">Critical Appraisal</h4>
                       {!critique && !isCritiquing ? (
                         <div className="bg-slate-950/50 border border-dashed border-slate-800 p-6 rounded-2xl text-center">
                            <button 
                              onClick={handleGenerateCritique}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase py-2 px-4 rounded-xl"
                            >
                              Generate Critique
                            </button>
                         </div>
                       ) : isCritiquing ? (
                         <div className="flex flex-col items-center gap-4 py-10">
                            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                         </div>
                       ) : (
                         <div className="bg-slate-950/60 p-5 rounded-2xl border border-emerald-500/20 text-xs text-slate-300 leading-relaxed relative">
                            {critique}
                         </div>
                       )}
                    </section>

                    <section>
                       <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">AI Probability</h4>
                       {!aiDetection && !isDetectingAI ? (
                         <button 
                           onClick={handleDetectAI}
                           className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-xl text-xs text-slate-400"
                         >
                           Scan for AI Markers
                         </button>
                       ) : isDetectingAI ? (
                         <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div></div>
                       ) : aiDetection && (
                         <div className="bg-slate-950/60 p-5 rounded-2xl border border-amber-500/20 space-y-3">
                            <div className="flex items-center justify-between mb-1">
                               <span className="text-[10px] font-black uppercase text-slate-500">Probability</span>
                               <span className="text-xs font-black text-amber-400">{aiDetection.probability}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                               <div className="h-full bg-amber-500" style={{ width: `${aiDetection.probability}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-200 italic">{aiDetection.assessment}</p>
                         </div>
                       )}
                    </section>

                    <section>
                       <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">Grounding</h4>
                       <div className="space-y-3">
                          <button onClick={handlePerplexityCrossCheck} className="w-full bg-slate-950/40 border border-slate-800 p-4 rounded-xl text-left flex items-center justify-between group">
                             <span className="text-[11px] font-bold text-slate-300">Perplexity Deep Dive</span>
                             <span className="text-slate-600 group-hover:text-emerald-400 transition-colors">↗</span>
                          </button>
                          <button onClick={() => window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`, '_blank')} className="w-full bg-slate-950/40 border border-slate-800 p-4 rounded-xl text-left flex items-center justify-between group">
                             <span className="text-[11px] font-bold text-slate-300">Google Scholar</span>
                             <span className="text-slate-600 group-hover:text-indigo-400 transition-colors">↗</span>
                          </button>
                       </div>
                    </section>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reader;
