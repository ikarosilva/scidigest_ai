
import React, { useState, useRef, useEffect } from 'react';
import { Article, FeedSourceType } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface ManualAddModalProps {
  onClose: () => void;
  onAdd: (article: Article) => void;
  existingInterests: string[];
  onUpdateInterests: (interests: string[]) => void;
}

const ManualAddModal: React.FC<ManualAddModalProps> = ({ onClose, onAdd, existingInterests, onUpdateInterests }) => {
  const [mode, setMode] = useState<'form' | 'file' | 'url'>('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    abstract: '',
    pdfUrl: '',
    year: new Date().getFullYear().toString()
  });
  const [urlInput, setUrlInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [newTopics, setNewTopics] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerAutoAnalysis = async (title: string, abstract: string) => {
    if (!title || !abstract) return;
    setProcessingStatus('Analyzing research vectors...');
    const analysis = await geminiService.suggestTagsAndTopics(title, abstract, existingInterests);
    setSuggestedTags(analysis.tags || []);
    setNewTopics(analysis.newTopics || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProcessingStatus('Reading PDF architecture...');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      const metadata = await geminiService.extractMetadataFromPDF(base64);
      if (metadata) {
        const authors = (metadata.authors || []).join(', ');
        setFormData({
          title: metadata.title || '',
          authors,
          abstract: metadata.abstract || '',
          year: metadata.year || formData.year,
          pdfUrl: ''
        });
        await triggerAutoAnalysis(metadata.title, metadata.abstract);
        setMode('form');
      } else {
        alert("Failed to extract metadata. Please fill manually.");
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlIngest = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setProcessingStatus('Grounding URL against academic repositories...');
    
    try {
      const details = await geminiService.fetchArticleDetails(urlInput);
      if (details && details.title) {
        setFormData({
          title: details.title,
          authors: (details.authors || []).join(', '),
          abstract: details.abstract || '',
          year: details.year || formData.year,
          pdfUrl: details.pdfUrl || urlInput
        });
        await triggerAutoAnalysis(details.title, details.abstract);
        setMode('form');
      } else {
        alert("Could not retrieve metadata for this URL. Please verify the link.");
      }
    } catch (err) {
      alert("Search grounding failed. Try manual entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!formData.title.trim()) return;

    const newArticle: Article = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      authors: formData.authors.split(',').map(s => s.trim()),
      abstract: formData.abstract,
      date: `${formData.year}-01-01`,
      year: formData.year,
      source: FeedSourceType.MANUAL,
      rating: 0,
      pdfUrl: formData.pdfUrl || undefined,
      tags: suggestedTags.length > 0 ? suggestedTags : ['Manual Ingestion'],
      isBookmarked: false,
      notes: '',
      noteIds: [],
      userReadTime: 0,
      shelfIds: ['default-queue'],
      userReviews: {
        sentiment: 'Unknown',
        summary: 'Manually ingested paper.',
        citationCount: 0
      }
    };

    if (newTopics.length > 0) {
      const confirmAdd = confirm(`Add detected new trajectories to your profile: ${newTopics.join(', ')}?`);
      if (confirmAdd) {
        onUpdateInterests([...new Set([...existingInterests, ...newTopics])]);
      }
    }

    onAdd(newArticle);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        <header className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Ingest Scientific Paper</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Manual Entry Protocol</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
        </header>

        <div className="flex bg-slate-950 p-1 mx-6 mt-6 rounded-xl border border-slate-800">
          {(['form', 'file', 'url'] as const).map(m => (
            <button 
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {m === 'form' ? 'Manual' : m === 'file' ? 'PDF File' : 'URL Link'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">{processingStatus}</p>
            </div>
          ) : (
            <>
              {mode === 'url' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">Paste a DOI, arXiv link, or journal page. Gemini will use search grounding to extract the abstract and metadata.</p>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      placeholder="https://arxiv.org/abs/..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlIngest()}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button 
                      onClick={handleUrlIngest}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 rounded-xl transition-all"
                    >
                      Fetch
                    </button>
                  </div>
                </div>
              )}

              {mode === 'file' && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer transition-all"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
                  <span className="text-3xl block mb-2">📄</span>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Scientific PDF</p>
                  <p className="text-[10px] text-slate-600 mt-2">Maximum metadata recovery enabled</p>
                </div>
              )}

              <div className={`space-y-4 ${mode !== 'form' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-600 mb-1 block tracking-widest">Article Title</label>
                    <input 
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Identify the core research title..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-black text-slate-600 mb-1 block tracking-widest">Authors</label>
                      <input 
                        type="text"
                        value={formData.authors}
                        onChange={(e) => setFormData({...formData, authors: e.target.value})}
                        placeholder="Vaswani, et al."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-black text-slate-600 mb-1 block tracking-widest">Year</label>
                      <input 
                        type="text"
                        value={formData.year}
                        onChange={(e) => setFormData({...formData, year: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-600 mb-1 block tracking-widest">Abstract</label>
                    <textarea 
                      value={formData.abstract}
                      onChange={(e) => setFormData({...formData, abstract: e.target.value})}
                      placeholder="Technical overview for indexing..."
                      className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">AI Discovered Trajectories</span>
                    {formData.title && !suggestedTags.length && (
                       <button onClick={() => triggerAutoAnalysis(formData.title, formData.abstract)} className="text-[9px] font-bold text-indigo-400">Scan for Topics</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map(tag => (
                      <span key={tag} className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-bold">
                        {tag}
                        {newTopics.includes(tag) && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded uppercase">New</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="p-6 border-t border-slate-800 bg-slate-950 flex gap-3">
           <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl transition-all">Discard</button>
           <button 
             onClick={handleAdd}
             disabled={!formData.title.trim() || loading}
             className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
           >
             Commit to Library
           </button>
        </footer>
      </div>
    </div>
  );
};

export default ManualAddModal;
