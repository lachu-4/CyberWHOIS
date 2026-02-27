import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { History, ShieldAlert, Globe, Calendar, Trash2, ExternalLink } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { format } from 'date-fns';

export default function Dashboard({ user }: { user: User | null }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ riskDist: [], topDomains: [] });

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whois_queries')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setHistory(data || []);
      processStats(data || []);
    }
    setLoading(false);
  };

  const processStats = (data: any[]) => {
    // Risk Distribution
    const counts = data.reduce((acc: any, curr: any) => {
      acc[curr.threat_score] = (acc[curr.threat_score] || 0) + 1;
      return acc;
    }, {});

    const riskDist = [
      { name: 'Low', value: counts['Low'] || 0, color: '#10b981' },
      { name: 'Medium', value: counts['Medium'] || 0, color: '#f59e0b' },
      { name: 'High', value: counts['High'] || 0, color: '#ef4444' },
    ];

    // Top Domains
    const domainCounts = data.reduce((acc: any, curr: any) => {
      acc[curr.domain] = (acc[curr.domain] || 0) + 1;
      return acc;
    }, {});

    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    setStats({ riskDist, topDomains });
  };

  const deleteHistoryItem = async (id: string) => {
    const { error } = await supabase.from('whois_queries').delete().eq('id', id);
    if (!error) {
      const newHistory = history.filter(item => item.id !== id);
      setHistory(newHistory);
      processStats(newHistory);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active Session: {user?.email}</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Intelligence Dashboard</h1>
          <p className="text-slate-400">Overview of your domain security investigations and threat analysis history.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> {history.length} Total Lookups</div>
          <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Last 30 Days</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Distribution Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Threat Level Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.riskDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.riskDist.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {stats.riskDist.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Domains Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Most Investigated Domains</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topDomains}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="domain" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-500" />
            Lookup History
          </h3>
          <button onClick={fetchHistory} className="text-xs text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-widest">
            Refresh Data
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Registrar</th>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4">Threat Level</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.length > 0 ? (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-mono text-white">{item.domain}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.registrar}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.country}</td>
                    <td className="px-6 py-4">
                      <RiskBadge level={item.threat_score} className="text-[9px]" />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => window.open(`/lookup?d=${item.domain}`, '_self')}
                          className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No lookup history found. Start by searching for a domain.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
