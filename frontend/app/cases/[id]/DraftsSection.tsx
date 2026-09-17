'use client';

import { useState, useEffect } from 'react';
import { PenTool, Loader2, Trash2, Download, X, FileText } from 'lucide-react';

interface Draft {
  id: number;
  doc_type: string;
  instructions: string | null;
  content_length: number;
  created_at: string;
}

const DOC_TYPES = [
  { key: 'pleading', label: 'لائحة دعوى' },
  { key: 'memo', label: 'مذكرة دفاع' },
  { key: 'letter', label: 'خطاب رسمي' },
  { key: 'legal_opinion', label: 'رأي قانوني' },
];

const typeLabel = (t: string) => DOC_TYPES.find((d) => d.key === t)?.label || t;

export default function DraftsSection({ caseId, authToken }: { caseId: string; authToken: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [docType, setDocType] = useState('pleading');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewed, setViewed] = useState<{ id: number; content: string; doc_type: string } | null>(null);

  const loadDrafts = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/drafts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const d = await res.json();
      setDrafts(d.drafts || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (authToken) loadDrafts();
  }, [caseId, authToken]);

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ doc_type: docType, instructions: instructions.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'فشل التوليد');
      setShowCreate(false);
      setInstructions('');
      setViewed({ id: d.draft_id, content: d.content, doc_type: docType });
      await loadDrafts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التوليد');
    } finally {
      setGenerating(false);
    }
  };

  const openDraft = async (draftId: number) => {
    try {
      const res = await fetch(`/api/cases/drafts/${draftId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const d = await res.json();
      if (res.ok) setViewed({ id: d.id, content: d.content, doc_type: d.doc_type });
    } catch {}
  };

  const deleteDraft = async (draftId: number) => {
    if (!confirm('حذف هذا المستند؟')) return;
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    if (viewed?.id === draftId) setViewed(null);
    try {
      await fetch(`/api/cases/drafts/${draftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
  };

  return (
    <div className="bg-white rounded-xl border border-ink-100 shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-ink-900">صياغة المستندات</h2>
          <span className="text-xs text-ink-400">({drafts.length})</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          <PenTool className="w-3.5 h-3.5" />
          مستند جديد
        </button>
      </div>

      <p className="text-xs text-ink-400 mb-4">
        ولّد لوائح الدعاوى ومذكرات الدفاع والآراء القانونية من معلومات القضية والأحكام المرتبطة بها — ثم صدّرها إلى Word
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-ink-400 animate-spin" />
        </div>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-8">لا توجد مستندات مولدة بعد</p>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div key={draft.id} className="border border-ink-100 bg-ink-50 rounded-xl p-3 flex items-center justify-between gap-2">
              <button onClick={() => openDraft(draft.id)} className="flex items-center gap-2 min-w-0 flex-1 text-right">
                <FileText className="w-4 h-4 text-primary-600 shrink-0" />
                <span className="text-sm font-medium text-ink-700">{typeLabel(draft.doc_type)}</span>
                <span className="text-xs text-ink-400 shrink-0">
                  {new Date(draft.created_at).toLocaleDateString('ar-SA-u-ca-gregory')}
                </span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`/api/cases/drafts/${draft.id}/export/docx?token=${authToken}`}
                  className="p-1.5 text-ink-400 hover:text-primary-600"
                  title="تنزيل Word"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => deleteDraft(draft.id)} className="p-1.5 text-red-400 hover:text-red-600" title="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-2xl border border-ink-100 shadow-card-hover p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-ink-900">صياغة مستند جديد</h2>
              <button onClick={() => setShowCreate(false)} className="text-ink-400 hover:text-ink-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">نوع المستند</label>
                <div className="grid grid-cols-2 gap-2">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setDocType(t.key)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                        docType === t.key
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-ink-50 text-ink-600 border-ink-100 hover:border-primary-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">تعليمات إضافية (اختياري)</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="مثال: ركز على مطالبة التعويض عن الأضرار المادية فقط"
                  className="w-full px-4 py-2.5 bg-ink-50 border border-ink-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              onClick={generate}
              disabled={generating}
              className="w-full mt-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الصياغة... قد يستغرق دقيقة
                </>
              ) : (
                <>
                  <PenTool className="w-5 h-5" />
                  توليد المستند
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* View draft modal */}
      {viewed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-ink-100 shadow-card-hover p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink-900">{typeLabel(viewed.doc_type)}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/cases/drafts/${viewed.id}/export/docx?token=${authToken}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                >
                  <Download className="w-4 h-4" />
                  Word
                </a>
                <button onClick={() => setViewed(null)} className="text-ink-400 hover:text-ink-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-ink-50 border border-ink-100 rounded-xl p-5">
              {viewed.content.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1.5" />;
                const isHeading = /^#{1,4}\s/.test(trimmed);
                const clean = trimmed.replace(/^#{1,4}\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1');
                return isHeading ? (
                  <p key={i} className="font-bold text-primary-900 text-sm mt-3 mb-1">{clean}</p>
                ) : (
                  <p key={i} className="text-sm text-ink-700 leading-relaxed mb-1.5">{clean}</p>
                );
              })}
            </div>

            <p className="text-xs text-ink-400 mt-3">
              هذا المستند مولد آلياً ويخضع لمراجعة المحامي قبل الاعتماد
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
