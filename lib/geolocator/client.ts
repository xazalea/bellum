const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/geolocator/dist/geolocator.min.js';

let geolocatorPromise: Promise<any> | null = null;

async function ensureGeolocator(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).geolocator) return (window as any).geolocator;
  if (geolocatorPromise) return geolocatorPromise;

  geolocatorPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const geo = (window as any).geolocator;
      if (geo) {
        resolve(geo);
      } else {
        reject(new Error('geolocator not found'));
      }
    };
    script.onerror = (evt) => reject(new Error(`Failed to load geolocator: ${evt}`));
    document.head.appendChild(script);
  }).finally(() => {
    geolocatorPromise = null;
  });

  return geolocatorPromise;
}

export type GeneralArea = {
  label: string;
  country?: string;
  region?: string;
};

export async function locateGeneralArea(): Promise<GeneralArea | null> {
  if (typeof window === 'undefined') return null;
  try {
    const geolocator = await ensureGeolocator();
    if (!geolocator) return null;
    geolocator.config({ language: 'en', google: { version: '3', key: '' } });

    return await new Promise<GeneralArea | null>((resolve) => {
      geolocator.locate(
        {
          enableHighAccuracy: false,
          timeout: 7000,
          maximumWait: 10000,
          fallbackToIP: true,
          addressLookup: true,
        },
        (err: any, location: any) => {
          if (err || !location?.address) {
            resolve(null);
            return;
          }
          resolve({
            label: location.address.city || location.address.region || location.address.country || 'Unknown',
            country: location.address.country,
            region: location.address.region,
          });
        },
      );
    });
  } catch (e) {
    console.warn('Geolocator lookup failed', e);
    return null;
  }
}


