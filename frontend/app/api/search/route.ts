import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const searchParams = request.nextUrl.searchParams.toString();
  const phone = request.headers.get('x-user-phone') || '';
  const clientIp = request.headers.get('x-forwarded-for') || '';

  try {
    const res = await fetch(`${apiUrl}/api/search?${searchParams}`, {
      headers: { 'X-User-Phone': phone, 'X-Forwarded-For': clientIp },
      cache: 'no-store',
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { results: [], total: 0, error: 'proxy_error' },
      { status: 500 }
    );
  }
}
