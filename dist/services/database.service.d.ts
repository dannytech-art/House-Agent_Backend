declare class DatabaseService<T extends {
    id: string;
}> {
    private filePath;
    private data;
    private useFilesystem;
    private fileName;
    private usingSupabase;
    constructor(fileName: string);
    private load;
    private save;
    reload(): void;
    findAll(): T[];
    findById(id: string): T | undefined;
    findOne(predicate: (item: T) => boolean): T | undefined;
    findMany(predicate: (item: T) => boolean): T[];
    create(item: T): T;
    update(id: string, updates: Partial<T>): T | undefined;
    delete(id: string): boolean;
    count(): number;
    countWhere(predicate: (item: T) => boolean): number;
}
export default DatabaseService;
//# sourceMappingURL=database.service.d.ts.map