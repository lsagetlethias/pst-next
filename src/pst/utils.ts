import { FileBuffer } from '@/file/FileBuffer';

export type MetadataPosition = readonly [
    offset: number,
    /** in bytes */
    length: number,
    /** Do not parse */
    raw?: true,
];

type MetadataPosValue<Pos extends MetadataPosition> = Pos extends readonly [number, 1 | 2 | 4] ? number
         : Pos extends readonly [number, 8] ? bigint
         : Pos extends readonly [number, number, true] ? Buffer // raw
         : Buffer;

export type MetadataBuilder<T extends Record<string, MetadataPosition>> = {
    [K in keyof T]:
        K extends `b${string}` ? number // 1 byte (8 bits) Byte
         : K extends `w${string}` ? number // 2 bytes (16 bits) Word
         : K extends `dw${string}` ? number // 4 bytes (32 bits) Double Word
         : K extends `qw${string}` ? bigint // 8 bytes (64 bits) Quad Word
         : K extends `ull${string}` ? bigint // 8 bytes (64 bits) Unsigned Long Long
         : T[K] extends readonly [number, 1 | 2 | 4] ? number
         : T[K] extends readonly [number, 8] ? bigint
         : T[K] extends readonly [number, number, true] ? Buffer // raw
         : Buffer;
};

export const readEntry = async <Pos extends MetadataPosition>(file: FileBuffer | Buffer, metadata: MetadataPosition): Promise<MetadataPosValue<Pos>> => {
    const [offset, length, raw] = metadata;
    const value = Buffer.isBuffer(file) ? file.subarray(offset, offset + length) : await file.readBuffer(offset, length);

    if (raw) return value as MetadataPosValue<Pos>;
    switch (length) {
        case 1:
            return value.readUint8(0) as MetadataPosValue<Pos>;
        case 2:
            return value.readUInt16LE(0) as MetadataPosValue<Pos>;
        case 4:
            return value.readUInt32LE(0) as MetadataPosValue<Pos>;
        case 8:
            return value.readBigUInt64LE(0) as MetadataPosValue<Pos>;
        default:
            return value as MetadataPosValue<Pos>;
    }
}

export class PSTError extends Error {
    name = "PSTError";
}