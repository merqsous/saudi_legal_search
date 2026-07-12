import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
            borderRadius: 24,
            background: '#0d9488',
            marginBottom: 32,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 16l3-8 3 8c-2-1.5-4-1.5-6 0" />
            <path d="M2 16l3-8 3 8c-2-1.5-4-1.5-6 0" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </svg>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: 'white', marginBottom: 16 }}>
          AlBaheth
        </div>
        <div style={{ fontSize: 28, color: '#94a3b8', textAlign: 'center', maxWidth: 800 }}>
          Saudi Legal Judgments Search Engine
        </div>
        <div style={{ fontSize: 20, color: '#0d9488', marginTop: 16 }}>
          albaheth.app
        </div>
      </div>
    ),
    size
  );
}
