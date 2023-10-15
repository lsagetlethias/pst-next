"use client";

import { FileBuffer } from '@/file/FileBuffer';
import { readHeader } from '@/pst/Header';
import { ChangeEventHandler, useEffect, useState } from 'react';

class PST {
    private fileBuffer: FileBuffer | null = null

    public async load(file: File) {
        console.log("pst loading");
        this.fileBuffer = new FileBuffer(file);
        console.log("pst loaded", this.fileBuffer)
        try {
            const header = await readHeader(this.fileBuffer);
            console.log(header)
        } catch (e) {
            console.log((e as Error).message);
        }
    }
}

const pst = new PST();
export const PSTLoader = () => {
    const handleFile: ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files?.item(0);
        console.log({ file });
        if (!file) return;
        console.log("pre FileReader");
        pst.load(file);
    }

    return <>
        <label>PST <input type='file' onChange={handleFile} /></label>
    </>
}