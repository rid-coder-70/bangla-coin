import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Banknote, Phone, ArrowDownToLine, MapPin, MessageCircle, Users, Send as SendIcon,
  Loader2, RefreshCw, CheckCircle2, Info, Filter, Navigation
} from 'lucide-react';
import Toast from '../components/Toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DIVISIONS = [
  'Dhaka', 'Chittagong', 'Rajshahi', 'Khulna',
  'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'
];

const RANGE_LABELS = {
  near: { label: 'Near', desc: 'Small city area', icon: '📍' },
  medium: { label: 'Medium', desc: 'Big city', icon: '🏙️' },
  big: { label: 'Big', desc: 'Division-wide', icon: '🗺️' },
};

// ─── Tab Button ──────────────────────────────────────────────
function TabBtn({ active, icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
        ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

// ─── Range Filter ────────────────────────────────────────────
function RangeFilter({ range, setRange }) {
  return (
    <div className="flex gap-2">
      {Object.entries(RANGE_LABELS).map(([k, v]) => (
        <button key={k} onClick={() => setRange(k)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all
            ${range === k ? 'bg-emerald-100 text-emerald-700 border-emerald-300 border shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-200'}`}>
          <span>{v.icon}</span> {v.label}
        </button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 1 — Cash-In / Cash-Out
// ════════════════════════════════════════════════════════════════
function CashTab({ token }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${API}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setBalance(d.balance); }
    } catch { /* ignore */ }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/agent/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setHistory(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchBalance(); fetchHistory(); }, [token]);

  const handleMint = async () => {
    setMinting(true); setError('');
    try {
      const res = await fetch(`${API}/agent/mint`, { method: 'POST', headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(d.message);
      fetchBalance();
    } catch (e) { setError(e.message); }
    finally { setMinting(false); }
  };

  const handleCashIn = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/agent/cash-in`, {
        method: 'POST', headers,
        body: JSON.stringify({ phone: phone.trim(), amount: Number(amount) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(d.message);
      setPhone(''); setAmount('');
      fetchBalance(); fetchHistory();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <Toast message={success} type="success" onClose={() => setSuccess('')} />
      <Toast message={error} type="error" onClose={() => setError('')} />

      {/* Balance + Mint */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden shadow-xl"
        style={{ background: 'linear-gradient(135deg, #1e3a2f 0%, #064e3b 40%, #059669 100%)' }}>
        <div className="absolute top-[-30px] right-[-30px] w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <p className="text-emerald-200/80 text-sm font-semibold uppercase tracking-wider mb-1">Agent Balance</p>
        <p className="text-4xl font-black tracking-tight mb-4">
          {balance != null ? Number(balance).toLocaleString() : '—'}
          <span className="text-lg font-bold text-emerald-300 ml-2">BDT</span>
        </p>
        <button onClick={handleMint} disabled={minting}
          className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50">
          {minting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <ArrowDownToLine className="w-4 h-4" />}
          {minting ? 'Minting…' : 'Request BDT Inventory (+10,000)'}
        </button>
      </div>

      {/* Cash-In Form */}
      <form onSubmit={handleCashIn} className="card space-y-4 border-slate-100 shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-800">Cash-In to User</h3>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">User Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
              className="input pl-9 text-sm bg-slate-50" placeholder="01xxxxxxxxxx" required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">Amount (BDT)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="input text-lg font-bold bg-slate-50" placeholder="0" required min="1" />
        </div>
        <button type="submit" disabled={loading || !phone || !amount}
          className="w-full btn btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading
            ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing…</span>
            : <span className="flex items-center gap-2"><SendIcon className="w-4 h-4" /> Cash-In</span>}
        </button>
      </form>

      {/* Recent Activity */}
      <div className="card border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Recent Activity</h3>
          <button onClick={fetchHistory} className="text-xs text-slate-400 hover:text-emerald-600 font-semibold flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No transactions yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.slice(0, 20).map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 text-sm">
                <div>
                  <p className="font-semibold text-slate-700 text-xs">{tx.sender === JSON.parse(localStorage.getItem('user') || '{}').wallet ? 'Sent' : 'Received'}</p>
                  <p className="text-[11px] text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.sender === JSON.parse(localStorage.getItem('user') || '{}').wallet ? 'text-red-500' : 'text-emerald-600'}`}>
                    {tx.sender === JSON.parse(localStorage.getItem('user') || '{}').wallet ? '-' : '+'}{Number(tx.amount).toLocaleString()} BDT
                  </p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tx.status === 'executed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — Agent Network
// ════════════════════════════════════════════════════════════════
function NetworkTab({ token }) {
  const [range, setRange] = useState('near');
  const [city, setCity] = useState('');
  const [division, setDivision] = useState('');
  const [agents, setAgents] = useState([]);
  const [myLoc, setMyLoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchNearby = async (r) => {
    try {
      const res = await fetch(`${API}/agent/nearby?range=${r || range}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setAgents(d.agents || []);
        setMyLoc(d.myLocation || null);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchNearby(range); }, [range]);

  const handleSaveLocation = async () => {
    if (!city || !division) { setError('Select city and division'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/agent/location`, {
        method: 'POST', headers,
        body: JSON.stringify({ city, division, latitude: 0, longitude: 0 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess('Location saved!');
      fetchNearby(range);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <Toast message={success} type="success" onClose={() => setSuccess('')} />
      <Toast message={error} type="error" onClose={() => setError('')} />

      {/* Set Location */}
      <div className="card border-slate-100 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-800">Your Location</h3>
          {myLoc && (
            <span className="ml-auto text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {myLoc.city}, {myLoc.division}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              className="input text-sm bg-slate-50" placeholder="e.g. Sylhet Sadar" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Division</label>
            <select value={division} onChange={e => setDivision(e.target.value)}
              className="input text-sm bg-slate-50">
              <option value="">Select…</option>
              {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleSaveLocation} disabled={saving || !city || !division}
          className="btn btn-primary py-2 text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Location'}
        </button>
      </div>

      {/* Range Filter */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" /> Nearby Agents
        </h3>
        <RangeFilter range={range} setRange={(r) => { setRange(r); fetchNearby(r); }} />
      </div>

      {/* Agent List */}
      {agents.length === 0 ? (
        <div className="card text-center py-8 text-slate-400">
          <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold">No agents found in this range</p>
          <p className="text-xs mt-1">Try expanding the range filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map(ag => (
            <div key={ag.id} className="card flex items-center justify-between py-3 px-4 border-slate-100 hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm">
                  {(ag.name || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{ag.name || 'Agent'}</p>
                  <p className="text-xs text-slate-400">{ag.phone} · {ag.city}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{ag.division}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 3 — Community Chat
// ════════════════════════════════════════════════════════════════
function ChatTab({ token }) {
  const [range, setRange] = useState('near');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchMessages = async (r) => {
    try {
      const res = await fetch(`${API}/agent/chat/messages?range=${r || range}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchMessages(range); }, [range]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => fetchMessages(range), 5000);
    return () => clearInterval(timer);
  }, [range]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true); setError('');
    try {
      const res = await fetch(`${API}/agent/chat/send`, {
        method: 'POST', headers,
        body: JSON.stringify({ message: input.trim(), range }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setInput('');
      fetchMessages(range);
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <Toast message={error} type="error" onClose={() => setError('')} />

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-600" /> Agent Chat
        </h3>
        <RangeFilter range={range} setRange={(r) => { setRange(r); fetchMessages(r); }} />
      </div>

      <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        Messages are scoped to <strong className="text-slate-600">{RANGE_LABELS[range].desc}</strong> range. Auto-refreshes every 5s.
      </div>

      {/* Messages */}
      <div className="card border-slate-100 p-0 overflow-hidden">
        <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === (user.id || -1);
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
                  }`}>
                    {!isMe && (
                      <p className="text-[10px] font-bold text-emerald-600 mb-0.5">{msg.sender_name}</p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString()} · {msg.city}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-slate-100 bg-white">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            className="flex-1 input text-sm bg-slate-50 py-2.5" placeholder="Type a message…" />
          <button type="submit" disabled={sending || !input.trim()}
            className="btn btn-primary py-2.5 px-4 disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN AGENT PAGE
// ════════════════════════════════════════════════════════════════
export default function Agent({ token }) {
  const [tab, setTab] = useState('cash');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-slate-800">Agent Portal</h1>
        <p className="text-slate-500 text-sm mt-1">Manage cash-in/out, connect with agents, and chat</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 animate-slide-up stagger-1">
        <TabBtn active={tab === 'cash'} icon={Banknote} label="Cash-In/Out" onClick={() => setTab('cash')} />
        <TabBtn active={tab === 'network'} icon={Users} label="Agent Network" onClick={() => setTab('network')} />
        <TabBtn active={tab === 'chat'} icon={MessageCircle} label="Chat" onClick={() => setTab('chat')} />
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {tab === 'cash' && <CashTab token={token} />}
        {tab === 'network' && <NetworkTab token={token} />}
        {tab === 'chat' && <ChatTab token={token} />}
      </div>
    </div>
  );
}
