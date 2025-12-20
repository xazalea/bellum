export interface PESection {
    name: string;
    virtualAddress: number;
    virtualSize: number;
    rawDataPtr: number;
    rawDataSize: number;
}

export interface PEImage {
    entryPoint: number;
    imageBase: number;
    sections: PESection[];
}

export class PELoader {
    static parse(buffer: ArrayBuffer): PEImage {
        const view = new DataView(buffer);
        
        // DOS Header
        const e_magic = view.getUint16(0, true);
        if (e_magic !== 0x5A4D) { // 'MZ'
            throw new Error('Invalid DOS Header');
        }
        const e_lfanew = view.getUint32(60, true);
        
        // PE Header
        const signature = view.getUint32(e_lfanew, true);
        if (signature !== 0x4550) { // 'PE\0\0'
            throw new Error('Invalid PE Header');
        }
        
        // File Header
        const numberOfSections = view.getUint16(e_lfanew + 6, true);
        const sizeOfOptionalHeader = view.getUint16(e_lfanew + 20, true);
        
        // Optional Header
        const optionalHeaderOffset = e_lfanew + 24;
        const magic = view.getUint16(optionalHeaderOffset, true);
        
        let addressOfEntryPoint = 0;
        let imageBase = 0;
        
        if (magic === 0x10b) { // PE32
            addressOfEntryPoint = view.getUint32(optionalHeaderOffset + 16, true);
            imageBase = view.getUint32(optionalHeaderOffset + 28, true);
        } else if (magic === 0x20b) { // PE32+
            addressOfEntryPoint = view.getUint32(optionalHeaderOffset + 16, true);
            imageBase = view.getUint32(optionalHeaderOffset + 24, true); 
        } else {
             throw new Error('Unknown Optional Header Magic');
        }

        // Section Headers
        const sectionTableOffset = optionalHeaderOffset + sizeOfOptionalHeader;
        const sections: PESection[] = [];
        
        for (let i = 0; i < numberOfSections; i++) {
            const offset = sectionTableOffset + (i * 40);
            
            // Read name (8 bytes)
            let name = '';
            for (let j = 0; j < 8; j++) {
                const charCode = view.getUint8(offset + j);
                if (charCode !== 0) name += String.fromCharCode(charCode);
            }
            
            const virtualSize = view.getUint32(offset + 8, true);
            const virtualAddress = view.getUint32(offset + 12, true);
            const sizeOfRawData = view.getUint32(offset + 16, true);
            const pointerToRawData = view.getUint32(offset + 20, true);
            
            sections.push({
                name,
                virtualAddress,
                virtualSize,
                rawDataPtr: pointerToRawData,
                rawDataSize: sizeOfRawData
            });
        }

        return {
            entryPoint: addressOfEntryPoint,
            imageBase,
            sections
        };
    }
}

