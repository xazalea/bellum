import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  uploadBytesResumable,
  UploadTask
} from 'firebase/storage';
import { storage } from './config';
import { authService } from './auth-service';

export interface GameFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  url: string;
  path: string;
}

class StorageService {
  // Upload a game file with progress tracking
  uploadGameFile(file: File, onProgress?: (progress: number) => void): UploadTask {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User must be authenticated to upload files');

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `users/${user.uid}/games/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, filePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    // Monitor upload progress
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      }
    );

    return uploadTask;
  }

  // Get download URL for a file
  async getFileURL(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  }

  // List all game files for current user
  async listUserGames(): Promise<GameFile[]> {
    const user = authService.getCurrentUser();
    if (!user) return [];

    const gamesRef = ref(storage, `users/${user.uid}/games`);
    const result = await listAll(gamesRef);

    const files: GameFile[] = [];
    
    for (const itemRef of result.items) {
      try {
        const metadata = await getMetadata(itemRef);
        const url = await getDownloadURL(itemRef);
        
        files.push({
          id: itemRef.name,
          name: metadata.name,
          size: metadata.size,
          type: metadata.contentType || 'application/octet-stream',
          uploadedAt: new Date(metadata.timeCreated).getTime(),
          url,
          path: itemRef.fullPath
        });
      } catch (error) {
        console.error('Error fetching file metadata:', error);
      }
    }

    // Update user's storage usage
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    await authService.updateStorageUsage(totalSize);

    return files.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  // Delete a game file
  async deleteGameFile(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);

    // Recalculate storage usage
    const games = await this.listUserGames();
    const totalSize = games.reduce((sum, file) => sum + file.size, 0);
    await authService.updateStorageUsage(totalSize);
  }

  // Get file as blob for processing
  async getFileBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch file');
    return await response.blob();
  }

  // Format bytes to human-readable size
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

export const storageService = new StorageService();
