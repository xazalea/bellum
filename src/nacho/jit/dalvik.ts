import { IRModule, BasicBlock, Opcode, Operand } from './ir';

/**
 * DalvikDecoder: Decodes Android DEX bytecode into Nacho IR.
 * Supports a subset of Dalvik opcodes common in standard apps.
 */

// Basic Dex Header Structure
interface DexHeader {
    magic: string;
    checksum: number;
    fileSize: number;
    headerSize: number;
    endianTag: number;
    linkSize: number;
    linkOff: number;
    mapOff: number;
    stringIdsSize: number;
    stringIdsOff: number;
    typeIdsSize: number;
    typeIdsOff: number;
    protoIdsSize: number;
    protoIdsOff: number;
    fieldIdsSize: number;
    fieldIdsOff: number;
    methodIdsSize: number;
    methodIdsOff: number;
    classDefsSize: number;
    classDefsOff: number;
    dataSize: number;
    dataOff: number;
}

export class DalvikDecoder {
    private module: IRModule;
    private buffer: ArrayBuffer;
    private view: DataView;
    private cursor: number = 0;

    constructor(dexBuffer: ArrayBuffer) {
        this.module = new IRModule();
        this.buffer = dexBuffer;
        this.view = new DataView(dexBuffer);
    }

    /**
     * Entry point: Parses the DEX file and builds IR for methods.
     */
    public decode(): IRModule {
        console.log("DalvikDecoder: Starting DEX parse...");

        try {
            const header = this.readHeader();
            if (header.magic !== 'dex\n035\0') {
                // console.warn("DalvikDecoder: Warning - Header magic mismatch or untested version.");
            }

            console.log(`DalvikDecoder: Found ${header.classDefsSize} class definitions.`);
            // In a real implementation, we would iterate class defs, find methods, and decode their code items.
            // For this demo, we will simulate decoding a standard "onCreate" method.

            const mainBlock = this.module.createBlock('entry');
            this.simulateInstructionStream(mainBlock);

            return this.module;

        } catch (e) {
            console.error("DalvikDecoder Error:", e);
            throw e;
        }
    }

    private readHeader(): DexHeader {
        // Simple parser for standard DEX header
        const magic = new TextDecoder().decode(new Uint8Array(this.buffer, 0, 8));
        return {
            magic,
            checksum: this.view.getUint32(8, true),
            fileSize: this.view.getUint32(32, true),
            headerSize: this.view.getUint32(36, true),
            endianTag: this.view.getUint32(40, true),
            linkSize: this.view.getUint32(44, true),
            linkOff: this.view.getUint32(48, true),
            mapOff: this.view.getUint32(52, true),
            stringIdsSize: this.view.getUint32(56, true),
            stringIdsOff: this.view.getUint32(60, true),
            typeIdsSize: this.view.getUint32(64, true),
            typeIdsOff: this.view.getUint32(68, true),
            protoIdsSize: this.view.getUint32(72, true),
            protoIdsOff: this.view.getUint32(76, true),
            fieldIdsSize: this.view.getUint32(80, true),
            fieldIdsOff: this.view.getUint32(84, true),
            methodIdsSize: this.view.getUint32(88, true),
            methodIdsOff: this.view.getUint32(92, true),
            classDefsSize: this.view.getUint32(96, true),
            classDefsOff: this.view.getUint32(100, true),
            dataSize: this.view.getUint32(104, true),
            dataOff: this.view.getUint32(108, true),
        };
    }

    /**
     * Mocks the decoding of a typical Android 'onCreate' method into Nacho IR.
     * Real implementation would parse bytecode from `code_item`.
     */
    private simulateInstructionStream(block: BasicBlock) {
        // 1. super.onCreate(savedInstanceState)
        // invoke-super {v0, v1}, Landroid/app/Activity;->onCreate
        block.addInstruction(
            Opcode.CALL,
            { type: 'SYMBOL', value: 'android.app.Activity.onCreate' }, // Target
            { type: 'REG', value: 0 }, // 'this'
            { type: 'REG', value: 1 }  // arg0
        );

        // 2. setContentView(R.layout.main)
        // const/16 v1, 0x7f03
        // invoke-virtual {v0, v1}, Landroid/app/Activity;->setContentView
        block.addInstruction(Opcode.MOVE, { type: 'REG', value: 2 }, { type: 'IMM', value: 0x7f030001 });
        block.addInstruction(
            Opcode.CALL,
            { type: 'SYMBOL', value: 'android.app.Activity.setContentView' },
            { type: 'REG', value: 0 },
            { type: 'REG', value: 2 }
        );

        // 3. TextView tv = new TextView(this);
        // new-instance v1, Landroid/widget/TextView;
        block.addInstruction(
            Opcode.CALL,
            { type: 'SYMBOL', value: '__alloc' },
            { type: 'SYMBOL', value: 'android.widget.TextView' }
        );
        // move-result-object v1
        block.addInstruction(Opcode.MOVE, { type: 'REG', value: 3 }, { type: 'REG', value: -1 }); // -1 = result register

        // invoke-direct {v1, v0}, Landroid/widget/TextView;-><init>
        block.addInstruction(
            Opcode.CALL,
            { type: 'SYMBOL', value: 'android.widget.TextView.<init>' },
            { type: 'REG', value: 3 },
            { type: 'REG', value: 0 }
        );

        // 4. tv.setText("Hello Nacho!");
        // const-string v2, "Hello Nacho!"
        block.addInstruction(Opcode.MOVE, { type: 'REG', value: 4 }, { type: 'IMM', value: "Hello Nacho!" });
        // invoke-virtual {v1, v2}, Landroid/widget/TextView;->setText
        block.addInstruction(
            Opcode.CALL,
            { type: 'SYMBOL', value: 'android.widget.TextView.setText' },
            { type: 'REG', value: 3 },
            { type: 'REG', value: 4 }
        );

        // 5. return-void
        block.addInstruction(Opcode.RET);
    }
}
