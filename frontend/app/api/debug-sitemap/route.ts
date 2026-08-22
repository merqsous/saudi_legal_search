import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://albaheth.app';
  const info: any = { apiUrl, env_present: !!process.env.NEXT_PUBLIC_API_URL };

  try {
    const start = Date.now();
    const res = await fetch(`${apiUrl}/api/judgments/ids?limit=49000`, { cache: 'no-store' });
    info.status = res.status;
    info.ok = res.ok;
    info.duration_ms = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      info.ids_count = (data.ids || []).length;
    } else {
      info.body = await res.text();
    }
  } catch (e: any) {
    info.error = e?.message || String(e);
    info.stack = e?.stack;
  }

  return NextResponse.json(info);
}
