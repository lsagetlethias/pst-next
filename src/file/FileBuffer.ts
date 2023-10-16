/**
 * Represents a cached entry in the FileBuffer.
 */
interface CacheEntry {
    buffer: Buffer;
    lastAccessed: number;
}

/**
 * Represents the byte lengths for various data types.
 */
enum ByteLengths {
    BYTE = 1,
    SHORT = 2,
    INT = 4,
    LONG = 8,
}

/**
 * Provides functionality for buffering and reading parts of a file with caching.
 */
export class FileBuffer {
    private readonly cache: Map<string, CacheEntry> = new Map();
    private readonly cacheOrder: string[] = []; // Pour conserver l'ordre des clés
    private cacheSize = 0;
    private static readonly MAX_CACHE_SIZE = 200 * 1024 * 1024; // exemple de taille maximale: 200 Mo

    /**
     * Initializes a new instance of the FileBuffer class.
     * @param file - The file to be buffered.
     */
    constructor(private readonly file: File) {
        console.log("FileBuffer created for file:", file.name);
    }

    /**
     * Generates a unique cache key for the given range.
     * @param start - The starting byte.
     * @param end - The ending byte.
     * @returns A string key representing the range.
     */
    private generateCacheKey(start: number, end: number): string {
        return `${start}-${end}`;
    }

    /**
     * Retrieves the buffer from cache or loads from file if not present in cache.
     * @param start - The starting byte.
     * @param end - The ending byte.
     * @returns A promise that resolves with the buffer.
     */
    private async getCachedOrLoad(start: number, end: number): Promise<Buffer> {
        const cacheKey = this.generateCacheKey(start, end);

        const cachedEntry = this.cache.get(cacheKey);
        if (cachedEntry) {
            cachedEntry.lastAccessed = Date.now();
            // Mettre à jour l'ordre d'accès
            this.cacheOrder.splice(this.cacheOrder.indexOf(cacheKey), 1); // Retirer la clé de sa position actuelle
            this.cacheOrder.push(cacheKey); // Ajouter la clé à la fin
            return cachedEntry.buffer;
        }

        const buffer = Buffer.from(await this.sliceArrayBuffer(start, end));

        this.cacheSize += buffer.length;
        this.cache.set(cacheKey, { buffer, lastAccessed: Date.now() });
        this.cacheOrder.push(cacheKey); // Ajouter la nouvelle clé à la fin


        // Éviction des anciennes entrées si nécessaire
        while (this.cacheSize > FileBuffer.MAX_CACHE_SIZE) {
            const oldestKey = this.cacheOrder.shift(); // Retirer le premier élément (le plus ancien)
            if (oldestKey) {
                const oldestEntry = this.cache.get(oldestKey);
                if (oldestEntry) {
                    this.cacheSize -= oldestEntry.buffer.length;
                    this.cache.delete(oldestKey);
                }
            }
        }

        return buffer;
    }

    /**
     * Converts the entire file to a buffer.
     * @returns A promise that resolves with the buffer.
     */
    public async toBuffer(): Promise<Buffer> {
        try {
            return Buffer.from(await this.file.arrayBuffer());
        } catch (error) {
            console.error("Error reading the file:", error);
            throw error;
        }
    }

    /**
     * Slices the file from the given start to end.
     * @param start - The starting byte (default is 0).
     * @param end - The ending byte (default is the file size).
     * @returns A blob representing the sliced file.
     */
    public slice(start = 0, end = this.size): Blob {
        return this.file.slice(start, end);
    }

    /**
     * Slices the file and converts it to an ArrayBuffer.
     * @param start - The starting byte (default is 0).
     * @param end - The ending byte (default is the file size).
     * @returns A promise that resolves with the array buffer.
     */
    public async sliceArrayBuffer(start = 0, end = this.size): Promise<ArrayBuffer> {
        const blob = this.slice(start, end);
        try {
            return blob.arrayBuffer();
        } catch (error) {
            console.error("Error converting blob to array buffer:", error);
            throw error;
        }
    }

    /**
     * Slices the file and returns the buffer, either from cache or by loading from file.
     * @param start - The starting byte (default is 0).
     * @param end - The ending byte (default is the file size).
     * @returns A promise that resolves with the buffer.
     */
    public async sliceBuffer(start = 0, end = this.size): Promise<Buffer> {
        return this.getCachedOrLoad(start, end);
    }

    /**
     * Gets the total size of the file.
     * @returns The file size.
     */
    public get size(): number {
        return this.file.size;
    }

    /**
     * Reads a buffer from the file with the given offset and length.
     * @param offset - The starting byte.
     * @param length - The length of bytes to read.
     * @returns A promise that resolves with the buffer.
     */
    public async readBuffer(offset: number, length: ByteLengths): Promise<Buffer> {
        return await this.sliceBuffer(offset, offset + length);
    }

    public async readBigInt64BE(offset: number): Promise<bigint> {
        const buffer = await this.readBuffer(offset, ByteLengths.LONG);
        return buffer.readBigInt64BE(0);
    }

    public async readBigInt64LE(offset: number): Promise<bigint> {
        const buffer = await this.readBuffer(offset, ByteLengths.LONG);
        return buffer.readBigInt64LE(0);
    }

    public async readBigUInt64BE(offset: number):Promise<bigint>{
        const buffer = await this.readBuffer(offset, ByteLengths.LONG);
        return buffer.readBigUInt64BE(0);
    }

    public async readBigUInt64LE(offset: number):Promise<bigint>{
        const buffer = await this.readBuffer(offset, ByteLengths.LONG);
        return buffer.readBigUInt64LE(0);
    }

    public async readDoubleBE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.LONG);
        return buffer.readDoubleBE(0);
    }

    public async readDoubleLE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.LONG);
        return buffer.readDoubleLE(0);
    }

    public async readFloatBE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.INT);
        return buffer.readFloatBE(0);
    }

    public async readFloatLE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.INT);
        return buffer.readFloatLE(0);
    }

    public async readInt8(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.BYTE);
        return buffer.readInt8(0);
    }

    public async readInt16BE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.SHORT);
        return buffer.readInt16BE(0);
    }

    public async readInt16LE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.SHORT);
        return buffer.readInt16LE(0);
    }

    public async readInt32BE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.INT);
        return buffer.readInt32BE(0);
    }

    public async readInt32LE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.INT);
        return buffer.readInt32LE(0);
    }

    public async readUInt8(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.BYTE);
        return buffer.readUInt8(0);
    }

    public async readUInt16BE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.SHORT);
        return buffer.readUInt16BE(0);
    }

    public async readUInt16LE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.SHORT);
        return buffer.readUInt16LE(0);
    }

    public async readUInt32BE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.INT);
        return buffer.readUInt32BE(0);
    }

    public async readUInt32LE(offset: number): Promise<number> {
        const buffer = await this.readBuffer(offset, ByteLengths.INT);
        return buffer.readUInt32LE(0);
    }
}
