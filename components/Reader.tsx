
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Article, Note } from '../types';

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
  
  const timerRef = useRef<number | null>(null);

  // Read Time Tracker
  useEffect(() => {
    if (article) {
      setSessionSeconds(0);
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

  // Sync session time to DB on unmount or article change
  useEffect(() => {
    return () => {
      if (article && sessionSeconds > 0) {
        onAddReadTime(article.id, sessionSeconds);
      }
    };
  }, [article?.id, sessionSeconds, onAddReadTime]);

  // Load existing note or clear
  useEffect(() => {
    if (article) {
      // Find a note specifically linked to this article
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

  // Handle markdown changes with auto-save
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
      // Create new note for this article
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
            onClick={toggleMaximize}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold p-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-2 group"
            title={isMaximized ? "Exit Maximize" : "Maximize Screen"}
          >
            {isMaximized ? "縮" : "全"}
          </button>
          <button 
            onClick={handleOpenExternal}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-2 group"
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
        {/* PDF View (70%) */}
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
          
          <div className="absolute top-4 right-4 text-[10px] text-slate-700 font-black uppercase tracking-widest pointer-events-none opacity-20">
            SciDigest Professional Reader
          </div>
        </div>

        {/* Markdown Annotations (30%) */}
        <div className="flex-[3] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <span>✍️</span> Annotations
            </h3>
            {activeNoteId && (
              <span className="text-[9px] text-emerald-500 font-bold animate-pulse">● Auto-saved</span>
            )}
          </div>
          <div className="flex-1 p-0">
            <textarea
              value={markdown}
              onChange={handleMarkdownChange}
              placeholder="Start typing your Markdown annotations here... Your notes are automatically saved to your Research Notes library."
              className="w-full h-full bg-slate-950 p-6 text-sm text-slate-300 outline-none border-none resize-none font-mono leading-relaxed placeholder:text-slate-700"
            />
          </div>
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
            <span className="text-[9px] text-slate-600 font-bold uppercase">Markdown Editor</span>
            <span className="text-[9px] text-slate-600 font-medium">Linked to Research Notes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reader;
