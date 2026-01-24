
import React, { useState } from 'react';
import { Note, Article } from '../types';
import { dbService } from '../services/dbService';

interface NotesSectionProps {
  notes: Note[];
  articles: Article[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onNavigateToArticle: (id: string) => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  articles,
  activeNoteId,
  setActiveNoteId,
  onUpdate,
  onCreate,
  onDelete,
  onNavigateToArticle
}) => {
  const activeNote = notes.find(n => n.id === activeNoteId);
  const [showArticlePicker, setShowArticlePicker] = useState(false);

  const handleLinkArticle = (articleId: string) => {
    if (activeNoteId) {
      dbService.linkNoteToArticle(activeNoteId, articleId);
      // Data state is updated in App.tsx via dbService calls within components 
      // but standard React flow suggests passing these back up. 
      // For simplicity here, we assume the App level state refreshes.
      window.location.reload(); // Refresh to ensure bidirectional consistency
    }
  };

  const handleUnlinkArticle = (articleId: string) => {
    if (activeNoteId) {
      dbService.unlinkNoteFromArticle(activeNoteId, articleId);
      window.location.reload();
    }
  };

  return (
    <div className="flex h-[calc(100vh-160px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Notes Sidebar */}
      <div className="w-80 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-200">Notes</h3>
          <button 
            onClick={onCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={`w-full text-left p-3 rounded-xl transition-all group ${
                activeNoteId === note.id ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm font-semibold truncate ${activeNoteId === note.id ? 'text-indigo-300' : 'text-slate-300'}`}>
                  {note.title || 'Untitled Note'}
                </span>
                {activeNoteId === note.id && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {new Date(note.lastEdited).toLocaleDateString()} • {note.articleIds.length} papers
              </p>
            </button>
          ))}
          {notes.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-600 italic">No notes created yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col shadow-xl overflow-hidden relative">
        {activeNote ? (
          <>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <input 
                type="text"
                value={activeNote.title}
                onChange={(e) => onUpdate(activeNote.id, { title: e.target.value, lastEdited: new Date().toISOString() })}
                className="bg-transparent text-xl font-bold text-slate-100 outline-none border-none flex-1"
                placeholder="Note Title"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowArticlePicker(!showArticlePicker)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                >
                  🔗 Link Article
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <textarea 
                value={activeNote.content}
                onChange={(e) => onUpdate(activeNote.id, { content: e.target.value, lastEdited: new Date().toISOString() })}
                className="w-full h-full bg-transparent text-slate-300 outline-none border-none resize-none font-sans leading-relaxed"
                placeholder="Start writing your research insights here..."
              />
            </div>

            {/* Linked Articles Bar */}
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex flex-wrap gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest w-full mb-1">Linked Research</span>
              {activeNote.articleIds.map(aid => {
                const article = articles.find(a => a.id === aid);
                return (
                  <div key={aid} className="group flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                    <button 
                      onClick={() => onNavigateToArticle(aid)}
                      className="text-[11px] font-semibold text-indigo-300 hover:text-white"
                    >
                      {article ? article.title.substring(0, 30) + '...' : 'Unknown Paper'}
                    </button>
                    <button 
                      onClick={() => handleUnlinkArticle(aid)}
                      className="text-indigo-500/40 hover:text-red-400 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {activeNote.articleIds.length === 0 && (
                <p className="text-[11px] text-slate-600 italic">No papers linked to this note.</p>
              )}
            </div>

            {/* Article Picker Modal */}
            {showArticlePicker && (
              <div className="absolute top-20 right-6 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 p-4 max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white">Select Article to Link</h4>
                  <button onClick={() => setShowArticlePicker(false)} className="text-slate-500 hover:text-white">✕</button>
                </div>
                <div className="space-y-2">
                  {articles.filter(a => !activeNote.articleIds.includes(a.id)).map(a => (
                    <button
                      key={a.id}
                      onClick={() => { handleLinkArticle(a.id); setShowArticlePicker(false); }}
                      className="w-full text-left p-3 rounded-xl bg-slate-900/50 hover:bg-indigo-600/20 border border-slate-700 text-xs text-slate-300 transition-all"
                    >
                      {a.title}
                    </button>
                  ))}
                  {articles.filter(a => !activeNote.articleIds.includes(a.id)).length === 0 && (
                    <p className="text-center text-xs text-slate-500 py-4">All library papers already linked.</p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-50">
            <span className="text-5xl mb-4">📝</span>
            <h3 className="text-xl font-bold text-slate-100">Select a note to read</h3>
            <p className="text-slate-400 max-w-xs mt-2 text-sm">Create organized research summaries, link multiple papers, and build your scientific thesis.</p>
            <button onClick={onCreate} className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105">Create Your First Note</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesSection;
