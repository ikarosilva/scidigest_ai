import React, { useState } from 'react';
import { Article, Sentiment, Note, Shelf } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { GoogleGenAI, Modality } from "@google/genai";

interface ArticleCardProps {
  article: Article;
  allNotes: Note[];
  onUpdate: (id: string, updates: Partial<Article>) => void;
  onNavigateToNote: (noteId: string) => void;
  onRead: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, allNotes, onUpdate, onNavigateToNote, onRead }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showShelfMenu, setShowShelfMenu] = useState(false);

  const shelves = dbService.getData().shelves;
  const interests = dbService.getInterests();
  
  const matchedInterests = (article.tags || []).filter(tag => 
    interests.some(interest => tag.toLowerCase() === interest.toLowerCase())
  );

  const handleSummarize = async () => {
    setLoading(true);
    const result = await geminiService.summarizeArticle(article.title, article.abstract);
    setSummary(result || null);
    setLoading(false);
  };

  const handleListen = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Briefing for paper titled: ${article.title}. Context: ${article.abstract}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsPlaying(false);
        source.start();
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsPlaying(false);
    }
  };

  const sentimentColors: Record<Sentiment, string> = {
    Positive: 'bg-green-500/20 text-green-400 border-green-500/30',
    Neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Negative: 'bg-red-500/20 text-red-400 border-red-500/30',
    Unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };

  const hasGrounding = article.groundingSources && article.groundingSources.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-indigo-500/5 transition-all group/card relative flex flex-col">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded uppercase self-start">
              {article.source}
            </span>
            <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-1 rounded">
              {article.year}
            </span>
            {hasGrounding && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-1 rounded uppercase border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Grounded
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase border ${sentimentColors[article.userReviews.sentiment]}`}>
            {article.userReviews.sentiment} Reception
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Your Rating</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="10"
              value={article.rating}
              onChange={(e) => onUpdate(article.id, { rating: parseInt(e.target.value) })}
              className="w-12 text-center bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all py-1"
            />
            <span className="text-xs text-slate-500">/10</span>
          </div>
        </div>
      </div>

      <h3 onClick={onRead} className="text-lg font-bold text-slate-100 leading-tight mb-1 cursor-pointer hover:text-indigo-400 transition-colors">
        {article.title}
      </h3>
      <p className="text-xs text-slate-400 mb-3">{article.authors.join(', ')}</p>

      {summary && (
        <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-lg mb-3 animate-in fade-in slide-in-from-top-1">
           <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      )}

      {/* Grounding Source Preview */}
      {hasGrounding && (
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
           {article.groundingSources!.slice(0, 2).map((s, i) => s.web && (
             <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="shrink-0 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[9px] text-indigo-400 hover:border-indigo-500 transition-all flex items-center gap-1">
                <span>🔗</span> {s.web.title?.substring(0, 15)}...
             </a>
           ))}
        </div>
      )}

      {matchedInterests.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {matchedInterests.map(topic => (
            <span key={topic} className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-500/40 text-indigo-300 bg-indigo-500/10 flex items-center gap-1.5">
              🎯 {topic}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-800/50">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Scholar Impact</span>
          <div className="flex items-center gap-1.5 mt-0.5">
             <span className="text-sm font-bold text-indigo-400">
               {article.userReviews.citationCount?.toLocaleString() || '---'}
             </span>
             <span className="text-[10px] text-slate-500">citations</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto relative">
        <div className="flex gap-2">
          <button 
            onClick={handleSummarize}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Thinking...' : '⚡ AI Summary'}
          </button>
          <button 
            onClick={() => setShowShelfMenu(!showShelfMenu)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-indigo-400"
            title="Manage Shelves"
          >
            📂
          </button>
          <button 
            onClick={handleListen}
            className={`px-4 py-2 border rounded-lg transition-all ${isPlaying ? 'bg-indigo-500 border-indigo-400 text-white animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-indigo-400'}`}
          >
            {isPlaying ? '🔊' : '🎧'}
          </button>
          <button 
            onClick={onRead}
            className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
          >
            📖
          </button>
        </div>

        {showShelfMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 p-2 animate-in zoom-in-95 duration-150 origin-bottom">
            <div className="text-[9px] uppercase font-black text-slate-500 p-2 tracking-widest border-b border-slate-700 mb-1">Literature Shelves</div>
            {shelves.map(shelf => (
              <button
                key={shelf.id}
                onClick={() => {
                  const currentShelves = article.shelfIds || [];
                  const isCurrentlyIn = currentShelves.includes(shelf.id);
                  onUpdate(article.id, { shelfIds: isCurrentlyIn ? currentShelves.filter(id => id !== shelf.id) : [...currentShelves, shelf.id] });
                }}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shelf.color }}></div>
                   <span className="text-xs text-slate-200">{shelf.name}</span>
                </div>
                {article.shelfIds?.includes(shelf.id) && <span className="text-indigo-400 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleCard;