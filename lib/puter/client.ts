import { HiberFile, hiberFile } from '@/lib/storage/hiberfile';

export const puterClient = hiberFile;
// Backward compatibility for class usage
export class PuterClient extends HiberFile {}
