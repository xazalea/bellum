import { Decoder, BasicBlock, IRInstruction } from '../types';

export class ARMDecoder implements Decoder {
    decode(buffer: Uint8Array, offset: number, addr: number): BasicBlock {
        // Mock ARM Decode
        return {
            id: addr,
            startAddr: addr,
            endAddr: addr + 4,
            instructions: [{ id: 0, opcode: 'mov', addr }],
            successors: []
        };
    }
}



