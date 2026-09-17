'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, Upload, Trash2, Download, Sparkles, X } from 'lucide-react';

interface CaseDocument {
  id: number;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  has_text: boolean;
  created_at: string;
}

export default function DocumentsSection({ caseId, authToken }: { caseId: string; authToken: string }) {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<{ filename: string; text: string } | null>(null);
  const [question, setQuestion] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/documents`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const d = await res.json();
      setDocuments(d.documents || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (authToken) loadDocs();
  }, [caseId, authToken]);

  const handleUpload = async (file: File) => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/cases/${caseId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: form,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'فشل رفع الملف');
      }
      await loadDocs();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل رفع الملف');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const analyze = async (doc: CaseDocument, q?: string) => {
    if (analyzing) return;
    setAnalyzing(doc.id);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${doc.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ question: q || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'فشل التحليل');
      setAnalysis({ filename: doc.filename, text: d.analysis });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل التحليل');
    } finally {
      setAnalyzing(null);
      setQuestion('');
    }
  };

  const deleteDoc = async (docId: number) => {
    if (!confirm('حذف هذا المستند؟')) return;
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    try {
      await fetch(`/api/cases/${caseId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  };

  return (
    <div className="bg-white rounded-xl border border-ink-100 shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-ink-900">مستندات القضية</h2>
          <span className="text-xs text-ink-400">({documents.length})</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          رفع مستند
        </button>
      </div>

      <p className="text-xs text-ink-400 mb-4">
        ارفع صحائف الدعاوى والعقود والمستندات ذات الصلة (PDF أو Word حتى 10 ميجابايت) ليقوم المساعد بتحليلها واستخلاص النقاط الجوهرية.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-ink-400 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-8">لا توجد مستندات مرفوعة</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="border border-ink-100 bg-ink-50 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-primary-600 shrink-0" />
                  <span className="text-sm font-medium text-ink-700 truncate">{doc.filename}</span>
                  <span className="text-xs text-ink-400 shrink-0">{formatSize(doc.size_bytes)}</span>
                  {doc.has_text && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 shrink-0">جاهز للتحليل</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.has_text && (
                    <button
                      onClick={() => analyze(doc)}
                      disabled={analyzing !== null}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg font-medium disabled:opacity-50"
                    >
                      {analyzing === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      تحليل
                    </button>
                  )}
                  <a
                    href={`/api/cases/${caseId}/documents/${doc.id}/download`}
                    onClick={(e) => {
                      e.preventDefault();
                      downloadWithAuth(doc);
                    }}
                    className="p-1.5 text-ink-400 hover:text-primary-600"
                    title="تنزيل"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="p-1.5 text-red-400 hover:text-red-600"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analysis modal */}
      {analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-ink-100 shadow-card-hover p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-ink-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  تحليل المستند
                </h3>
                <p className="text-xs text-ink-400 mt-0.5">{analysis.filename}</p>
              </div>
              <button onClick={() => setAnalysis(null)} className="text-ink-400 hover:text-ink-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-ink-50 border border-ink-100 rounded-xl p-4 mb-4">
              {analysis.text.split('\n').map((line, i) => {
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

            {/* Follow-up question */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="اسأل سؤالاً محدداً عن المستند..."
                className="flex-1 px-3.5 py-2.5 bg-ink-50 border border-ink-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && question.trim()) {
                    const doc = documents.find((d) => d.filename === analysis.filename);
                    if (doc) analyze(doc, question.trim());
                  }
                }}
              />
              <button
                onClick={() => {
                  const doc = documents.find((d) => d.filename === analysis.filename);
                  if (doc && question.trim()) analyze(doc, question.trim());
                }}
                disabled={analyzing !== null || !question.trim()}
                className="px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {analyzing !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : 'اسأل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function downloadWithAuth(doc: CaseDocument) {
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('فشل تنزيل الملف');
    }
  }
}
