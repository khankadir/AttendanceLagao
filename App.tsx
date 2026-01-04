
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area 
} from 'recharts';
import { 
  Clock, LogIn, LogOut, LayoutDashboard, History, Sparkles, User, 
  Calendar, CheckCircle2, AlertCircle, ChevronRight, TrendingUp
} from 'lucide-react';
import { PunchEntry, WorkDay, DashboardStats, AIInsight } from './types';
import { StatCard } from './components/StatCard';
import { getWorkInsights } from './services/geminiService';

const STORAGE_KEY = 'punchpro_data';

const App: React.FC = () => {
  const [punches, setPunches] = useState<PunchEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'insights'>('dashboard');
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  // Load data from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPunches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load punches", e);
      }
    }
  }, []);

  // Save data to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(punches));
  }, [punches]);

  const handlePunch = (type: 'IN' | 'OUT') => {
    const newPunch: PunchEntry = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
    };
    setPunches(prev => [newPunch, ...prev]);
  };

  const currentStatus = useMemo(() => {
    if (punches.length === 0) return 'PUNCHED_OUT';
    return punches[0].type === 'IN' ? 'PUNCHED_IN' : 'PUNCHED_OUT';
  }, [punches]);

  const workDaysData = useMemo(() => {
    const days: Record<string, WorkDay> = {};
    
    // Group punches by day
    const sortedPunches = [...punches].sort((a, b) => a.timestamp - b.timestamp);
    
    sortedPunches.forEach(p => {
      const date = new Date(p.timestamp).toISOString().split('T')[0];
      if (!days[date]) {
        days[date] = { date, punches: [], totalHours: 0 };
      }
      days[date].punches.push(p);
    });

    // Calculate hours
    Object.values(days).forEach(day => {
      let totalMs = 0;
      let startTime: number | null = null;
      
      day.punches.forEach(p => {
        if (p.type === 'IN') {
          startTime = p.timestamp;
        } else if (p.type === 'OUT' && startTime) {
          totalMs += (p.timestamp - startTime);
          startTime = null;
        }
      });
      
      // If still punched in today, calculate up to now
      if (startTime && day.date === new Date().toISOString().split('T')[0]) {
        totalMs += (Date.now() - startTime);
      }
      
      day.totalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(2));
    });

    return Object.values(days).reverse();
  }, [punches]);

  const stats = useMemo<DashboardStats>(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = workDaysData.filter(d => {
      const date = new Date(d.date);
      const diff = Date.now() - date.getTime();
      return diff < 7 * 24 * 60 * 60 * 1000;
    });

    const totalHoursThisWeek = thisWeek.reduce((acc, curr) => acc + curr.totalHours, 0);
    const avg = thisWeek.length > 0 ? totalHoursThisWeek / thisWeek.length : 0;

    return {
      totalHoursThisWeek: parseFloat(totalHoursThisWeek.toFixed(1)),
      averageDailyHours: parseFloat(avg.toFixed(1)),
      lastPunch: punches[0] || null,
      status: currentStatus,
    };
  }, [punches, workDaysData, currentStatus]);

  const fetchAIInsights = async () => {
    if (workDaysData.length === 0) return;
    setIsGeneratingInsight(true);
    try {
      const insight = await getWorkInsights(workDaysData.slice(0, 7));
      setAiInsight(insight);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 fixed h-full">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">PunchPro</span>
        </div>

        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <History className="w-5 h-5" />
            History
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'insights' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Sparkles className="w-5 h-5" />
            AI Insights
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">John Doe</p>
              <p className="text-xs text-slate-500">Free Account</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {activeTab === 'dashboard' ? 'Performance Overview' : 
               activeTab === 'history' ? 'Work History' : 'Smart Insights'}
            </h1>
            <p className="text-slate-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {stats.status === 'PUNCHED_IN' ? (
              <button 
                onClick={() => handlePunch('OUT')}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-rose-200 transition-all active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                Punch Out
              </button>
            ) : (
              <button 
                onClick={() => handlePunch('IN')}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                <LogIn className="w-5 h-5" />
                Punch In
              </button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard 
                label="Total Hours (Week)" 
                value={`${stats.totalHoursThisWeek}h`} 
                icon={<Clock className="w-5 h-5" />}
                trend={{ value: '+12%', isUp: true }}
              />
              <StatCard 
                label="Daily Average" 
                value={`${stats.averageDailyHours}h`} 
                icon={<TrendingUp className="w-5 h-5" />}
              />
              <StatCard 
                label="Active Status" 
                value={stats.status === 'PUNCHED_IN' ? 'On Duty' : 'Away'} 
                icon={stats.status === 'PUNCHED_IN' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800">Weekly Activity</h3>
                  <select className="text-sm bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option>Last 7 Days</option>
                  </select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workDaysData.slice(0, 7).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#94a3b8'}}
                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Bar dataKey="totalHours" radius={[4, 4, 0, 0]}>
                        {workDaysData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.totalHours > 8 ? '#4f46e5' : '#818cf8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {punches.slice(0, 5).map((p, idx) => (
                    <div key={p.id} className="flex items-start gap-3">
                      <div className={`mt-1 p-1.5 rounded-full ${p.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {p.type === 'IN' ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 border-b border-slate-50 pb-3 last:border-0">
                        <p className="text-sm font-semibold text-slate-900">
                          Punch {p.type === 'IN' ? 'In' : 'Out'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {punches.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Punches</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workDaysData.map((day) => (
                    <tr key={day.date} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${day.totalHours >= 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                          {day.totalHours >= 8 ? 'Complete' : 'Partial'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {day.punches.map((p, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              {p.type}: {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-900">{day.totalHours}h</span>
                      </td>
                    </tr>
                  ))}
                  {workDaysData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-slate-400">No work history found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-8 h-8" />
                  AI Workplace Assistant
                </h2>
                <p className="text-indigo-100 mb-6 text-lg">
                  Get personalized recommendations based on your work patterns to optimize your productivity and well-being.
                </p>
                <button 
                  onClick={fetchAIInsights}
                  disabled={isGeneratingInsight || workDaysData.length === 0}
                  className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingInsight ? 'Analyzing Work Patterns...' : 'Generate New Insights'}
                  {!isGeneratingInsight && <ChevronRight className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
            </div>

            {aiInsight && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Summary</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {aiInsight.summary}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-1000"
                        style={{ width: `${aiInsight.productivityScore}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-indigo-600">{aiInsight.productivityScore}% Score</span>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Recommendations</h3>
                  <div className="space-y-4">
                    {aiInsight.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-medium">History</span>
        </button>
        <button 
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'insights' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-[10px] font-medium">Insights</span>
        </button>
        <div className="w-px h-8 bg-slate-200 mx-2"></div>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
