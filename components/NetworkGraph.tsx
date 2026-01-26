
import React, { useMemo, useState, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Article, Note, Book, NetworkViewMode, SocialProfiles } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface NetworkGraphProps {
  articles: Article[];
  notes: Note[];
  books?: Book[];
  focusNodeId?: string | null;
  onClearFocus?: () => void;
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onNavigateToArticle: (id: string) => void;
  onNavigateToNote: (id: string) => void;
  authorNetworkData: any;
  onSyncScholar: () => void;
  isSyncingScholar: boolean;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ 
  articles, 
  notes, 
  books = [],
  focusNodeId,
  onClearFocus,
  onUpdateArticle,
  onNavigateToArticle,
  onNavigateToNote,
  authorNetworkData,
  onSyncScholar,
  isSyncingScholar
}) => {
  const [viewMode, setViewMode] = useState<NetworkViewMode>('unified');
  const [isMining, setIsMining] = useState(false);
  const [miningProgress, setMiningProgress] = useState(0);
  const fgRef = useRef<any>(null);

  const data = dbService.getData();
  const interests = dbService.getInterests();

  // Set initial zoom and focus if provided
  useEffect(() => {
    if (focusNodeId && fgRef.current) {
      const node = graphData.nodes.find((n: any) => n.id === focusNodeId);
      if (node) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(2.5, 1000);
      }
    }
  }, [focusNodeId, fgRef.current, viewMode]);

  // Handle local switches to author view if data arrives
  useEffect(() => {
    if (authorNetworkData && !isSyncingScholar) {
      setViewMode('author');
    }
  }, [authorNetworkData]);

  // Process data into Graph format (Nodes & Links)
  const graphData = useMemo(() => {
    if (viewMode === 'author' && authorNetworkData) {
      return authorNetworkData;
    }

    const nodes: any[] = [];
    const links: any[] = [];
    
    // Topic Nodes and Links mode
    if (viewMode === 'topics') {
      interests.forEach(topic => {
        const relatedArticles = articles.filter(a => a.tags.some(t => t.toLowerCase().includes(topic.toLowerCase())));
        nodes.push({
          id: topic,
          name: topic,
          type: 'topic',
          val: 15 + relatedArticles.length,
          color: '#f43f5e'
        });
      });

      const edgeWeights: Record<string, { count: number; articles: string[] }> = {};
      articles.forEach(article => {
        const articleTopics = interests.filter(topic => 
          article.tags.some(tag => tag.toLowerCase().includes(topic.toLowerCase()))
        );
        for (let i = 0; i < articleTopics.length; i++) {
          for (let j = i + 1; j < articleTopics.length; j++) {
            const pair = [articleTopics[i], articleTopics[j]].sort().join(' <-> ');
            if (!edgeWeights[pair]) edgeWeights[pair] = { count: 0, articles: [] };
            edgeWeights[pair].count += 1;
            edgeWeights[pair].articles.push(article.title);
          }
        }
      });

      Object.entries(edgeWeights).forEach(([pair, info]) => {
        const [source, target] = pair.split(' <-> ');
        links.push({
          source, target, type: 'bridging', width: Math.min(info.count, 8),
          name: `${info.count} shared papers`,
          color: `rgba(244, 63, 94, ${Math.min(0.1 + info.count * 0.1, 0.7)})`
        });
      });
      return { nodes, links };
    }

    const uniqueDatasets = new Set<string>();
    articles.forEach(a => {
      if (a.dataLocation) uniqueDatasets.add(a.dataLocation);
      a.tags.forEach(t => { if (t.toLowerCase().includes('data') || t.toLowerCase().includes('set')) uniqueDatasets.add(t); });
    });

    const isFilterActive = !!focusNodeId;
    const activeNote = isFilterActive ? notes.find(n => n.id === focusNodeId) : null;
    const allowedArticleIds = activeNote ? new Set(activeNote.articleIds) : null;

    if (viewMode === 'articles' || viewMode === 'unified' || viewMode === 'datasets') {
      articles.forEach((article: Article) => {
        if (allowedArticleIds && !allowedArticleIds.has(article.id)) return;
        nodes.push({ id: article.id, name: article.title, type: 'article', val: 10 + (article.noteIds.length * 5), color: '#818cf8' });
        if (article.references) {
          article.references.forEach((refTitle: string) => {
            const target = articles.find((a: Article) => a.title.toLowerCase().includes(refTitle.toLowerCase()) || refTitle.toLowerCase().includes(a.title.toLowerCase()));
            if (target && (!allowedArticleIds || allowedArticleIds.has(target.id))) {
              links.push({ source: article.id, target: target.id, type: 'citation', color: 'rgba(129, 140, 248, 0.4)', curvature: 0.2 });
            }
          });
        }
        if (viewMode === 'datasets') {
           if (article.dataLocation) links.push({ source: article.id, target: `dataset-${article.dataLocation}`, type: 'usage', color: 'rgba(16, 185, 129, 0.3)' });
           article.tags.forEach(t => { if (uniqueDatasets.has(t)) links.push({ source: article.id, target: `dataset-${t}`, type: 'usage', color: 'rgba(16, 185, 129, 0.3)' }); });
        }
      });
    }

    if (viewMode === 'datasets') {
      uniqueDatasets.forEach(ds => nodes.push({ id: `dataset-${ds}`, name: ds, type: 'dataset', val: 20, color: '#10b981' }));
    }

    if ((viewMode === 'unified' || viewMode === 'notes') && (!allowedArticleIds)) {
      notes.forEach((note: Note) => {
        nodes.push({ id: note.id, name: note.title, type: 'note', val: 8 + (note.articleIds.length * 3), color: '#fbbf24' });
        if (viewMode === 'unified') {
          note.articleIds.forEach((articleId: string) => {
            if (articles.find((a: Article) => a.id === articleId)) links.push({ source: note.id, target: articleId, type: 'linked', color: 'rgba(251, 191, 36, 0.3)' });
          });
        }
      });
    }

    if (viewMode === 'unified' && !allowedArticleIds) {
      books.forEach((book: Book) => {
        nodes.push({ id: book.id, name: book.title, type: 'book', val: 12, color: '#f59e0b' });
        articles.forEach(art => {
           if (art.tags.find(t => book.title.toLowerCase().includes(t.toLowerCase()))) links.push({ source: art.id, target: book.id, type: 'thematic', color: 'rgba(245, 158, 11, 0.1)' });
        });
      });
    }
    return { nodes, links };
  }, [articles, notes, books, viewMode, focusNodeId, authorNetworkData, interests]);

  const handleMineCitations = async () => {
    if (isMining) return;
    setIsMining(true);
    setMiningProgress(0);
    const papersToMine = articles.filter((a: Article) => !a.references || a.references.length === 0);
    let count = 0;
    for (const article of papersToMine) {
      try {
        const { references, groundingSources } = await geminiService.discoverReferences(article);
        onUpdateArticle(article.id, { references, groundingSources });
      } catch (e) { console.error("Mining error for", article.title, e); }
      count++;
      setMiningProgress(Math.floor((count / papersToMine.length) * 100));
    }
    setIsMining(false);
    alert("Citation discovery complete. Network map updated.");
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <span>🕸️</span> Networks
          </h2>
          <p className="text-slate-400 mt-1">Visualize citations, conceptual links, and research clusters.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           {focusNodeId && (
              <button 
                onClick={onClearFocus}
                className="bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Clear Dataset Filter ✕
              </button>
           )}
           <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex overflow-x-auto max-w-sm md:max-w-none">
             {(['notes', 'articles', 'topics', 'unified', 'datasets', 'author'] as NetworkViewMode[]).map((mode: NetworkViewMode) => (
               <button
                 key={mode}
                 onClick={() => setViewMode(mode)}
                 className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                   viewMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                 }`}
               >
                 {mode === 'author' ? 'My Articles' : mode.charAt(0).toUpperCase() + mode.slice(1)}
               </button>
             ))}
           </div>
           
           <div className="flex gap-2">
             <button 
               onClick={onSyncScholar}
               disabled={isSyncingScholar}
               className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                 isSyncingScholar ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
               }`}
             >
               {isSyncingScholar ? 'Crawl & Cluster...' : '🎓 Sync Scholar'}
             </button>
             <button 
               onClick={handleMineCitations}
               disabled={isMining}
               className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                 isMining ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-indigo-400 border border-indigo-500/20 hover:bg-slate-700'
               }`}
             >
               {isMining ? (
                 <>
                   <span className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
                   Mining... {miningProgress}%
                 </>
               ) : (
                 <>🔍 Discover Citations</>
               )}
             </button>
           </div>
        </div>
      </header>

      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
        {(graphData.nodes.length === 0) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
             <span className="text-6xl mb-6 grayscale opacity-30">🕸️</span>
             <h3 className="text-xl font-bold text-slate-400">Knowledge Map Pending</h3>
             <p className="text-slate-600 mt-2 max-w-sm">
               {viewMode === 'author' 
                 ? "Sync your Google Scholar profile to build your co-author network and topic clusters."
                 : "Add articles to your library and create research notes to begin visualizing your conceptual map."}
             </p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel={(n: any) => `${n.name} ${n.cluster ? `(${n.cluster})` : ''}`}
            nodeColor={(n: any) => {
               if (viewMode === 'author' && authorNetworkData) {
                  const cluster = authorNetworkData.clusters.find((c: any) => c.name === n.cluster);
                  return cluster ? cluster.color : '#6366f1';
               }
               return n.color;
            }}
            nodeRelSize={1}
            nodeVal={(n: any) => {
               if (viewMode === 'author') return 12 - (n.level * 3);
               return n.val || 10;
            }}
            linkWidth={(l: any) => l.width || (l.type === 'citation' ? 2 : 1)}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkColor={(l: any) => l.color || 'rgba(255,255,255,0.1)'}
            linkCurvature="curvature"
            backgroundColor="transparent"
            onNodeClick={(node: any) => {
              if (node.type === 'article') onNavigateToArticle(node.id);
              else if (node.type === 'note') onNavigateToNote(node.id);
            }}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions: [number, number] = [textWidth, fontSize];

              ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              let nodeColor = node.color;
              if (viewMode === 'author' && authorNetworkData) {
                 const cluster = authorNetworkData.clusters.find((c: any) => c.name === node.cluster);
                 nodeColor = cluster ? cluster.color : '#6366f1';
              }

              ctx.fillStyle = nodeColor;
              ctx.fillText(label, node.x, node.y);
              
              const nodeSize = viewMode === 'author' ? (12 - (node.level * 3)) : (node.val || 10);
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeSize / 2 / globalScale, 0, 2 * Math.PI, false);
              ctx.fillStyle = nodeColor;
              ctx.fill();
            }}
          />
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 shadow-xl max-w-[240px]">
           <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">
             {viewMode === 'author' ? 'Topic Clusters' : 'Graph Legend'}
           </h4>
           {viewMode === 'author' && authorNetworkData ? (
             <div className="space-y-2">
               {authorNetworkData.clusters.map((c: any) => (
                 <div key={c.name} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }}></span>
                    <span className="text-xs text-slate-300 font-medium truncate">{c.name}</span>
                 </div>
               ))}
               <div className="mt-3 pt-3 border-t border-slate-800 space-y-1">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Hierarchy</p>
                  <p className="text-[10px] text-slate-400">Level 0: You</p>
                  <p className="text-[10px] text-slate-400">Level 1: Co-authors</p>
                  <p className="text-[10px] text-slate-400">Level 2: Deep Collaborators</p>
               </div>
             </div>
           ) : viewMode === 'topics' ? (
             <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                   <span className="text-xs text-slate-300 font-medium">Research Interest</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-6 h-[2px] bg-rose-500/40"></div>
                   <span className="text-xs text-slate-300 font-medium">Shared Literature</span>
                </div>
             </div>
           ) : (
             <>
               <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-indigo-400"></span>
                  <span className="text-xs text-slate-300 font-medium">Research Paper</span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                  <span className="text-xs text-slate-300 font-medium">Note / Annotation</span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
                  <span className="text-xs text-slate-300 font-medium">Dataset Hub</span>
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
