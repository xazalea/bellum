/**
 * Android Content Providers
 * Manages data sharing between applications
 */

export interface ContentValues {
  [key: string]: any;
}

export interface Cursor {
  getCount(): number;
  moveToFirst(): boolean;
  moveToNext(): boolean;
  moveToPosition(position: number): boolean;
  getString(columnIndex: number): string | null;
  getInt(columnIndex: number): number;
  getLong(columnIndex: number): number;
  getFloat(columnIndex: number): number;
  getDouble(columnIndex: number): number;
  getBlob(columnIndex: number): Uint8Array | null;
  getColumnIndex(columnName: string): number;
  getColumnNames(): string[];
  isNull(columnIndex: number): boolean;
  close(): void;
}

export class CursorImpl implements Cursor {
  private position: number = -1;
  
  constructor(
    private rows: any[],
    private columns: string[]
  ) {}
  
  getCount(): number {
    return this.rows.length;
  }
  
  moveToFirst(): boolean {
    if (this.rows.length === 0) return false;
    this.position = 0;
    return true;
  }
  
  moveToNext(): boolean {
    if (this.position >= this.rows.length - 1) return false;
    this.position++;
    return true;
  }
  
  moveToPosition(position: number): boolean {
    if (position < 0 || position >= this.rows.length) return false;
    this.position = position;
    return true;
  }
  
  getString(columnIndex: number): string | null {
    const row = this.rows[this.position];
    const value = row[this.columns[columnIndex]];
    return value != null ? String(value) : null;
  }
  
  getInt(columnIndex: number): number {
    const row = this.rows[this.position];
    return Number(row[this.columns[columnIndex]]) || 0;
  }
  
  getLong(columnIndex: number): number {
    return this.getInt(columnIndex);
  }
  
  getFloat(columnIndex: number): number {
    const row = this.rows[this.position];
    return parseFloat(row[this.columns[columnIndex]]) || 0;
  }
  
  getDouble(columnIndex: number): number {
    return this.getFloat(columnIndex);
  }
  
  getBlob(columnIndex: number): Uint8Array | null {
    const row = this.rows[this.position];
    const value = row[this.columns[columnIndex]];
    return value instanceof Uint8Array ? value : null;
  }
  
  getColumnIndex(columnName: string): number {
    return this.columns.indexOf(columnName);
  }
  
  getColumnNames(): string[] {
    return [...this.columns];
  }
  
  isNull(columnIndex: number): boolean {
    const row = this.rows[this.position];
    return row[this.columns[columnIndex]] == null;
  }
  
  close(): void {
    this.position = -1;
  }
}

export interface Uri {
  scheme: string;
  authority: string;
  path: string;
  query?: string;
  fragment?: string;
  toString(): string;
}

export class UriImpl implements Uri {
  constructor(
    public scheme: string,
    public authority: string,
    public path: string,
    public query?: string,
    public fragment?: string
  ) {}
  
  toString(): string {
    let uri = `${this.scheme}://${this.authority}${this.path}`;
    if (this.query) uri += `?${this.query}`;
    if (this.fragment) uri += `#${this.fragment}`;
    return uri;
  }
  
  static parse(uriString: string): Uri {
    const match = uriString.match(/^(\w+):\/\/([^\/]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
    if (!match) {
      throw new Error(`Invalid URI: ${uriString}`);
    }
    
    return new UriImpl(
      match[1],
      match[2],
      match[3] || '/',
      match[4]?.substring(1),
      match[5]?.substring(1)
    );
  }
}

/**
 * Content Provider
 */
export abstract class ContentProvider {
  abstract authority: string;
  
  abstract query(
    uri: Uri,
    projection: string[] | null,
    selection: string | null,
    selectionArgs: string[] | null,
    sortOrder: string | null
  ): Cursor | null;
  
  abstract insert(uri: Uri, values: ContentValues): Uri | null;
  
  abstract update(
    uri: Uri,
    values: ContentValues,
    selection: string | null,
    selectionArgs: string[] | null
  ): number;
  
  abstract delete(
    uri: Uri,
    selection: string | null,
    selectionArgs: string[] | null
  ): number;
  
  abstract getType(uri: Uri): string | null;
  
  onCreate(): boolean {
    return true;
  }
}

/**
 * Content Resolver
 */
export class ContentResolver {
  private providers: Map<string, ContentProvider> = new Map();
  
  constructor() {
    console.log('[ContentResolver] Initialized');
    this.registerSystemProviders();
  }
  
  /**
   * Register system content providers
   */
  private registerSystemProviders(): void {
    // Register settings provider
    this.registerContentProvider(new SettingsProvider());
    
    // Register media provider
    this.registerContentProvider(new MediaProvider());
  }
  
  /**
   * Register content provider
   */
  registerContentProvider(provider: ContentProvider): void {
    this.providers.set(provider.authority, provider);
    provider.onCreate();
    console.log(`[ContentResolver] Registered provider: ${provider.authority}`);
  }
  
  /**
   * Query content provider
   */
  query(
    uri: Uri | string,
    projection: string[] | null = null,
    selection: string | null = null,
    selectionArgs: string[] | null = null,
    sortOrder: string | null = null
  ): Cursor | null {
    const parsedUri = typeof uri === 'string' ? UriImpl.parse(uri) : uri;
    const provider = this.providers.get(parsedUri.authority);
    
    if (!provider) {
      console.warn(`[ContentResolver] Provider not found: ${parsedUri.authority}`);
      return null;
    }
    
    return provider.query(parsedUri, projection, selection, selectionArgs, sortOrder);
  }
  
  /**
   * Insert into content provider
   */
  insert(uri: Uri | string, values: ContentValues): Uri | null {
    const parsedUri = typeof uri === 'string' ? UriImpl.parse(uri) : uri;
    const provider = this.providers.get(parsedUri.authority);
    
    if (!provider) {
      console.warn(`[ContentResolver] Provider not found: ${parsedUri.authority}`);
      return null;
    }
    
    return provider.insert(parsedUri, values);
  }
  
  /**
   * Update content provider
   */
  update(
    uri: Uri | string,
    values: ContentValues,
    selection: string | null = null,
    selectionArgs: string[] | null = null
  ): number {
    const parsedUri = typeof uri === 'string' ? UriImpl.parse(uri) : uri;
    const provider = this.providers.get(parsedUri.authority);
    
    if (!provider) {
      console.warn(`[ContentResolver] Provider not found: ${parsedUri.authority}`);
      return 0;
    }
    
    return provider.update(parsedUri, values, selection, selectionArgs);
  }
  
  /**
   * Delete from content provider
   */
  delete(
    uri: Uri | string,
    selection: string | null = null,
    selectionArgs: string[] | null = null
  ): number {
    const parsedUri = typeof uri === 'string' ? UriImpl.parse(uri) : uri;
    const provider = this.providers.get(parsedUri.authority);
    
    if (!provider) {
      console.warn(`[ContentResolver] Provider not found: ${parsedUri.authority}`);
      return 0;
    }
    
    return provider.delete(parsedUri, selection, selectionArgs);
  }
  
  /**
   * Get MIME type
   */
  getType(uri: Uri | string): string | null {
    const parsedUri = typeof uri === 'string' ? UriImpl.parse(uri) : uri;
    const provider = this.providers.get(parsedUri.authority);
    
    if (!provider) {
      return null;
    }
    
    return provider.getType(parsedUri);
  }
}

/**
 * Settings Provider
 */
class SettingsProvider extends ContentProvider {
  authority = 'settings';
  private settings: Map<string, string> = new Map();
  
  constructor() {
    super();
    // Initialize default settings
    this.settings.set('screen_brightness', '128');
    this.settings.set('volume_music', '15');
    this.settings.set('airplane_mode_on', '0');
  }
  
  query(
    uri: Uri,
    projection: string[] | null,
    selection: string | null,
    selectionArgs: string[] | null,
    sortOrder: string | null
  ): Cursor | null {
    const rows: any[] = [];
    const columns = ['name', 'value'];
    
    for (const [name, value] of this.settings) {
      rows.push({ name, value });
    }
    
    return new CursorImpl(rows, columns);
  }
  
  insert(uri: Uri, values: ContentValues): Uri | null {
    if (values.name && values.value !== undefined) {
      this.settings.set(values.name, String(values.value));
      return new UriImpl('content', this.authority, `/${values.name}`);
    }
    return null;
  }
  
  update(
    uri: Uri,
    values: ContentValues,
    selection: string | null,
    selectionArgs: string[] | null
  ): number {
    // Extract setting name from URI path
    const name = uri.path.substring(1);
    if (this.settings.has(name) && values.value !== undefined) {
      this.settings.set(name, String(values.value));
      return 1;
    }
    return 0;
  }
  
  delete(
    uri: Uri,
    selection: string | null,
    selectionArgs: string[] | null
  ): number {
    const name = uri.path.substring(1);
    if (this.settings.has(name)) {
      this.settings.delete(name);
      return 1;
    }
    return 0;
  }
  
  getType(uri: Uri): string | null {
    return 'vnd.android.cursor.item/setting';
  }
}

/**
 * Media Provider
 */
class MediaProvider extends ContentProvider {
  authority = 'media';
  private media: Map<number, any> = new Map();
  private nextId = 1;
  
  query(
    uri: Uri,
    projection: string[] | null,
    selection: string | null,
    selectionArgs: string[] | null,
    sortOrder: string | null
  ): Cursor | null {
    const rows: any[] = Array.from(this.media.values());
    const columns = projection || ['_id', 'title', 'uri', 'type'];
    
    return new CursorImpl(rows, columns);
  }
  
  insert(uri: Uri, values: ContentValues): Uri | null {
    const id = this.nextId++;
    this.media.set(id, { _id: id, ...values });
    return new UriImpl('content', this.authority, `/${id}`);
  }
  
  update(
    uri: Uri,
    values: ContentValues,
    selection: string | null,
    selectionArgs: string[] | null
  ): number {
    const id = parseInt(uri.path.substring(1));
    if (this.media.has(id)) {
      const existing = this.media.get(id);
      this.media.set(id, { ...existing, ...values });
      return 1;
    }
    return 0;
  }
  
  delete(
    uri: Uri,
    selection: string | null,
    selectionArgs: string[] | null
  ): number {
    const id = parseInt(uri.path.substring(1));
    if (this.media.has(id)) {
      this.media.delete(id);
      return 1;
    }
    return 0;
  }
  
  getType(uri: Uri): string | null {
    return 'vnd.android.cursor.dir/media';
  }
}
