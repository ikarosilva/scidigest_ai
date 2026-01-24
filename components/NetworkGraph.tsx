
import React, { useMemo, useState, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Article, Note, Book, NetworkViewMode } from '../types';
import { geminiService } from '../services/geminiService';

interface NetworkGraphProps {
  articles: Article[];
  notes: Note[];
  books?: Book[];
  focusNodeId?: string | null;
  onClearFocus?: () => void;
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onNavigateToArticle: (id: string) => void;
  onNavigateToNote: (id: string) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ 
  articles, 
  notes, 
  books = [],
  focusNodeId,
  onClearFocus,
  onUpdateArticle,
  onNavigateToArticle,
  onNavigateToNote
}) => {
  const [viewMode, setViewMode] = useState<NetworkViewMode>('unified');
  const [isMining, setIsMining] = useState(false);
  const [miningProgress, setMiningProgress] = useState(0);
  const fgRef = useRef<any>(null);

  // Set initial zoom and focus if provided
  useEffect(() => {
    if (focusNodeId && fgRef.current) {
      const node = graphData.nodes.find((n: any) => n.id === focusNodeId);
      if (node) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(2.5, 1000);
      }
    }
  }, [focusNodeId, fgRef.current]);

  // Process data into Graph format (Nodes & Links)
  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Heuristic to extract "Datasets" from articles
    const uniqueDatasets = new Set<string>();
    articles.forEach(a => {
      if (a.dataLocation) uniqueDatasets.add(a.dataLocation);
      // Also treat specific tags as datasets if they are frequently used
      a.tags.forEach(t => {
        if (t.toLowerCase().includes('data') || t.toLowerCase().includes('set')) {
          uniqueDatasets.add(t);
        }
      });
    });

    const isFilterActive = !!focusNodeId;
    const activeNote = isFilterActive ? notes.find(n => n.id === focusNodeId) : null;
    const allowedArticleIds = activeNote ? new Set(activeNote.articleIds) : null;

    if (viewMode === 'articles' || viewMode === 'unified' || viewMode === 'datasets') {
      articles.forEach((article: Article) => {
        if (allowedArticleIds && !allowedArticleIds.has(article.id)) return;

        nodes.push({
          id: article.id,
          name: article.title,
          type: 'article',
          val: 10 + (article.noteIds.length * 5),
          color: '#818cf8'
        });

        // Add citation links (Article -> Article)
        if (article.references) {
          article.references.forEach((refTitle: string) => {
            const target = articles.find((a: Article) => a.title.toLowerCase().includes(refTitle.toLowerCase()) || refTitle.toLowerCase().includes(a.title.toLowerCase()));
            if (target && (!allowedArticleIds || allowedArticleIds.has(target.id))) {
              links.push({
                source: article.id,
                target: target.id,
                type: 'citation',
                color: 'rgba(129, 140, 248, 0.4)',
                curvature: 0.2
              });
            }
          });
        }

        // Add Dataset mapping links
        if (viewMode === 'datasets') {
           if (article.dataLocation) {
             links.push({
               source: article.id,
               target: `dataset-${article.dataLocation}`,
               type: 'usage',
               color: 'rgba(16, 185, 129, 0.3)'
             });
           }
           article.tags.forEach(t => {
             if (uniqueDatasets.has(t)) {
                links.push({
                  source: article.id,
                  target: `dataset-${t}`,
                  type: 'usage',
                  color: 'rgba(16, 185, 129, 0.3)'
                });
             }
           });
        }
      });
    }

    if (viewMode === 'datasets') {
      uniqueDatasets.forEach(ds => {
        nodes.push({
          id: `dataset-${ds}`,
          name: ds,
          type: 'dataset',
          val: 20,
          color: '#10b981'
        });
      });
    }

    if ((viewMode === 'unified' || viewMode === 'notes') && (!allowedArticleIds)) {
      notes.forEach((note: Note) => {
        nodes.push({
          id: note.id,
          name: note.title,
          type: 'note',
          val: 8 + (note.articleIds.length * 3),
          color: '#fbbf24'
        });

        if (viewMode === 'unified') {
          note.articleIds.forEach((articleId: string) => {
            if (articles.find((a: Article) => a.id === articleId)) {
              links.push({
                source: note.id,
                target: articleId,
                type: 'linked',
                color: 'rgba(251, 191, 36, 0.3)'
              });
            }
          });
        }
      });
    }

    if (viewMode === 'unified' && !allowedArticleIds) {
      books.forEach((book: Book) => {
        nodes.push({
          id: book.id,
          name: book.title,
          type: 'book',
          val: 12,
          color: '#f59e0b'
        });
        
        // Find links from articles to books via topics (heuristic)
        articles.forEach(art => {
           const sharedTag = art.tags.find(t => book.title.toLowerCase().includes(t.toLowerCase()));
           if (sharedTag) {
              links.push({
                source: art.id,
                target: book.id,
                type: 'thematic',
                color: 'rgba(245, 158, 11, 0.1)'
              });
           }
        });
      });
    }

    return { nodes, links };
  }, [articles, notes, books, viewMode, focusNodeId]);

  const handleMineCitations = async () => {
    if (isMining) return;
    setIsMining(true);
    setMiningProgress(0);

    const papersToMine = articles.filter((a: Article) => !a.references || a.references.length === 0);
    let count = 0;

    for (const article of papersToMine) {
      try {
        const refs = await geminiService.discoverReferences(article);
        onUpdateArticle(article.id, { references: refs });
      } catch (e) {
        console.error("Mining error for", article.title, e);
      }
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
          <p className="text-slate-400 mt-1">Visualize citations, conceptual links, and dataset clusters.</p>
        </div>
        
        <div className="flex items-center gap-3">
           {focusNodeId && (
              <button 
                onClick={onClearFocus}
                className="bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Clear Dataset Filter ✕
              </button>
           )}
           <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
             {(['notes', 'articles', 'unified', 'datasets'] as NetworkViewMode[]).map((mode: NetworkViewMode) => (
               <button
                 key={mode}
                 onClick={() => setViewMode(mode)}
                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                   viewMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                 }`}
               >
                 {mode}
               </button>
             ))}
           </div>
           
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
      </header>

      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
        {graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
             <span className="text-6xl mb-6 grayscale opacity-30">🕸️</span>
             <h3 className="text-xl font-bold text-slate-400">Your Network is Empty</h3>
             <p className="text-slate-600 mt-2 max-w-sm">Add articles to your library and create research notes to begin visualizing your conceptual map.</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(n: any) => n.color}
            nodeRelSize={1}
            nodeVal={(n: any) => n.val}
            linkWidth={(l: any) => (l.type === 'citation' ? 2 : 1)}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkColor={(l: any) => l.color}
            linkCurvature="curvature"
            backgroundColor="transparent"
            onNodeClick={(node: any) => {
              if (node.type === 'article') onNavigateToArticle(node.id);
              else if (node.type === 'note') onNavigateToNote(node.id);
              else if (node.type === 'dataset') console.log('Focus on dataset', node.name);
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
              ctx.fillStyle = node.color;
              ctx.fillText(label, node.x, node.y);
              
              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val / 2 / globalScale, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();
            }}
          />
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 shadow-xl">
           <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Graph Legend</h4>
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
              <span className="text-xs text-slate-300 font-medium">Dataset / Method Hub</span>
           </div>
           <div className="flex items-center gap-3 mt-1 border-t border-slate-800 pt-3">
              <div className="w-6 h-0.5 bg-indigo-500/40"></div>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Citation Link</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
