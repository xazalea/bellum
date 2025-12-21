export interface ISOConfig {
  id: string;
  name: string;
  githubUrl?: string;
  cdnUrl?: string;
  proxyUrl?: string;
  localPath?: string;
  size?: number;
  checksum?: string;
}

export const ISO_CONFIGS: Record<string, ISOConfig> = {
  'android-x86-9.0-r2': {
    id: 'android-x86-9.0-r2',
    name: 'Android x86 9.0 R2',
    githubUrl: 'https://github.com/xazalea/bellum/releases/download/v1.0/android-x86-9.0-r2.iso',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/xazalea/bellum@v1.0/android-x86-9.0-r2.iso',
    proxyUrl: '/api/isos/android-x86-9.0-r2',
  },
  windows98: {
    id: 'windows98',
    name: 'Windows 98 SE',
    githubUrl: 'https://github.com/xazalea/bellum/releases/download/v1.0/windows98.iso',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/xazalea/bellum@v1.0/windows98.iso',
    proxyUrl: '/api/isos/windows98',
  },
};

