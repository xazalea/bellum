import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#0B0F1A', // Dark blue background for Apple Icon
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Pixel Art Submarine scaled up */}
        <svg
            width="128"
            height="128"
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
    { ...size },
  );
}
