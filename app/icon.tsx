import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'transparent',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Pixel Art Submarine constructed with CSS/divs or SVG */}
        <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
             {/* Submarine Body */}
            <rect x="8" y="14" width="16" height="8" rx="2" fill="#F472B6" />
             {/* Conning Tower */}
            <rect x="14" y="10" width="6" height="4" fill="#F472B6" />
             {/* Periscope */}
            <rect x="16" y="6" width="2" height="4" fill="#F472B6" />
            <rect x="18" y="6" width="4" height="2" fill="#F472B6" />
             {/* Window */}
            <rect x="20" y="16" width="2" height="2" fill="#A8B4D0" />
            <rect x="14" y="16" width="2" height="2" fill="#A8B4D0" />
            
             {/* Propeller */}
            <rect x="4" y="16" width="4" height="4" fill="#64748B" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
