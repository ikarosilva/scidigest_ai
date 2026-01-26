
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

const Reader: React.FC<ReaderProps> = ({ article, notes, onNavigateToLibrary, onUpdateNote, onCreateNote, onUpdateArticle, onAddReadTime }) => {
  const [markdown, setMarkdown] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'digest' | 'notes' | 'lexicon' | 'whatif' | 'citations'>('digest');
  const [readingMode, setReadingMode] = useState<ReadingMode>('default');
  const [digest, setDigest] = useState<string | null>(null);
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (article) {
      setSessionSeconds(0);
      setIsTimerPaused(false);
      setDigest(null);
      handleGenerateDigest();
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [article?.id]);

  const handleGenerateDigest = async () => {
    if (!article) return;
    setIsDigestLoading(true);
    const result = await geminiService.summarizeArticle(article.title, article.abstract);
    setDigest(result);
    setIsDigestLoading(false);
  };

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

  if (!article) return null;

  return (
    <div className={`h-screen flex overflow-hidden transition-colors duration-500 ${
      readingMode === 'night' ? 'bg-[#1a1110] text-slate-300' : 
      readingMode === 'paper' ? 'bg-[#f4f1ea] text-slate-800' : 
      'bg-slate-950 text-slate-100'
    }`}>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={onNavigateToLibrary} className="p-2 hover:bg-white/10 rounded-lg transition-colors">← Library</button>
            <h2 className="text-sm font-bold truncate max-w-md">"{article.title}"</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-800/50 p-1 rounded-lg">
              {(['default', 'paper', 'night'] as ReadingMode[]).map(m => (
                <button key={m} onClick={() => setReadingMode(m)} className={`px-3 py-1 text-[10px] font-black uppercase rounded ${readingMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{m}</button>
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
                 <textarea value={markdown} onChange={handleMarkdownChange} placeholder="Type annotations here..." className="w-full h-[400px] bg-transparent text-lg leading-relaxed outline-none resize-none" />
              </div>
            </div>
          </div>

          <div className="w-96 bg-black/40 border-l border-slate-800/50 flex flex-col">
            <div className="p-4 border-b border-slate-800/50 flex gap-1 overflow-x-auto no-scrollbar">
               {(['digest', 'notes', 'lexicon', 'whatif', 'citations'] as const).map(tab => (
                 <button key={tab} onClick={() => setSidebarTab(tab)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sidebarTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{tab}</button>
               ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {sidebarTab === 'digest' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white">Technical Digest</h4>
                  {isDigestLoading ? <div className="animate-pulse text-xs text-indigo-400">Synthesizing core vectors...</div> : (
                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      {digest || "No digest generated."}
                    </div>
                  )}
                </div>
              )}
              {sidebarTab === 'notes' && <div className="text-xs text-slate-500">Note structure and metadata management.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reader;
