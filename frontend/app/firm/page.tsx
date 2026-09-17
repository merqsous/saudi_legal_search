'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Plus, UserPlus, Trash2, Crown, LogOut, Phone, X } from 'lucide-react';
import Header from '../components/Header';

interface Firm {
  id: number;
  name: string;
  owner_user_id: number;
  created_at: string;
  my_role: string;
}

interface Member {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  role: string;
  created_at: string;
}

interface Invitation {
  id: number;
  phone: string;
  created_at: string;
}

export default function FirmPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [firm, setFirm] = useState<Firm | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Create firm
  const [showCreate, setShowCreate] = useState(false);
  const [firmName, setFirmName] = useState('');
  const [creating, setCreating] = useState(false);

  // Invite
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadData = async (token: string) => {
    try {
      const res = await fetch('/api/firm', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setFirm(d.firm || null);
      setMembers(d.members || []);
      setInvitations(d.invitations || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    if (!token || !user) {
      router.push('/?signup=1');
      return;
    }
    setAuthToken(token);
    try {
      setMyUserId(JSON.parse(user).id);
    } catch {}
    loadData(token);
  }, [router]);

  const createFirm = async () => {
    if (!firmName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/firm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ name: firmName.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'فشل إنشاء المكتب');
      setShowCreate(false);
      setFirmName('');
      await loadData(authToken!);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل إنشاء المكتب');
    } finally {
      setCreating(false);
    }
  };

  const invite = async () => {
    if (!invitePhone.trim() || inviting) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch('/api/firm/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ phone: invitePhone.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'فشل إرسال الدعوة');
      setInvitePhone('');
      setInviteMsg(d.joined ? 'تمت إضافة العضو للمكتب' : 'تم إرسال الدعوة — سينضم تلقائياً عند تسجيله بالرقم نفسه');
      await loadData(authToken!);
    } catch (e) {
      setInviteMsg(e instanceof Error ? e.message : 'فشل إرسال الدعوة');
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (userId: number, name: string) => {
    if (!confirm(`إزالة ${name} من المكتب؟`)) return;
    try {
      await fetch(`/api/firm/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await loadData(authToken!);
    } catch {}
  };

  const cancelInvite = async (invitationId: number) => {
    try {
      await fetch(`/api/firm/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await loadData(authToken!);
    } catch {}
  };

  const leaveFirm = async () => {
    if (!confirm('هل تريد مغادرة المكتب؟')) return;
    try {
      const res = await fetch('/api/firm/leave', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setFirm(null);
        setMembers([]);
        setInvitations([]);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg" dir="rtl">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-ink-900">مكتب المحاماة</h1>
        </div>

        {!firm ? (
          <div className="card p-12 text-center">
            <Building2 className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h2 className="font-bold text-ink-900 mb-2">أنشئ مكتبك لمشاركة القضايا مع فريقك</h2>
            <p className="text-sm text-ink-500 mb-6">
              عند إنشاء المكتب، كل قضية جديدة تنشئها ستكون متاحة لجميع أعضاء المكتب
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
            >
              <Plus className="w-5 h-5" />
              إنشاء مكتب
            </button>
          </div>
        ) : (
          <>
            {/* Firm header */}
            <div className="bg-white rounded-xl border border-ink-100 shadow-card p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-ink-900 mb-1">{firm.name}</h2>
                  <p className="text-sm text-ink-500">
                    {members.length} عضو · القضايا مشتركة بين جميع الأعضاء
                  </p>
                </div>
                {firm.my_role !== 'owner' && (
                  <button
                    onClick={leaveFirm}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    مغادرة المكتب
                  </button>
                )}
              </div>
            </div>

            {/* Invite */}
            <div className="bg-white rounded-xl border border-ink-100 shadow-card p-6 mb-6">
              <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-600" />
                دعوة عضو جديد
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    type="text"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="0501234567"
                    className="w-full pr-10 pl-4 py-2.5 bg-ink-50 border border-ink-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'ltr' }}
                  />
                </div>
                <button
                  onClick={invite}
                  disabled={inviting || invitePhone.length !== 10}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  دعوة
                </button>
              </div>
              {inviteMsg && <p className="text-xs text-ink-500 mt-2">{inviteMsg}</p>}
            </div>

            {/* Members */}
            <div className="bg-white rounded-xl border border-ink-100 shadow-card p-6 mb-6">
              <h3 className="font-bold text-ink-900 mb-4">الأعضاء</h3>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between border border-ink-100 bg-ink-50 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                        {m.first_name?.[0] || 'م'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-700">
                          {m.first_name} {m.last_name}
                          {m.id === myUserId && <span className="text-xs text-ink-400 mr-1">(أنت)</span>}
                        </p>
                        <p className="text-xs text-ink-400" style={{ direction: 'ltr', textAlign: 'right' }}>{m.phone}</p>
                      </div>
                      {m.role === 'owner' && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                          <Crown className="w-3 h-3" />
                          المالك
                        </span>
                      )}
                    </div>
                    {firm.my_role === 'owner' && m.id !== myUserId && (
                      <button
                        onClick={() => removeMember(m.id, `${m.first_name} ${m.last_name}`)}
                        className="p-1.5 text-red-400 hover:text-red-600"
                        title="إزالة من المكتب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <div className="bg-white rounded-xl border border-ink-100 shadow-card p-6">
                <h3 className="font-bold text-ink-900 mb-4">دعوات معلقة</h3>
                <p className="text-xs text-ink-400 mb-3">
                  هذه الأرقام لم تُسجل في الباحث بعد — ستنضم تلقائياً إلى مكتبك عند تسجيلها
                </p>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between border border-dashed border-ink-200 bg-ink-50 rounded-xl p-3">
                      <span className="text-sm text-ink-600" style={{ direction: 'ltr' }}>{inv.phone}</span>
                      <button
                        onClick={() => cancelInvite(inv.id)}
                        className="p-1.5 text-red-400 hover:text-red-600"
                        title="إلغاء الدعوة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create firm modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-2xl border border-ink-100 shadow-card-hover p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-ink-900">إنشاء مكتب محاماة</h2>
              <button onClick={() => setShowCreate(false)} className="text-ink-400 hover:text-ink-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">اسم المكتب</label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="مثال: مكتب الرياض للمحاماة"
                className="w-full px-4 py-2.5 bg-ink-50 border border-ink-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            <button
              onClick={createFirm}
              disabled={creating || !firmName.trim()}
              className="w-full mt-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Building2 className="w-5 h-5" />}
              إنشاء المكتب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
