export function slugify(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FF\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function judgmentSlug(judgment: {
  court_type?: string | null;
  court_level?: string | null;
  city?: string | null;
  judgment_number?: string | null;
}): string {
  const parts = [
    'حكم',
    judgment.court_type || '',
    judgment.court_level || '',
    judgment.city || '',
    judgment.judgment_number ? `رقم-${judgment.judgment_number}` : '',
  ].filter(Boolean);
  return slugify(parts.join(' '));
}

export function threadUrl(thread: { id: number | string; formal_question?: string | null; canonical_question?: string | null; question?: string | null }): string {
  const title = thread.formal_question || thread.canonical_question || thread.question || '';
  const slug = slugify(title);
  return slug ? `/procedural/${thread.id}/${slug}` : `/procedural/${thread.id}`;
}

export function judgmentUrl(id: number | string, judgment: {
  court_type?: string | null;
  court_level?: string | null;
  city?: string | null;
  judgment_number?: string | null;
}): string {
  const slug = judgmentSlug(judgment);
  return slug ? `/judgment/${id}/${slug}` : `/judgment/${id}`;
}
