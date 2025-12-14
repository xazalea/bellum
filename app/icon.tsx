import { ImageResponse } from 'next/og';
import fs from 'node:fs/promises';
import path from 'node:path';

/* eslint-disable @next/next/no-img-element */

export const runtime = 'nodejs';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default async function Icon() {
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
          background: '#232634', // Catppuccin Frappe crust
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            display: 'flex',
            borderRadius: 9999,
            overflow: 'hidden',
            border: '4px solid rgba(186,187,241,0.9)', // frappe lavender
          }}
        >
          <img
            src={src}
            alt=""
            width={56}
            height={56}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}

