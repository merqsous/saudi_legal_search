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
          <svg width="56" height="56" viewBox="0 0 1200 1200" fill="none" stroke="white" strokeWidth="30" strokeLinecap="round">
            <circle cx="480" cy="460" r="240" />
            <line x1="660" y1="640" x2="900" y2="880" strokeWidth="48" />
            <line x1="480" y1="300" x2="480" y2="580" strokeWidth="14" />
            <line x1="360" y1="380" x2="600" y2="380" strokeWidth="14" />
            <path d="M320 380 Q380 470 440 380" strokeWidth="12" />
            <path d="M520 380 Q580 470 640 380" strokeWidth="12" />
            <line x1="420" y1="580" x2="540" y2="580" strokeWidth="16" />
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 32,
            padding: '12px 40px',
            borderRadius: 12,
            background: '#0d9488',
            fontSize: 24,
            fontWeight: 600,
            color: 'white',
          }}
        >
          Search Now →
        </div>
      </div>
    ),
    size
  );
}
