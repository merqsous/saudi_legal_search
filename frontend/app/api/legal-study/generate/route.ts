import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const authHeader = request.headers.get('authorization');
  console.log('[legal-study/generate] auth header:', authHeader ? 'present' : 'MISSING');
  const body = await request.text();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 110000);

  try {
    const res = await fetch(`${apiUrl}/api/legal-study/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    clearTimeout(timeoutId);
    return NextResponse.json(
      { detail: 'Request timeout or error' },
      { status: 500 }
    );
  }
}
