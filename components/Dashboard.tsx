
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ForceGraph2D from 'react-force-graph-2d';
import { Article } from '../types';
import { geminiService } from '../services/geminiService';

interface DashboardProps {
  articles: Article[];
  totalReadTime: number;
  onNavigate: (tab: string) => void;
  onRead: (article: Article) => void;
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ articles, totalReadTime, onNavigate, onRead, onUpdateArticle }) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Process data for charts
  const tagCounts: Record<string, number> = {};
  articles.forEach((a: Article) => {
    a.tags.forEach((t: string) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const pieData = Object.entries(tagCounts)
    .map(([name, value]: [string, number]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const ratingDistribution = Array.from({ length: 10 }, (_, i: number) => ({
    rating: i + 1,
    count: articles.filter((a: Article) => a.rating === i + 1).length
  }));

  // Network Data for Rated Articles only
  const networkData = useMemo(() => {
    const ratedArticles = articles.filter(a => a.rating > 0);
    const nodes = ratedArticles.map(a => ({
      id: a.id,
      name: a.title,
      val: 5 + a.rating,
      color: a.rating >= 8 ? '#818cf8' : '#6366f1'
    }));
    const links: any[] = [];
    
    ratedArticles.forEach(a => {
      if (a.references) {
        a.references.forEach(refTitle => {
          const target = ratedArticles.find(other => 
            other.title.toLowerCase().includes(refTitle.toLowerCase()) || 
            refTitle.toLowerCase().includes(other.title.toLowerCase())
          );
          if (target && target.id !== a.id) {
            links.push({ source: a.id, target: target.id });
          }
        });
      }
    });

    return { nodes, links };
  }, [articles]);

  const COLORS = ['#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#fb923c'];

  const calculateAverageRating = () => {
    if (!articles || articles.length === 0) return '0.0';
    const totalRating = articles.reduce((acc: number, a: Article) => acc + a.rating, 0);
    const average = totalRating / articles.length;
    return average.toFixed(1);
  };

  const formatReadTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  const handleGenerateBriefing = async () => {
    if (articles.length === 0) {
      alert("Add some articles to your library first!");
      return;
    }
    setIsGenerating(true);
    const sample = articles.filter(a => a.shelfIds.includes('default-queue')).slice(0, 10);
    const target = sample.length > 0 ? sample : articles.slice(0, 5);
    
    try {
      const summary = await geminiService.synthesizeResearch(target, []);
      setBriefing(summary || "No briefing could be generated.");
    } catch (e) {
      setBriefing("Error generating briefing. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Research Insights</h2>
          <p className="text-slate-400">Overview of your academic ingestion and learning trends.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleGenerateBriefing}
            disabled={isGenerating}
            className={`text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${isGenerating ? 'bg-slate-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}
          >
            {isGenerating ? '🧬 Synthesizing...' : '🗞️ Daily Briefing'}
          </button>
          <button 
            onClick={() => onNavigate('feed')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition-all border border-slate-700"
          >
            Check New Feeds →
          </button>
        </div>
      </header>

      {briefing && (
        <div className="bg-indigo-950/30 border border-indigo-500/30 p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500 relative">
          <button onClick={() => setBriefing(null)} className="absolute top-6 right-6 text-indigo-400 hover:text-white">✕</button>
          <div className="flex items-center gap-3 mb-6">
             <span className="text-2xl">🗞️</span>
             <div>
                <h3 className="text-xl font-bold text-indigo-300">Executive Intelligence Report</h3>
                <p className="text-xs text-indigo-500 font-medium">Meta-analysis of your current reading queue</p>
             </div>
          </div>
          <div className="prose prose-invert prose-indigo max-w-none text-indigo-100/80 text-sm leading-relaxed whitespace-pre-line font-serif italic">
             {briefing}
          </div>
          <div className="mt-8 pt-4 border-t border-indigo-500/20 flex justify-between items-center">
             <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Targeted Insights</span>
             <button onClick={() => setBriefing(null)} className="text-[10px] text-indigo-300 hover:text-white font-bold uppercase underline">Close Briefing</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
          <p className="text-sm font-medium text-slate-500 uppercase">Total Articles</p>
          <p className="text-4xl font-bold text-indigo-400 mt-2">{articles.length}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
          <p className="text-sm font-medium text-slate-500 uppercase">Avg. Rating</p>
          <p className="text-4xl font-bold text-purple-400 mt-2">
            {calculateAverageRating()}
          </p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
          <p className="text-sm font-medium text-slate-500 uppercase">Read Time</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{formatReadTime(totalReadTime)}</p>
          <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">Immersion Level: Senior</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
          <p className="text-sm font-medium text-slate-500 uppercase">Top Interest</p>
          <p className="text-4xl font-bold text-pink-400 mt-2 truncate">{pieData[0]?.name || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rated Articles Network Plot */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 h-[400px] flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
             <h3 className="text-lg font-bold text-slate-100">Rated Research Network</h3>
             <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">User Rating &gt; 0</span>
          </div>
          <div className="flex-1 bg-slate-950/50 rounded-xl overflow-hidden border border-slate-800/50">
             {networkData.nodes.length > 0 ? (
               <ForceGraph2D
                 graphData={networkData}
                 nodeLabel="name"
                 nodeColor={(n: any) => n.color}
                 nodeVal={(n: any) => n.val}
                 linkWidth={1}
                 linkColor={() => 'rgba(129, 140, 248, 0.2)'}
                 backgroundColor="transparent"
                 onNodeClick={(node: any) => {
                   const art = articles.find(a => a.id === node.id);
                   if (art) onRead(art);
                 }}
               />
             ) : (
               <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <span className="text-4xl mb-4">🕸️</span>
                  <p className="text-xs">Rate articles to see connections</p>
               </div>
             )}
          </div>
          <p className="mt-4 text-[10px] text-slate-500 italic">Visualizing citation links between your rated library entries.</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 h-[400px]">
          <h3 className="text-lg font-bold text-slate-100 mb-6">Topic Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="#1e293b"
              >
                {pieData.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                itemStyle={{ color: '#f1f5f9' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
