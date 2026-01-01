import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

// Ensure data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
};

// Generic database service for JSON file storage
class DatabaseService<T extends { id: string }> {
  private filePath: string;
  private data: T[] = [];

  constructor(fileName: string) {
    ensureDataDir();
    this.filePath = path.join(config.dataDir, `${fileName}.json`);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(content);
      } else {
        this.data = [];
        this.save();
      }
    } catch (error) {
      console.error(`Error loading ${this.filePath}:`, error);
      this.data = [];
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error(`Error saving ${this.filePath}:`, error);
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


