/**
 * `root.fAMapValid`
 */
export enum RootAmapValidity {
    /** One or more AMaps in the PST are INVALID */
    INVALID = 0,
    /** @deprecated */
    VALID1 = 1,
    /** The AMaps are VALID */
    VALID2 = 2,
}

export namespace NDB {
    export enum CryptMethod {
        /** Data blocks are not encoded. */
        NONE = 0x00,
        /** Encoded with the Permutation algorithm (section 5.1). */
        PERMUTE = 0x01,
        /** Encoded with the Cyclic algorithm (section 5.2). */
        CYCLIC = 0x02,
        /** Encrypted with Windows Information Protection. */
        EDPCRYPTED = 0x10,
    }
}