import { ImageResponse } from 'next/og';
import fs from 'node:fs/promises';
import path from 'node:path';

/* eslint-disable @next/next/no-img-element */

export const runtime = 'nodejs';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  const file = await fs.readFile(path.join(process.cwd(), 'public', 'branding', 'nacho.jpeg'));
  const src = `data:image/jpeg;base64,${file.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#232634',
        }}
      >
        <div
          style={{
            width: 156,
            height: 156,
            display: 'flex',
            borderRadius: 9999,
            overflow: 'hidden',
            border: '10px solid rgba(186,187,241,0.9)',
          }}
        >
          <img
            src={src}
            alt=""
            width={156}
            height={156}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}

