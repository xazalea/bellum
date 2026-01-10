/**
 * Virtual File System (VFS)
 * Unified file system interface for Windows and Android
 * Backed by IndexedDB/OPFS for persistent storage
 */

export enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory',
  SYMLINK = 'symlink',
  DEVICE = 'device',
}

export enum FileMode {
  READ = 0x01,
  WRITE = 0x02,
  EXECUTE = 0x04,
  USER_READ = 0x100,
  USER_WRITE = 0x080,
  USER_EXECUTE = 0x040,
  GROUP_READ = 0x020,
  GROUP_WRITE = 0x010,
  GROUP_EXECUTE = 0x008,
  OTHER_READ = 0x004,
  OTHER_WRITE = 0x002,
  OTHER_EXECUTE = 0x001,
}

export interface FileStats {
  type: FileType;
  size: number;
  mode: number;
  uid: number;
  gid: number;
  atime: number; // Access time
  mtime: number; // Modification time
  ctime: number; // Change time
  blocks: number;
  blockSize: number;
}

export interface DirEntry {
  name: string;
  type: FileType;
  inode: number;
}

export interface INode {
  id: number;
  type: FileType;
  mode: number;
  uid: number;
  gid: number;
  size: number;
  atime: number;
  mtime: number;
  ctime: number;
  links: number;
  blocks: number[];
  data?: Uint8Array; // For small files
  target?: string; // For symlinks
}

/**
 * Virtual File System
 */
export class VFS {
  private mountPoints: Map<string, FileSystemBackend> = new Map();
  private openFiles: Map<number, OpenFile> = new Map();
  private nextFd = 3; // Start after stdin/stdout/stderr
  private nextInode = 1;
  private inodes: Map<number, INode> = new Map();
  private pathToInode: Map<string, number> = new Map();
  
  // Current working directory
  private cwd: string = '/';
  
  constructor() {
    console.log('[VFS] Initialized');
    this.initializeRootFS();
  }
  
  /**
   * Initialize root file system
   */
  private initializeRootFS(): void {
    // Create root directory
    const rootInode: INode = {
      id: this.nextInode++,
      type: FileType.DIRECTORY,
      mode: 0o755,
      uid: 0,
      gid: 0,
      size: 0,
      atime: Date.now(),
      mtime: Date.now(),
      ctime: Date.now(),
      links: 2,
      blocks: [],
    };
    
    this.inodes.set(rootInode.id, rootInode);
    this.pathToInode.set('/', rootInode.id);
    
    // Create standard directories
    for (const dir of ['/tmp', '/home', '/usr', '/etc', '/var', '/data']) {
      this.mkdir(dir, 0o755);
    }
  }
  
  /**
   * Mount file system at path
   */
  mount(path: string, backend: FileSystemBackend): void {
    this.mountPoints.set(this.normalizePath(path), backend);
    console.log(`[VFS] Mounted file system at ${path}`);
  }
  
  /**
   * Unmount file system
   */
  unmount(path: string): void {
    this.mountPoints.delete(this.normalizePath(path));
    console.log(`[VFS] Unmounted file system at ${path}`);
  }
  
  /**
   * Open file
   */
  open(path: string, flags: number, mode: number = 0o644): number {
    const normalPath = this.resolvePath(path);
    let inodeId = this.pathToInode.get(normalPath);
    
    // Check if file exists
    if (!inodeId) {
      // Create new file if O_CREAT flag set
      if (flags & 0x40) { // O_CREAT
        inodeId = this.createFile(normalPath, mode);
      } else {
        throw new Error(`File not found: ${path}`);
      }
    }
    
    const inode = this.inodes.get(inodeId)!;
    
    // Check if it's a directory
    if (inode.type === FileType.DIRECTORY && !(flags & 0x200000)) { // O_DIRECTORY
      throw new Error(`Is a directory: ${path}`);
    }
    
    const fd = this.nextFd++;
    const openFile: OpenFile = {
      fd,
      inode: inodeId,
      path: normalPath,
      flags,
      position: 0,
    };
    
    this.openFiles.set(fd, openFile);
    
    // Update access time
    inode.atime = Date.now();
    
    return fd;
  }
  
  /**
   * Create file
   */
  private createFile(path: string, mode: number): number {
    const inode: INode = {
      id: this.nextInode++,
      type: FileType.FILE,
      mode,
      uid: 0,
      gid: 0,
      size: 0,
      atime: Date.now(),
      mtime: Date.now(),
      ctime: Date.now(),
      links: 1,
      blocks: [],
      data: new Uint8Array(0),
    };
    
    this.inodes.set(inode.id, inode);
    this.pathToInode.set(path, inode.id);
    
    return inode.id;
  }
  
  /**
   * Read from file
   */
  read(fd: number, buffer: Uint8Array, offset: number, length: number): number {
    const file = this.openFiles.get(fd);
    if (!file) throw new Error('Bad file descriptor');
    
    const inode = this.inodes.get(file.inode)!;
    
    if (!inode.data) {
      return 0; // No data
    }
    
    const start = file.position;
    const end = Math.min(start + length, inode.data.length);
    const bytesRead = end - start;
    
    buffer.set(inode.data.subarray(start, end), offset);
    file.position = end;
    
    // Update access time
    inode.atime = Date.now();
    
    return bytesRead;
  }
  
  /**
   * Write to file
   */
  write(fd: number, buffer: Uint8Array, offset: number, length: number): number {
    const file = this.openFiles.get(fd);
    if (!file) throw new Error('Bad file descriptor');
    
    const inode = this.inodes.get(file.inode)!;
    
    // Ensure data buffer exists and is large enough
    const requiredSize = file.position + length;
    if (!inode.data || inode.data.length < requiredSize) {
      const newData = new Uint8Array(requiredSize);
      if (inode.data) {
        newData.set(inode.data);
      }
      inode.data = newData;
    }
    
    // Write data
    inode.data.set(buffer.subarray(offset, offset + length), file.position);
    file.position += length;
    
    // Update size and times
    inode.size = Math.max(inode.size, file.position);
    inode.mtime = Date.now();
    inode.ctime = Date.now();
    
    return length;
  }
  
  /**
   * Close file
   */
  close(fd: number): void {
    const file = this.openFiles.get(fd);
    if (!file) return;
    
    this.openFiles.delete(fd);
  }
  
  /**
   * Seek in file
   */
  lseek(fd: number, offset: number, whence: number): number {
    const file = this.openFiles.get(fd);
    if (!file) throw new Error('Bad file descriptor');
    
    const inode = this.inodes.get(file.inode)!;
    
    switch (whence) {
      case 0: // SEEK_SET
        file.position = offset;
        break;
      case 1: // SEEK_CUR
        file.position += offset;
        break;
      case 2: // SEEK_END
        file.position = inode.size + offset;
        break;
    }
    
    return file.position;
  }
  
  /**
   * Get file stats
   */
  stat(path: string): FileStats {
    const normalPath = this.resolvePath(path);
    const inodeId = this.pathToInode.get(normalPath);
    
    if (!inodeId) {
      throw new Error(`File not found: ${path}`);
    }
    
    const inode = this.inodes.get(inodeId)!;
    
    return {
      type: inode.type,
      size: inode.size,
      mode: inode.mode,
      uid: inode.uid,
      gid: inode.gid,
      atime: inode.atime,
      mtime: inode.mtime,
      ctime: inode.ctime,
      blocks: inode.blocks.length,
      blockSize: 4096,
    };
  }
  
  /**
   * Get file stats by file descriptor
   */
  fstat(fd: number): FileStats {
    const file = this.openFiles.get(fd);
    if (!file) throw new Error('Bad file descriptor');
    
    return this.stat(file.path);
  }
  
  /**
   * Create directory
   */
  mkdir(path: string, mode: number = 0o755): void {
    const normalPath = this.resolvePath(path);
    
    if (this.pathToInode.has(normalPath)) {
      throw new Error(`File exists: ${path}`);
    }
    
    const inode: INode = {
      id: this.nextInode++,
      type: FileType.DIRECTORY,
      mode,
      uid: 0,
      gid: 0,
      size: 0,
      atime: Date.now(),
      mtime: Date.now(),
      ctime: Date.now(),
      links: 2,
      blocks: [],
    };
    
    this.inodes.set(inode.id, inode);
    this.pathToInode.set(normalPath, inode.id);
    
    console.log(`[VFS] Created directory: ${normalPath}`);
  }
  
  /**
   * Read directory
   */
  readdir(path: string): DirEntry[] {
    const normalPath = this.resolvePath(path);
    const entries: DirEntry[] = [];
    
    // Find all entries under this directory
    for (const [entryPath, inodeId] of this.pathToInode) {
      if (entryPath.startsWith(normalPath + '/')) {
        const relativePath = entryPath.substring(normalPath.length + 1);
        if (!relativePath.includes('/')) {
          const inode = this.inodes.get(inodeId)!;
          entries.push({
            name: relativePath,
            type: inode.type,
            inode: inodeId,
          });
        }
      }
    }
    
    return entries;
  }
  
  /**
   * Remove file
   */
  unlink(path: string): void {
    const normalPath = this.resolvePath(path);
    const inodeId = this.pathToInode.get(normalPath);
    
    if (!inodeId) {
      throw new Error(`File not found: ${path}`);
    }
    
    const inode = this.inodes.get(inodeId)!;
    
    if (inode.type === FileType.DIRECTORY) {
      throw new Error(`Is a directory: ${path}`);
    }
    
    inode.links--;
    if (inode.links === 0) {
      this.inodes.delete(inodeId);
    }
    
    this.pathToInode.delete(normalPath);
  }
  
  /**
   * Remove directory
   */
  rmdir(path: string): void {
    const normalPath = this.resolvePath(path);
    const inodeId = this.pathToInode.get(normalPath);
    
    if (!inodeId) {
      throw new Error(`Directory not found: ${path}`);
    }
    
    const inode = this.inodes.get(inodeId)!;
    
    if (inode.type !== FileType.DIRECTORY) {
      throw new Error(`Not a directory: ${path}`);
    }
    
    // Check if directory is empty
    const entries = this.readdir(path);
    if (entries.length > 0) {
      throw new Error(`Directory not empty: ${path}`);
    }
    
    this.inodes.delete(inodeId);
    this.pathToInode.delete(normalPath);
  }
  
  /**
   * Rename file
   */
  rename(oldPath: string, newPath: string): void {
    const oldNormalPath = this.resolvePath(oldPath);
    const newNormalPath = this.resolvePath(newPath);
    
    const inodeId = this.pathToInode.get(oldNormalPath);
    if (!inodeId) {
      throw new Error(`File not found: ${oldPath}`);
    }
    
    this.pathToInode.delete(oldNormalPath);
    this.pathToInode.set(newNormalPath, inodeId);
  }
  
  /**
   * Change current working directory
   */
  chdir(path: string): void {
    const normalPath = this.resolvePath(path);
    const inodeId = this.pathToInode.get(normalPath);
    
    if (!inodeId) {
      throw new Error(`Directory not found: ${path}`);
    }
    
    const inode = this.inodes.get(inodeId)!;
    if (inode.type !== FileType.DIRECTORY) {
      throw new Error(`Not a directory: ${path}`);
    }
    
    this.cwd = normalPath;
  }
  
  /**
   * Get current working directory
   */
  getcwd(): string {
    return this.cwd;
  }
  
  /**
   * Resolve path (handle relative paths, .., .)
   */
  private resolvePath(path: string): string {
    let normalPath = path;
    
    // Handle relative paths
    if (!path.startsWith('/')) {
      normalPath = this.cwd + '/' + path;
    }
    
    return this.normalizePath(normalPath);
  }
  
  /**
   * Normalize path (remove .., ., multiple /)
   */
  private normalizePath(path: string): string {
    const parts = path.split('/').filter(p => p && p !== '.');
    const result: string[] = [];
    
    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else {
        result.push(part);
      }
    }
    
    return '/' + result.join('/');
  }
  
  /**
   * Sync file system to persistent storage
   */
  async sync(): Promise<void> {
    console.log('[VFS] Syncing to persistent storage...');
    
    // In real implementation, would write inodes and data to IndexedDB/OPFS
    // For now, just log
    console.log(`[VFS] ${this.inodes.size} inodes, ${this.pathToInode.size} paths`);
  }
}

/**
 * File System Backend Interface
 */
export interface FileSystemBackend {
  read(inode: number, offset: number, length: number): Promise<Uint8Array>;
  write(inode: number, offset: number, data: Uint8Array): Promise<void>;
  allocateBlocks(count: number): Promise<number[]>;
  freeBlocks(blocks: number[]): Promise<void>;
}

/**
 * Open File
 */
interface OpenFile {
  fd: number;
  inode: number;
  path: string;
  flags: number;
  position: number;
}
