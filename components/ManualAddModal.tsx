
import React, { useState, useRef, useEffect } from 'react';
import { Article, FeedSourceType } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { pdfStorageService } from '../services/pdfStorageService';

interface ManualAddModalProps {
  onClose: () => void;
  onAdd: (article: Article) => void;
  existingInterests: string[];
  onUpdateInterests: (interests: string[]) => void;
}

const ManualAddModal: React.FC<ManualAddModalProps> = ({ onClose, onAdd, existingInterests, onUpdateInterests }) => {
  const [loading, setLoading] = useState(false);
  const [pdfStorageId, setPdfStorageId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    abstract: '',
    pdfUrl: '',
    year: new Date().getFullYear().toString()
  });
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [newTopics, setNewTopics] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    // Chunked conversion to avoid call-stack / memory spikes on mobile.
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // 32KB
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

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
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer | null;
        if (!arrayBuffer) throw new Error("File reader returned null result.");

        // Always allow local PDF viewing, even if Gemini is unavailable.
        const fallbackTitle = file.name.replace(/\.pdf$/i, '');
        const pdfStorageId = `pdf-${Math.random().toString(36).slice(2, 11)}`;
        const blob = new Blob([arrayBuffer], { type: file.type || 'application/pdf' });

        // Store large binary in IndexedDB (local-first, avoids localStorage quota issues on tablets).
        await pdfStorageService.putPdf({ id: pdfStorageId, blob, name: file.name });
        dbService.addLog('info', 'Local PDF stored for manual add', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          pdfStorageId,
          userAgent: window.navigator.userAgent
        });
        setPdfStorageId(pdfStorageId);

        // If no Gemini API key is configured in the frontend, skip AI entirely.
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
        if (!apiKey) {
          setFormData({
            title: fallbackTitle,
            authors: '',
            abstract: '',
            year: formData.year,
            pdfUrl: '',
          });
          setProcessingStatus('PDF loaded. Configure Gemini to enable automatic metadata extraction (optional).');
          return;
        }

        // Try Gemini-based metadata extraction as an enhancement only.
        setProcessingStatus('Consulting Research Assistant (Gemini Pro)...');
        try {
          // Gemini expects base64. Convert efficiently without going through a giant `data:` URL.
          const base64 = arrayBufferToBase64(arrayBuffer);
          const metadata = await geminiService.extractMetadataFromPDF(base64);
          
          if (metadata && metadata.title) {
            const authors = Array.isArray(metadata.authors) ? metadata.authors.join(', ') : (metadata.authors || '');
            setFormData({
              title: metadata.title || fallbackTitle,
              authors,
              abstract: metadata.abstract || '',
              year: String(metadata.year || formData.year),
              pdfUrl: '',
            });
            await triggerAutoAnalysis(metadata.title, metadata.abstract || '');
          } else {
            dbService.addLog('warning', `PDF extraction returned no title for file: ${file.name}`);
            setFormData({
              title: fallbackTitle,
              authors: '',
              abstract: '',
              year: formData.year,
              pdfUrl: '',
            });
            setProcessingStatus('AI enrichment unavailable. Using basic PDF import.');
          }
        } catch (aiErr: any) {
          // Gemini failed for some other reason. Log but still allow viewing the PDF.
          const errorMsg = aiErr?.message || String(aiErr);
          dbService.addLog('error', `Local PDF AI Enrichment Error: ${errorMsg}`);
          setFormData({
            title: fallbackTitle,
            authors: '',
            abstract: '',
            year: formData.year,
            pdfUrl: '',
          });
          setProcessingStatus('AI enrichment failed. PDF loaded with basic metadata.');
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.error("PDF Processing Error:", err);
        dbService.addLog('error', `Local PDF Processing Error: ${errorMsg}`);
        alert(`Internal error during PDF file reading: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = (err) => {
      console.error("File Reader Error:", err);
      dbService.addLog('error', `Browser FileReader failed for ${file.name}`);
      alert("Failed to read the local file.");
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // URL/DOI/arXiv lookup has been removed; ingestion is now PDF-file only.

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
      pdfStorageId: pdfStorageId || undefined,
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
            <h3 className="text-xl font-bold text-white">Add Paper (PDF File)</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Local PDF Ingestion Only</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
        </header>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">{processingStatus}</p>
            </div>
          ) : (
            <>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer transition-all"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
                <span className="text-3xl block mb-2">📄</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Scientific PDF</p>
                <p className="text-[10px] text-slate-600 mt-2">Maximum metadata recovery enabled (Pro Model)</p>
              </div>

              <div className="space-y-4">
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
