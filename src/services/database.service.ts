import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

// Check if Supabase is configured (skip JSON file loading if so)
const isSupabaseConfigured = (): boolean => {
  return !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY));
};

// Ensure data directory exists (only if not using Supabase)
const ensureDataDir = () => {
  if (isSupabaseConfigured()) return;
  
  try {
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }
  } catch (error) {
    console.warn('⚠️ Could not create data directory, using memory-only storage');
  }
};

// Check if we can write to filesystem
const canWriteToFilesystem = (): boolean => {
  if (isSupabaseConfigured()) return false;
  
  try {
    const testFile = path.join(config.dataDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
};

// Generic database service for JSON file storage (legacy - use Supabase models instead)
class DatabaseService<T extends { id: string }> {
  private filePath: string;
  private data: T[] = [];
  private useFilesystem: boolean = false;
  private fileName: string;
  private usingSupabase: boolean = false;

  constructor(fileName: string) {
    this.fileName = fileName;
    this.usingSupabase = isSupabaseConfigured();
    
    if (this.usingSupabase) {
      // Skip file loading when using Supabase
      this.useFilesystem = false;
      this.filePath = '';
      this.data = [];
      return;
    }
    
    ensureDataDir();
    this.filePath = path.join(config.dataDir, `${fileName}.json`);
    this.useFilesystem = canWriteToFilesystem();
    
    if (!this.useFilesystem) {
      console.warn(`⚠️ [${fileName}] Filesystem not writable, using memory-only storage`);
    }
    
    this.load();
  }

  private load(): void {
    if (this.usingSupabase) return;
    
    try {
      if (this.useFilesystem && fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(content);
        console.log(`📂 [${this.fileName}] Loaded ${this.data.length} records from file`);
      } else {
        this.data = [];
        if (this.useFilesystem) {
          this.save();
        }
      }
    } catch (error) {
      console.error(`Error loading ${this.filePath}:`, error);
      this.data = [];
    }
  }

  private save(): void {
    if (this.usingSupabase || !this.useFilesystem) {
      return;
    }
    
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error(`Error saving ${this.filePath}:`, error);
    }
  }
  
  reload(): void {
    if (!this.usingSupabase) {
      this.load();
    }
  }

  findAll(): T[] {
    return [...this.data];
  }

  findById(id: string): T | undefined {
    return this.data.find(item => item.id === id);
  }

  findOne(predicate: (item: T) => boolean): T | undefined {
    return this.data.find(predicate);
  }

  findMany(predicate: (item: T) => boolean): T[] {
    return this.data.filter(predicate);
  }

  create(item: T): T {
    this.data.push(item);
    this.save();
    return item;
  }

  update(id: string, updates: Partial<T>): T | undefined {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) return undefined;
    
    this.data[index] = { ...this.data[index], ...updates };
    this.save();
    return this.data[index];
  }

  delete(id: string): boolean {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    this.data.splice(index, 1);
    this.save();
    return true;
  }

  count(): number {
    return this.data.length;
  }

  countWhere(predicate: (item: T) => boolean): number {
    return this.data.filter(predicate).length;
  }
}

export default DatabaseService;
