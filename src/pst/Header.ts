import { FileBuffer } from '@/file/FileBuffer';
import { MetadataPosition, MetadataBuilder, readEntry, PSTError } from './utils';
import { NID_TYPE } from './dataStructures/NID';
import { Any, ClearObject, UnReadOnly } from '@/utils/types';

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
    dwMagic: [0, 4, true],
    dwCRCPartial: [4, 4],
    wMagicClient: [8, 2, true],
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

type MetadataCommon = MetadataBuilder<Extract<typeof metadataPosUnicode, typeof metadataPosUnicode>>;

const rootPosUnicode = {
    dwReserved: [0, 4],
    ibFileEof: [4, 8],
    ibAMapLast: [12, 8, true],
    cbAMapFree: [20, 8],
    cbPMapFree: [28, 8],
    BREFNBT: [36, 16],
    BREFBBT: [52, 16],
    faMapValid: [68, 1],
    bReserved: [69, 1],
    wReserved: [70, 2],
} as const satisfies Record<string, MetadataPosition>;

const rootPosAnsi = {
    dwReserved: [0, 4],
    ibFileEof: [4, 4],
    ibAMapLast: [8, 4, true],
    cbAMapFree: [12, 4],
    cbPMapFree: [16, 4],
    BREFNBT: [20, 8, true],
    BREFBBT: [28, 8, true],
    faMapValid: [36, 1],
    bReserved: [37, 1],
    wReserved: [38, 2],
} as const satisfies Record<string, MetadataPosition>;

export type Header = {
    fileType: "PST" | "OST";
    maybeWIP: boolean;
    version: PSTVersion;
    common: Header.Common;
} & ({
    version: "ANSI";
    raw: ClearObject<MetadataBuilder<typeof metadataPosAnsi>>;
} | {
    version: "Unicode";
    raw: ClearObject<MetadataBuilder<typeof metadataPosUnicode>>;
});

type PSTVersion = "ANSI" | "Unicode";

export async function readHeader(file: FileBuffer): Promise<Header> {
    console.log("full header", await file.sliceArrayBuffer(0, 532));
    // Lire la signature
    console.log("Reading signature");
    const dwMagicAB = await readEntry(file, metadataPosAnsi.dwMagic);
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
    let version: PSTVersion;
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
        raw = Object.fromEntries(metadata) as unknown as MetadataBuilder<typeof metadataPosAnsi>;
        // contrôles de validité spécifiques à la version ANSI
        validateAnsi(raw);
    } else {
        raw = Object.fromEntries(metadata) as unknown as MetadataBuilder<typeof metadataPosUnicode>;
        // contrôles de validité spécifiques à la version Unicode
        validateUnicode(raw);
    }
    validateCommon(raw as MetadataCommon);
    

    // À ce stade, nous avons identifié le type de fichier et sa version
    return {
        fileType,
        version,
        maybeWIP,
        raw,
        common: await getCommon(raw as MetadataCommon, version),
    } as Header;
}

const validateAnsi = (header: MetadataBuilder<typeof metadataPosAnsi>) => {
    // TODO
    return true;
}

const validateUnicode = (header: MetadataBuilder<typeof metadataPosUnicode>) => {
    // TODO
    return true;
}

const validateCommon = (header: MetadataCommon) => {
    if (header.dwMagic !== 0x4E444221) {
        throw new HeaderParsingError("Invalid magic number. Expected 0x4E444221 (!BDN)");
    }

    if (header.dwCRCPartial === 0x00000000) {
        throw new HeaderParsingError("Invalid CRC. Should not be 0");
    }

    if (header.wMagicClient !== 0x4D53) {
        throw new HeaderParsingError("Invalid magic client. Expected 0x4D53 (SM)");
    }
    
    // wVer is already checked in readHeader
    // wVerClient do not need to be checked

    if (header.bPlatformCreate !== 0x01) {
        throw new HeaderParsingError("Invalid platform create. Expected 0x01");
    }

    if (header.bPlatformAccess !== 0x01) {
        throw new HeaderParsingError("Invalid platform access. Expected 0x01");
    }

    if (header.dwReserved1 !== 0) {
        throw new HeaderParsingError("Invalid reserved1. Expected 0x00000000");
    }

    if (header.dwReserved2 !== 0) {
        throw new HeaderParsingError("Invalid reserved2. Expected 0x00000000");
    }

    // dwUnique do not need to be checked
    // rgnid do not need to be checked
    // qwUnused is Unicode only
    // root is validated in getRoot

}

namespace Header {
    export type NIDs = { [Type in NID_TYPE]: number };
    export type Root = ClearObject<MetadataBuilder<typeof rootPosUnicode>>;

    export type Common = {
        nids: NIDs;
        root: Root;
    }
}
const getCommon = async (header: MetadataCommon, version: PSTVersion): Promise<Header.Common> => {
    const nids = {} as Header.NIDs;

    for (let i = 0; i < 32; i++) {
        const nid = header.rgnid[i];
        const type = (nid & NID_TYPE.LTP) as NID_TYPE;
        const index = nid >>> 5;
        nids[type] = index;
    }

    const root = await getRoot(header, version);

    return {
        nids,
        root,
    }
}

enum ROOT_AMAP_VALID {
    /** One or more AMaps in the PST are INVALID */
    INVALID = 0,
    /** @deprecated */
    VALID1 = 1,
    /** The AMaps are VALID */
    VALID2 = 2,
}

const getRoot = async (header: MetadataCommon, version: PSTVersion) => {
    const rootPos = {...(version === "ANSI" ? rootPosAnsi : rootPosUnicode)};

    // return metadata as Header.Root;
    const metadata = await Promise.all(Object.entries(rootPos).map(async ([key, pos]) => {
        if (!pos) throw new Error("Missing metadata position");
        // console.log("root try read", key, pos);
        const value = await readEntry(header.root, pos);
        // console.log("root read", key, value);
        return [key, value] as const;
    }));
    
    return Object.fromEntries(metadata) as unknown as Header.Root;
}

export class HeaderParsingError extends PSTError {
    name = "HeaderParsingError";
}