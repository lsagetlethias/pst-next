"use client";

import { FileBuffer } from '@/file/FileBuffer';
import { readHeader } from '@/pst/Header';
import { ChangeEvent, ChangeEventHandler, useEffect, useState } from 'react';

class PST {
    private fileBuffer: FileBuffer | null = null
    public header: any;

    public async load(file: File) {
        console.log("pst loading");
        this.fileBuffer = new FileBuffer(file);
        console.log("pst loaded", this.fileBuffer)
        try {
            this.header = await readHeader(this.fileBuffer);
            console.log(this.header)
        } catch (e) {
            console.log((e as Error).message);
        }
    }
}

export const PSTLoader = () => {
    const [pst, setPst] = useState(new PST());
    const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.item(0);
        console.log({ file });
        if (!file) return;
        const newPst = new PST();
        console.log("pre FileReader");
        await newPst.load(file);
        setPst(newPst);
    }

    return <>
        <label>PST <input type='file' onChange={handleFile} /></label>
        <pre>{pst.header && JSON.stringify(pst.header, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value // return everything else unchanged
        , 2)}</pre>
    </>
}