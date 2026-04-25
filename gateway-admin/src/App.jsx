import { useState, useEffect } from 'react';
import {
  Activity, Server, AlertTriangle, Clock, CheckCircle2, XCircle,
  Shield, Users, ArrowUpRight, RefreshCw, Fingerprint, Zap, Database,
  TrendingUp, Eye, ChevronDown, Lock, Unlock
} from 'lucide-react';

const API = 'http://localhost:5000';

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ icon, label, value, color, sub }) {
  const palette = {
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20',
    blue:    'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
    purple:  'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
    amber:   'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/20',
    red:     'from-red-500/20 to-red-600/5 text-red-400 border-red-500/20',
  };
  const p = palette[color] || palette.emerald;
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${p} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-${color}-500/10`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.split(' ')[0]} flex items-center justify-center`}>
          {icon}
        </div>
        {sub && <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{sub}</span>}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
    </div>
  );
}

/* ─── Node Card ──────────────────────────────────────────────── */
function NodeCard({ node }) {
  const online = node.status === 'online';
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.01]
      ${online
        ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-emerald-950/10 hover:border-emerald-500/40'
        : 'border-red-500/20 bg-gradient-to-br from-red-950/40 to-red-950/10'}`}>
      {/* Live pulse */}
      {online && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />}

      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${online ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
          <Server className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Node {node.id}</p>
          <p className="text-[11px] text-white/30 font-mono">{node.url}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
          {online ? '● ONLINE' : '● OFFLINE'}
        </span>
        {online && (
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Block <strong className="text-white ml-1">{node.blockHeight}</strong></span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> <strong className="text-emerald-300">{node.latencyMs}ms</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Transaction Row ────────────────────────────────────────── */
function TxRow({ tx }) {
  const [expanded, setExpanded] = useState(false);
  const colors = {
    executed:  { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" />, dot: 'bg-emerald-500' },
    pending:   { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20', icon: <Clock className="w-3.5 h-3.5" />, dot: 'bg-amber-500' },
    cancelled: { badge: 'bg-red-500/15 text-red-300 border-red-500/20', icon: <XCircle className="w-3.5 h-3.5" />, dot: 'bg-red-500' },
  };
  const s = colors[tx.status] || colors.pending;
  const reasons = (() => { try { return JSON.parse(tx.risk_reasons || '[]'); } catch { return []; } })();

  return (
    <div className="group border-b border-white/5 last:border-0">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
        <span className="text-xs font-mono text-white/30 w-10 flex-shrink-0">#{tx.id}</span>

        <div className="flex items-center gap-2 flex-1 min-w-0 text-xs font-mono text-white/40">
          <span className="truncate max-w-[110px]">{tx.sender?.substring(0, 14)}…</span>
          <ArrowUpRight className="w-3 h-3 text-white/20 flex-shrink-0" />
          <span className="truncate max-w-[110px]">{tx.recipient?.substring(0, 14)}…</span>
        </div>

        <span className="text-sm font-bold text-white tabular-nums flex-shrink-0">
          {Number(tx.amount).toLocaleString()} <span className="text-xs text-white/30 font-medium">BDT</span>
        </span>

        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.badge} flex-shrink-0`}>
          {s.icon} {tx.status}
        </span>

        {tx.risk_score > 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${tx.risk_score >= 45 ? 'bg-red-500/15 text-red-300' : tx.risk_score >= 25 ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
            Risk {tx.risk_score}
          </span>
        )}

        <span className="text-[11px] text-white/25 flex-shrink-0 w-20 text-right">{tx.delay_seconds > 0 ? `${tx.delay_seconds}s delay` : 'instant'}</span>

        <ChevronDown className={`w-3.5 h-3.5 text-white/20 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {expanded && (
        <div className="px-5 pb-4 animate-fade-in-up">
          <div className="bg-white/[0.02] rounded-xl border border-white/5 p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-white/30 uppercase tracking-wider font-semibold mb-1">From</p>
                <p className="font-mono text-white/60 break-all text-[11px]">{tx.sender}</p>
              </div>
              <div>
                <p className="text-white/30 uppercase tracking-wider font-semibold mb-1">To</p>
                <p className="font-mono text-white/60 break-all text-[11px]">{tx.recipient}</p>
              </div>
              <div>
                <p className="text-white/30 uppercase tracking-wider font-semibold mb-1">Risk Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${tx.risk_score >= 45 ? 'bg-red-500' : tx.risk_score >= 25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, tx.risk_score)}%` }} />
                  </div>
                  <span className="font-bold text-white">{tx.risk_score}</span>
                </div>
              </div>
              <div>
                <p className="text-white/30 uppercase tracking-wider font-semibold mb-1">Time</p>
                <p className="text-white/60">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
            </div>
            {reasons.length > 0 && (
              <div>
                <p className="text-white/30 uppercase tracking-wider font-semibold text-xs mb-2">Risk Flags</p>
                <div className="flex flex-wrap gap-1.5">
                  {reasons.map((r, i) => (
                    <span key={i} className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/15 px-2 py-0.5 rounded-lg font-medium">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────── */
export default function App() {
  const [data, setData] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        fetch(`${API}/gateway/status`),
        fetch(`${API}/gateway/transactions?limit=50`)
      ]);
      if (sRes.ok) setData(await sRes.json());
      if (tRes.ok) setTxs(await tRes.json());
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 5000); return () => clearInterval(iv); }, []);

  const onlineNodes = data?.nodes?.filter(n => n.status === 'online').length || 0;
  const pendingCount = data?.stats?.pendingTxs || 0;
  const flaggedCount = data?.flaggedAccounts?.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 animate-pulse">
            <Fingerprint className="w-7 h-7 text-white" />
          </div>
          <p className="text-emerald-400 text-sm font-bold animate-pulse">Loading Gateway…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10">
      {/* ─── Header ──────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(10,15,13,0.85)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg tracking-tight text-white">বাংলা <span className="text-emerald-400">Coin</span></span>
              <span className="text-[10px] font-black text-emerald-400/60 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/15 uppercase tracking-widest">Gateway Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-[11px] text-white/25 font-mono hidden md:block">
                Last: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
              <div className={`w-1.5 h-1.5 rounded-full ${onlineNodes >= 2 ? 'bg-emerald-400 animate-pulse-dot' : 'bg-red-400'}`} />
              <span className="text-xs font-bold text-white/50">{onlineNodes}/3 nodes</span>
            </div>
            <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs font-semibold text-white/30 hover:text-emerald-400 transition-all px-3 py-2 rounded-xl hover:bg-white/5 active:scale-95">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Dashboard ───────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={<Server className="w-5 h-5" />} label="Nodes Online" value={`${onlineNodes}/3`} color="emerald" sub="Network" />
          <StatCard icon={<Shield className="w-5 h-5" />} label="Quorum" value={`${data?.quorum || 2} of 3`} color="blue" sub="Consensus" />
          <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={data?.stats?.totalUsers || 0} color="purple" sub="Registered" />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Total Txs" value={data?.stats?.totalTxs || 0} color="amber" sub="All Time" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Pending" value={pendingCount} color={pendingCount > 0 ? 'red' : 'emerald'} sub="In Queue" />
        </div>

        {/* Network Nodes */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Network Nodes</h2>
            <span className="text-xs text-white/20 font-mono">PoA Simulated Network</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.nodes || []).map(n => <NodeCard key={n.id} node={n} />)}
          </div>
        </section>

        {/* Flagged Accounts */}
        {flaggedCount > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Flagged Accounts</h2>
              <span className="text-xs font-bold text-red-400/60 bg-red-500/10 px-2 py-0.5 rounded-md">{flaggedCount} flagged</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.flaggedAccounts.map(f => (
                <div key={f.flagged_address} className="flex items-center gap-4 rounded-xl p-4 bg-red-950/20 border border-red-500/15 hover:border-red-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-white/50 truncate">{f.flagged_address}</p>
                    <p className="text-lg font-black text-red-400 mt-0.5">{f.cnt} <span className="text-xs font-semibold text-red-400/50">flags</span></p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transaction Log */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Transaction Log</h2>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/15 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {pendingCount} pending
                </span>
              )}
              <span className="text-xs text-white/20">{txs.length} shown</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.01]">
            {/* Table Header */}
            <div className="flex items-center gap-4 px-5 py-3 bg-white/[0.02] text-[10px] text-white/25 uppercase tracking-wider font-bold border-b border-white/5">
              <span className="w-2" />
              <span className="w-10">ID</span>
              <span className="flex-1">From → To</span>
              <span className="w-28 text-right">Amount</span>
              <span className="w-24">Status</span>
              <span className="w-14">Risk</span>
              <span className="w-20 text-right">Delay</span>
              <span className="w-3.5" />
            </div>

            {/* Rows */}
            {txs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Activity className="w-10 h-10 text-white/10 mb-3" />
                <p className="text-sm text-white/20 font-medium">No transactions yet</p>
                <p className="text-xs text-white/10 mt-1">Transactions will appear here in real-time</p>
              </div>
            ) : (
              txs.map(tx => <TxRow key={tx.id} tx={tx} />)
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-white/15">
          <span>Bangla Coin Gateway · Team SUST SONGLAP</span>
          <span>Friction Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}
