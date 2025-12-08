#!/usr/bin/env python

from __future__ import with_statement

import logging
import stat
import errno
import time
from fuse import FUSE, FuseOSError, Operations

from sheet_api import SheetClient

class SheetFS(Operations):
    def __init__(self, root):
        self.root = root
        self.client = SheetClient()
        self.files = {} # Path -> {attrs, chunks, row_idx}
        self.load_metadata()

    def load_metadata(self):
        print("Loading metadata from Sheet...")
        self.files = self.client.get_metadata()
        # Ensure root exists
        if '/' not in self.files:
            now = time.time()
            self.files['/'] = {
                'attrs': dict(st_mode=(stat.S_IFDIR | 0o755), st_ctime=now, st_mtime=now, st_atime=now, st_nlink=2),
                'chunks': [],
                'row_idx': None
            }

    # Filesystem methods
    # ==================

    def getattr(self, path, fh=None):
        if path not in self.files:
            raise FuseOSError(errno.ENOENT)
        return self.files[path]['attrs']

    def readdir(self, path, fh):
        dirents = ['.', '..']
        if self.files[path]['attrs']['st_mode'] & stat.S_IFDIR:
            # Simple prefix match for directory contents
            # This is O(N), acceptable for small FS
            prefix = path if path == '/' else path + '/'
            for f in self.files:
                if f.startswith(prefix) and f != path:
                    # Check if it's a direct child
                    rest = f[len(prefix):]
                    if '/' not in rest:
                        dirents.append(rest)
        return dirents

    def mkdir(self, path, mode):
        now = time.time()
        self.files[path] = {
            'attrs': dict(st_mode=(stat.S_IFDIR | mode), st_nlink=2, st_ctime=now, st_mtime=now, st_atime=now),
            'chunks': [],
            'row_idx': None
        }
        self._sync_metadata(path)
        self.files['/']['attrs']['st_nlink'] += 1

    def create(self, path, mode):
        now = time.time()
        self.files[path] = {
            'attrs': dict(st_mode=(stat.S_IFREG | mode), st_nlink=1, st_size=0, st_ctime=now, st_mtime=now, st_atime=now),
            'chunks': [],
            'row_idx': None
        }
        self._sync_metadata(path)
        return 0

    def unlink(self, path):
        if path in self.files:
            row_idx = self.files[path].get('row_idx')
            if row_idx:
                self.client.delete_metadata(row_idx)
            del self.files[path]

    def rmdir(self, path):
        # Only empty
        if len(self.readdir(path, None)) > 2:
            raise FuseOSError(errno.ENOTEMPTY)
        self.unlink(path)
        self.files['/']['attrs']['st_nlink'] -= 1

    def rename(self, old, new):
        if old in self.files:
            self.files[new] = self.files.pop(old)
            self._sync_metadata(new)
            # Need to delete old metadata row if we want to be clean, 
            # but _sync_metadata(new) will create new row. 
            # Ideally we update the existing row with new path.
            # For now, simplistic approach: delete old, write new.
            # (In _sync_metadata, if row_idx exists it updates. 
            # But we moved it in memory, so it still has the old row_idx.
            # So updating it will overwrite the old entry with the new path. Correct.)

    def read(self, path, size, offset, fh):
        # Simplified read: Assume 1 chunk for now or concatenate all
        # To support random access properly, we need fixed size chunks.
        # Let's assume naive full-read for now.
        
        chunks = self.files[path]['chunks']
        data = b''
        for chunk_id in chunks:
            data += self.client.read_chunk(chunk_id)
        
        return data[offset:offset + size]

    def write(self, path, data, offset, fh):
        # Simplified write: overwrite everything or append?
        # FUSE often writes in blocks.
        # We will adopt a "One Chunk Per Write" or "Append Log" strategy
        # Actually, if we overwrite, we should probably read, modify, write new chunk.
        
        # Super naive: Read all, modify, write NEW chunk list.
        # (Very slow for large files, but consistent)
        
        existing_data = self.read(path, self.files[path]['attrs']['st_size'], 0, fh)
        
        # Extend if needed
        if offset + len(data) > len(existing_data):
            existing_data = existing_data + b'\0' * (offset + len(data) - len(existing_data))
            
        new_data = existing_data[:offset] + data + existing_data[offset+len(data):]
        
        # Write new chunk (Single chunk for now)
        chunk_id = self.client.write_chunk(new_data)
        
        self.files[path]['chunks'] = [chunk_id]
        self.files[path]['attrs']['st_size'] = len(new_data)
        self.files[path]['attrs']['st_mtime'] = time.time()
        
        self._sync_metadata(path)
        
        return len(data)

    def truncate(self, path, length, fh=None):
        existing_data = self.read(path, self.files[path]['attrs']['st_size'], 0, fh)
        new_data = existing_data[:length].ljust(length, b'\0')
        
        chunk_id = self.client.write_chunk(new_data)
        self.files[path]['chunks'] = [chunk_id]
        self.files[path]['attrs']['st_size'] = length
        self.files[path]['attrs']['st_mtime'] = time.time()
        self._sync_metadata(path)

    def _sync_metadata(self, path):
        item = self.files[path]
        new_row_idx = self.client.update_metadata(
            path, 
            item['attrs'], 
            item['chunks'], 
            item.get('row_idx')
        )
        item['row_idx'] = new_row_idx


