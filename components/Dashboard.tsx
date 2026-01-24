
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Article } from '../types';

interface DashboardProps {
  articles: Article[];
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ articles, onNavigate }) => {
  // Process data for charts
  const tagCounts: Record<string, number> = {};
  articles.forEach(a => {
    a.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const pieData = Object.entries(tagCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const ratingDistribution = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1,
    count: articles.filter(a => a.rating === i + 1).length
  }));

  const COLORS = ['#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#fb923c'];

  const calculateAverageRating = () => {
    if (!articles || articles.length === 0) return '0.0';
    const totalRating = articles.reduce((acc, a) => acc + a.rating, 0);
    const average = totalRating / articles.length;
    return average.toFixed(1);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Research Insights</h2>
          <p className="text-slate-400">Overview of your academic ingestion and learning trends.</p>
        </div>
        <button 
          onClick={() => onNavigate('feed')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
        >
          Check New Feeds →
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
          <p className="text-sm font-medium text-slate-500 uppercase">Total Articles</p>
          <p className="text-4xl font-bold text-indigo-400 mt-2">{articles.length}</p>
          <div className="mt-4 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full inline-block">
            +12% from last month
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
          <p className="text-sm font-medium text-slate-500 uppercase">Average Rating</p>
          <p className="text-4xl font-bold text-purple-400 mt-2">
            {calculateAverageRating()}
          </p>
          <p className="text-xs text-slate-500 mt-2">Personal content quality score</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
          <p className="text-sm font-medium text-slate-500 uppercase">Top Interest</p>
          <p className="text-4xl font-bold text-pink-400 mt-2">{pieData[0]?.name || 'N/A'}</p>
          <p className="text-xs text-slate-500 mt-2">Most cited topic in library</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 min-h-[400px]">
          <h3 className="text-lg font-bold text-slate-100 mb-6">Topic Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
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
                {pieData.map((entry, index) => (
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

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 min-h-[400px]">
          <h3 className="text-lg font-bold text-slate-100 mb-6">Rating Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingDistribution}>
              <XAxis dataKey="rating" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommended Preview */}
      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-indigo-400">🔥 Top Recommendations for You</h3>
          <button onClick={() => onNavigate('feed')} className="text-xs text-indigo-300 hover:underline">View All New Articles</button>
        </div>
        <div className="space-y-3">
          {articles.filter(a => a.rating >= 9).slice(0, 2).map(a => (
            <div key={a.id} className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-slate-200">{a.title}</p>
                <p className="text-xs text-slate-500">{a.authors[0]} • {a.source}</p>
              </div>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">Ranked High</span>
            </div>
          ))}
          {articles.filter(a => a.rating >= 9).length === 0 && (
            <p className="text-sm text-slate-500 italic">No high-rated articles found to base recommendations on. Rate more articles in your Library!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
