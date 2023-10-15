import { FileBuffer } from '@/file/FileBuffer';

type MetadataPosition = readonly [
    offset: number,
    /** in bytes */
    length: number,
]

const metadataPosUnicode = {
    dwMagic: [0, 4],
    dwCRCPartial: [4, 4],
    wMagicClient: [8, 2],
    wVer: [10, 2],
    wVerClient: [12, 2],
    bPlatformCreate: [14, 1],
    bPlatformAccess: [15, 1],
    dwReserved1: [16, 4],
    dwReserved2: [20, 4],
    bidUnused: [24, 8],
    bidNextP: [32, 8],
    dwUnique: [40, 4],
    rgnid: [44, 128],
    qwUnused: [172, 8],
    root: [180, 72],
    dwAlign: [252, 4],
    rgbFM: [256, 128],
    rgbFP: [384, 128],
    bSentinel: [512, 1],
    bCryptMethod: [513, 1],
    rgbReserved: [514, 2],
    bidNextB: [516, 8],
    dwCRCFull: [524, 4],
    rgbReserved2: [528, 3],
    bReserved: [531, 1],
    dwReserved3: [532, 32],
} as const satisfies Record<string, MetadataPosition>;

const metadataPosAnsi = {
    dwMagic: [0, 4],
    dwCRCPartial: [4, 4],
    wMagicClient: [8, 2],
    wVer: [10, 2],
    wVerClient: [12, 2],
    bPlatformCreate: [14, 1],
    bPlatformAccess: [15, 1],
    dwReserved1: [16, 4],
    dwReserved2: [20, 4],
    bidNextB: [24, 4],
    bidNextP: [28, 4],
    dwUnique: [32, 4],
    rgnid: [36, 128],
    qwUnused: [164, 8],
    root: [172, 40],
    dwAlign: [212, 4],
    rgbFM: [216, 128],
    rgbFP: [344, 128],
    bSentinel: [472, 1],
    bCryptMethod: [473, 1],
    rgbReserved: [474, 2],
    ullReserved: [476, 8],
    dwReserved: [484, 4],
    rgbReserved2: [488, 3],
    bReserved: [491, 1],
    dwReserved3: [492, 32],
} as const satisfies Record<string, MetadataPosition>;

type MetadataBuilder<T extends Record<string, MetadataPosition>> = {
    [K in keyof T]:
        K extends `dw${string}` ? number
        : K extends `w${string}` ? number
         : K extends `b${string}` ? number
         : K extends `bid${string}` ? bigint | number
         : K extends `qw${string}` ? bigint
         : K extends `ull${string}` ? bigint
         : Buffer;
}

export async function readHeader(file: FileBuffer) {
    console.log("full header", await file.sliceArrayBuffer(0, 532));
    // Lire la signature
    console.log("Reading signature");
    const dwMagicAB = await file.readBuffer(...metadataPosAnsi.dwMagic);
    const magic = String.fromCharCode(...dwMagicAB);
    // Vérifier si c'est un PST ou un OST
    if (magic !== "!BDN" && magic !== "!BCF") {
        throw new Error("Not a valid PST/OST file");
    }
    const fileType = (magic === "!BDN") ? 'PST' : 'OST';

    if (fileType !== 'PST') {
        console.warn("Only PST files are supported at the moment");
        throw new Error("Not a valid PST file");
    }

    // Lire la version
    const wVer = await file.readInt16LE(metadataPosAnsi.wVer[0]);
    let version: "ANSI" | "Unicode";
    let maybeWIP = false;
    if (wVer === 14 || wVer === 15) {
        version = "ANSI";
    } else if (wVer >= 23) {
        version = "Unicode";
        if (wVer === 37) {
            maybeWIP = true;
        }
    } else {
        throw new Error("Unknown PST/OST version");
    }


    let metadataPos = {...(version === "ANSI" ? metadataPosAnsi : metadataPosUnicode)};

    const metadata = await Promise.all(Object.entries(metadataPos).map(async ([key, pos]) => {
        if (!pos) throw new Error("Missing metadata position");
        const value = await readEntry(file, pos);
        return [key, value] as const;
    }));

    let raw: MetadataBuilder<typeof metadataPos>;
    if (version === "ANSI") {
        raw = Object.fromEntries(metadata) as MetadataBuilder<typeof metadataPosAnsi>;
        // contrôles de validité spécifiques à la version ANSI
    } else {
        raw = Object.fromEntries(metadata) as MetadataBuilder<typeof metadataPosUnicode>;
        // contrôles de validité spécifiques à la version Unicode
    }
    

    // À ce stade, nous avons identifié le type de fichier et sa version
    return {
        fileType,
        version,
        maybeWIP,
        raw,
    } as const;
}

const readEntry = async (file: FileBuffer, metadata: MetadataPosition) => {
    const [offset, length] = metadata;
    const value = await file.readBuffer(offset, length);

    switch (length) {
        case 1:
            return value.readUint8(0);
        case 2:
            return value.readUInt16LE(0);
        case 4:
            return value.readUInt32LE(0);
        case 8:
            return value.readBigUInt64LE(0);
        default:
            return value;
    }
}