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
class DatabaseService {
    filePath;
    data = [];
    constructor(fileName) {
        ensureDataDir();
        this.filePath = path.join(config.dataDir, `${fileName}.json`);
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const content = fs.readFileSync(this.filePath, 'utf-8');
                this.data = JSON.parse(content);
            }
            else {
                this.data = [];
                this.save();
            }
        }
        catch (error) {
            console.error(`Error loading ${this.filePath}:`, error);
            this.data = [];
        }
    }
    save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        }
        catch (error) {
            console.error(`Error saving ${this.filePath}:`, error);
        }
    }
    findAll() {
        return [...this.data];
    }
    findById(id) {
        return this.data.find(item => item.id === id);
    }
    findOne(predicate) {
        return this.data.find(predicate);
    }
    findMany(predicate) {
        return this.data.filter(predicate);
    }
    create(item) {
        this.data.push(item);
        this.save();
        return item;
    }
    update(id, updates) {
        const index = this.data.findIndex(item => item.id === id);
        if (index === -1)
            return undefined;
        this.data[index] = { ...this.data[index], ...updates };
        this.save();
        return this.data[index];
    }
    delete(id) {
        const index = this.data.findIndex(item => item.id === id);
        if (index === -1)
            return false;
        this.data.splice(index, 1);
        this.save();
        return true;
    }
    count() {
        return this.data.length;
    }
    countWhere(predicate) {
        return this.data.filter(predicate).length;
    }
}
export default DatabaseService;
//# sourceMappingURL=database.service.js.map