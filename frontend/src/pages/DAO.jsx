import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Landmark, Vote, Edit3, RefreshCw, ThumbsUp, ThumbsDown, CheckCircle2,
  Plus, Hash, Users, UserPlus, UserMinus, LogIn, Phone, Copy, Check
} from 'lucide-react';
import Toast from '../components/Toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';


function VoteBar({ yes, total }) {
  const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
  const majority = pct > 50;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5 font-semibold">
        <span className={majority ? 'text-emerald-700' : 'text-slate-500'}>{yes} yes / {total - yes} remaining</span>
        <span className={majority ? 'text-emerald-700 font-bold' : 'text-slate-400'}>{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${majority ? 'bg-emerald-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProposalCard({ p, onVote, index }) {
  const { t } = useTranslation();
  return (
    <div className={`card border-2 hover:shadow-lg transition-all duration-300 animate-slide-up stagger-${Math.min(index + 1, 4)} ${p.executed ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-slate-800">{p.description || t('community_spend')}</p>
          <p className="text-xs text-slate-400 mt-0.5">{new Date(p.created_at).toLocaleString()}</p>
        </div>
        <div className="text-right bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          <p className="text-lg font-black text-emerald-700">{Number(p.amount).toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-bold">BDT</p>
        </div>
      </div>
      {p.executed && (
        <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl mb-3">
          <CheckCircle2 className="w-4 h-4" /> {t('funds_released')}
        </div>
      )}
      <VoteBar yes={p.yes_votes} total={p.total_members || 1} />
      {!p.executed && (
        <div className="flex gap-3 mt-4">
          <button onClick={() => onVote(p.id, true)}
            className="flex-1 btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-sm py-2 font-bold shadow-sm">
            <ThumbsUp className="w-4 h-4" /> {t('approve')}
          </button>
          <button onClick={() => onVote(p.id, false)}
            className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-sm py-2 font-bold shadow-sm">
            <ThumbsDown className="w-4 h-4" /> {t('reject')}
          </button>
        </div>
      )}
    </div>
  );
}


export default function DAO({ token }) {
  const { t } = useTranslation();
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [removePolls, setRemovePolls] = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [loading, setLoading] = useState(true);


  const [newName, setNewName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [removeTarget, setRemoveTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [copied, setCopied] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const authHeaders = { Authorization: `Bearer ${token}` };


  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API}/dao/my-groups`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMyGroups(data);
        if (!selectedGroup && data.length > 0) setSelectedGroup(data[0].id);
      }
    } catch {  }
    finally { setLoading(false); }
  };


  const fetchGroupData = async (gid) => {
    if (!gid) return;
    try {
      const [infoRes, propRes, tRes, jrRes, rpRes] = await Promise.all([
        fetch(`${API}/dao/info/${gid}`, { headers: authHeaders }),
        fetch(`${API}/dao/proposals/${gid}`, { headers: authHeaders }),
        fetch(`${API}/dao/treasury/${gid}`, { headers: authHeaders }),
        fetch(`${API}/dao/join-requests/${gid}`, { headers: authHeaders }),
        fetch(`${API}/dao/remove-polls/${gid}`, { headers: authHeaders }),
      ]);
      if (infoRes.ok) setGroupInfo(await infoRes.json());
      if (propRes.ok) setProposals(await propRes.json());
      if (tRes.ok) { const d = await tRes.json(); setTreasury(d.treasury); }
      if (jrRes.ok) setJoinRequests(await jrRes.json());
      if (rpRes.ok) setRemovePolls(await rpRes.json());
    } catch { }
  };

  useEffect(() => { fetchGroups(); }, [token]);
  useEffect(() => { if (selectedGroup) fetchGroupData(selectedGroup); }, [selectedGroup]);
  useEffect(() => {
    if (!selectedGroup) return;
    const timer = setInterval(() => fetchGroupData(selectedGroup), 10000);
    return () => clearInterval(timer);
  }, [selectedGroup]);


  const handleCreate = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/dao/create`, { method: 'POST', headers, body: JSON.stringify({ name: newName }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(`Community created! ID: ${d.communityId}`);
      setNewName(''); setShowCreate(false);
      await fetchGroups();
      setSelectedGroup(d.groupId);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/dao/join`, { method: 'POST', headers, body: JSON.stringify({ groupId: joinId }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(d.message); setJoinId(''); setShowJoin(false);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handlePropose = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/dao/propose`, {
        method: 'POST', headers,
        body: JSON.stringify({ groupId: selectedGroup, recipient, amount: Number(amount), description: desc }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(t('proposal_success'));
      setRecipient(''); setAmount(''); setDesc('');
      fetchGroupData(selectedGroup);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleVote = async (proposalId, approve) => {
    setError('');
    try {
      const res = await fetch(`${API}/dao/vote`, { method: 'POST', headers, body: JSON.stringify({ proposalId, approve }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      fetchGroupData(selectedGroup);
    } catch (e) { setError(e.message); }
  };

  const handleVoteJoin = async (requestId, approve) => {
    try {
      const res = await fetch(`${API}/dao/vote-join`, { method: 'POST', headers, body: JSON.stringify({ requestId, approve }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      fetchGroupData(selectedGroup);
    } catch (e) { setError(e.message); }
  };

  const handleRemovePoll = async () => {
    if (!removeTarget) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/dao/remove-poll`, {
        method: 'POST', headers,
        body: JSON.stringify({ groupId: selectedGroup, targetWallet: removeTarget }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(d.message); setRemoveTarget('');
      fetchGroupData(selectedGroup);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleVoteRemove = async (pollId, approve) => {
    try {
      const res = await fetch(`${API}/dao/vote-remove`, { method: 'POST', headers, body: JSON.stringify({ pollId, approve }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      fetchGroupData(selectedGroup);
    } catch (e) { setError(e.message); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(`#${selectedGroup}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Toast message={success} type="success" onClose={() => setSuccess('')} />
      <Toast message={error} type="error" onClose={() => setError('')} />

      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-slate-800">{t('community_wallet')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('community_subtitle')}</p>
      </div>

      <div className="card border-slate-100 shadow-md animate-slide-up stagger-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" /> My Communities
          </h3>
          <div className="flex gap-2">
            <button onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
              className="btn bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs py-1.5 px-3 font-bold">
              <Plus className="w-3 h-3" /> Create
            </button>
            <button onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
              className="btn bg-blue-50 text-blue-700 border border-blue-200 text-xs py-1.5 px-3 font-bold">
              <LogIn className="w-3 h-3" /> Join
            </button>
          </div>
        </div>


        {showCreate && (
          <form onSubmit={handleCreate} className="flex gap-2 mb-4 animate-fade-in">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              className="input flex-1 text-sm bg-slate-50" placeholder="Community name" required />
            <button type="submit" disabled={submitting}
              className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {submitting ? '…' : 'Create'}
            </button>
          </form>
        )}

        {showJoin && (
          <form onSubmit={handleJoin} className="flex gap-2 mb-4 animate-fade-in">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={joinId} onChange={e => setJoinId(e.target.value)}
                className="input pl-9 text-sm bg-slate-50" placeholder="Community ID (e.g. #3)" required />
            </div>
            <button type="submit" disabled={submitting}
              className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {submitting ? '…' : 'Request'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="skeleton h-10 rounded-xl" />
        ) : myGroups.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No communities yet. Create one or join using an ID!</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {myGroups.map(g => (
              <button key={g.id} onClick={() => setSelectedGroup(g.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${selectedGroup === g.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'}`}>
                <Landmark className="w-3.5 h-3.5" />
                {g.name}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedGroup === g.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {g.member_count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedGroup && groupInfo && (
        <>
          <div className="rounded-[24px] p-6 text-white shadow-lg animate-slide-up stagger-1"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider">{groupInfo.name}</p>
                <p className="text-4xl font-black mt-1">
                  {treasury != null ? Number(treasury).toLocaleString() : '—'}
                  <span className="text-xl text-blue-200 font-bold ml-2">BDT</span>
                </p>
              </div>
              <div className="text-right">
                <button onClick={copyId}
                  className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold backdrop-blur-md hover:bg-white/25 transition-all">
                  <Hash className="w-4 h-4" /> {selectedGroup}
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5 text-white/50" />}
                </button>
                <p className="text-xs text-blue-200 mt-2">{groupInfo.member_count} members</p>
              </div>
            </div>
          </div>

          <div className="card border-slate-100 animate-slide-up stagger-2">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> Members
            </h3>
            <div className="space-y-2 mb-4">
              {groupInfo.members?.map(m => (
                <div key={m.address} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                      {(m.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{m.name || 'Unnamed'}</p>
                      <p className="text-[10px] text-slate-400">{m.phone}</p>
                    </div>
                  </div>
                  {m.address === groupInfo.owner && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Owner</span>
                  )}
                </div>
              ))}
            </div>
            {groupInfo.members?.length > 1 && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                  <UserMinus className="w-3.5 h-3.5" /> Remove a member (by voting)
                </p>
                <div className="flex gap-2">
                  <select value={removeTarget} onChange={e => setRemoveTarget(e.target.value)}
                    className="input flex-1 text-sm bg-slate-50">
                    <option value="">Select member…</option>
                    {groupInfo.members?.filter(m => m.address !== JSON.parse(localStorage.getItem('user') || '{}').wallet).map(m => (
                      <option key={m.address} value={m.address}>{m.name || m.phone} ({m.phone})</option>
                    ))}
                  </select>
                  <button onClick={handleRemovePoll} disabled={!removeTarget || submitting}
                    className="btn bg-red-50 text-red-600 border border-red-200 text-sm py-2 px-3 font-bold disabled:opacity-50">
                    Start Poll
                  </button>
                </div>
              </div>
            )}
          </div>

          {removePolls.length > 0 && (
            <div className="card border-red-100 bg-red-50/30 animate-fade-in">
              <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                <UserMinus className="w-4 h-4" /> Remove Member Polls
              </h3>
              <div className="space-y-3">
                {removePolls.map(rp => (
                  <div key={rp.id} className="bg-white rounded-xl border border-red-200 p-4">
                    <p className="font-bold text-slate-800 text-sm mb-1">
                      Remove <span className="text-red-600">{rp.target_name || rp.target_wallet.substring(0, 10) + '…'}</span>
                    </p>
                    <VoteBar yes={rp.yes_votes} total={rp.total_members || 1} />
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => handleVoteRemove(rp.id, true)}
                        className="flex-1 btn bg-red-50 text-red-700 border border-red-200 text-xs py-1.5 font-bold">
                        <ThumbsUp className="w-3.5 h-3.5" /> Remove
                      </button>
                      <button onClick={() => handleVoteRemove(rp.id, false)}
                        className="flex-1 btn bg-slate-50 text-slate-600 border border-slate-200 text-xs py-1.5 font-bold">
                        <ThumbsDown className="w-3.5 h-3.5" /> Keep
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {joinRequests.length > 0 && (
            <div className="card border-blue-100 bg-blue-50/30 animate-fade-in">
              <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Join Requests
              </h3>
              <div className="space-y-3">
                {joinRequests.map(jr => (
                  <div key={jr.id} className="bg-white rounded-xl border border-blue-200 p-4">
                    <p className="font-bold text-slate-800 text-sm mb-1">
                      <span className="text-blue-600">{jr.requester_name || jr.requester_wallet.substring(0, 10) + '…'}</span> wants to join
                    </p>
                    <VoteBar yes={jr.yes_votes} total={jr.total_members || 1} />
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => handleVoteJoin(jr.id, true)}
                        className="flex-1 btn bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs py-1.5 font-bold">
                        <ThumbsUp className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => handleVoteJoin(jr.id, false)}
                        className="flex-1 btn bg-red-50 text-red-600 border border-red-200 text-xs py-1.5 font-bold">
                        <ThumbsDown className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card animate-slide-up stagger-2 border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600" /> {t('new_proposal')}
            </h2>
            <form onSubmit={handlePropose} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Recipient Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={recipient} onChange={e => setRecipient(e.target.value)}
                    className="input pl-9 text-sm bg-slate-50" placeholder="01xxxxxxxxxx" required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    className="input pr-12 bg-slate-50 font-bold" placeholder={t('proposal_amount')} required min="1" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">BDT</span>
                </div>
                <input value={desc} onChange={e => setDesc(e.target.value)}
                  className="input bg-slate-50" placeholder={t('proposal_desc')} required />
              </div>
              <button type="submit" disabled={submitting} className="w-full btn btn-primary disabled:opacity-60 text-base py-3">
                {submitting ? t('creating') : t('create_proposal')}
              </button>
            </form>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Vote className="w-5 h-5 text-emerald-600" /> {t('active_proposals')}
              </h2>
              <button onClick={() => fetchGroupData(selectedGroup)} className="text-xs font-semibold text-slate-400 hover:text-emerald-600 flex items-center gap-1.5 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> {t('refresh')}
              </button>
            </div>
            {proposals.length === 0 ? (
              <div className="card text-center py-12">
                <Vote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-semibold">{t('no_proposals')}</p>
                <p className="text-slate-400 text-sm mt-1">{t('no_proposals_sub')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((p, i) => <ProposalCard key={p.id} p={p} onVote={handleVote} index={i} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
