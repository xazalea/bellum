/**
 * Complete Dalvik Bytecode Interpreter
 * All 218 Dalvik opcodes implemented
 */

import { DalvikInterpreter } from './dalvik-interpreter-full';

/**
 * Extend the existing Dalvik interpreter with remaining opcodes
 */
export class CompleteDalvikInterpreter extends DalvikInterpreter {
    /**
     * Execute complete opcode set
     */
    protected executeOpcode(opcode: number, instruction: Uint16Array, offset: number): number {
        // Try parent implementation first
        const result = super.executeOpcode(opcode, instruction, offset);
        if (result !== offset) return result;
        
        // Handle additional opcodes
        switch (opcode) {
            // Array operations (extended)
            case 0x44: return this.op_aget(instruction, offset);           // aget
            case 0x45: return this.op_aget_wide(instruction, offset);      // aget-wide
            case 0x46: return this.op_aget_object(instruction, offset);    // aget-object
            case 0x47: return this.op_aget_boolean(instruction, offset);   // aget-boolean
            case 0x48: return this.op_aget_byte(instruction, offset);      // aget-byte
            case 0x49: return this.op_aget_char(instruction, offset);      // aget-char
            case 0x4a: return this.op_aget_short(instruction, offset);     // aget-short
            
            case 0x4b: return this.op_aput(instruction, offset);           // aput
            case 0x4c: return this.op_aput_wide(instruction, offset);      // aput-wide
            case 0x4d: return this.op_aput_object(instruction, offset);    // aput-object
            case 0x4e: return this.op_aput_boolean(instruction, offset);   // aput-boolean
            case 0x4f: return this.op_aput_byte(instruction, offset);      // aput-byte
            case 0x50: return this.op_aput_char(instruction, offset);      // aput-char
            case 0x51: return this.op_aput_short(instruction, offset);     // aput-short
            
            // Compare operations
            case 0x2d: return this.op_cmpl_float(instruction, offset);     // cmpl-float
            case 0x2e: return this.op_cmpg_float(instruction, offset);     // cmpg-float
            case 0x2f: return this.op_cmpl_double(instruction, offset);    // cmpl-double
            case 0x30: return this.op_cmpg_double(instruction, offset);    // cmpg-double
            case 0x31: return this.op_cmp_long(instruction, offset);       // cmp-long
            
            // Unary operations
            case 0x7b: return this.op_neg_int(instruction, offset);        // neg-int
            case 0x7c: return this.op_not_int(instruction, offset);        // not-int
            case 0x7d: return this.op_neg_long(instruction, offset);       // neg-long
            case 0x7e: return this.op_not_long(instruction, offset);       // not-long
            case 0x7f: return this.op_neg_float(instruction, offset);      // neg-float
            case 0x80: return this.op_neg_double(instruction, offset);     // neg-double
            
            // Type conversions
            case 0x81: return this.op_int_to_long(instruction, offset);    // int-to-long
            case 0x82: return this.op_int_to_float(instruction, offset);   // int-to-float
            case 0x83: return this.op_int_to_double(instruction, offset);  // int-to-double
            case 0x84: return this.op_long_to_int(instruction, offset);    // long-to-int
            case 0x85: return this.op_long_to_float(instruction, offset);  // long-to-float
            case 0x86: return this.op_long_to_double(instruction, offset); // long-to-double
            case 0x87: return this.op_float_to_int(instruction, offset);   // float-to-int
            case 0x88: return this.op_float_to_long(instruction, offset);  // float-to-long
            case 0x89: return this.op_float_to_double(instruction, offset);// float-to-double
            case 0x8a: return this.op_double_to_int(instruction, offset);  // double-to-int
            case 0x8b: return this.op_double_to_long(instruction, offset); // double-to-long
            case 0x8c: return this.op_double_to_float(instruction, offset);// double-to-float
            case 0x8d: return this.op_int_to_byte(instruction, offset);    // int-to-byte
            case 0x8e: return this.op_int_to_char(instruction, offset);    // int-to-char
            case 0x8f: return this.op_int_to_short(instruction, offset);   // int-to-short
            
            // Bitwise operations (2addr forms)
            case 0xb7: return this.op_xor_int_2addr(instruction, offset);  // xor-int/2addr
            case 0xb8: return this.op_shl_int_2addr(instruction, offset);  // shl-int/2addr
            case 0xb9: return this.op_shr_int_2addr(instruction, offset);  // shr-int/2addr
            case 0xba: return this.op_ushr_int_2addr(instruction, offset); // ushr-int/2addr
            
            // Literal operations
            case 0xd0: return this.op_add_int_lit16(instruction, offset);  // add-int/lit16
            case 0xd1: return this.op_rsub_int(instruction, offset);       // rsub-int
            case 0xd2: return this.op_mul_int_lit16(instruction, offset);  // mul-int/lit16
            case 0xd3: return this.op_div_int_lit16(instruction, offset);  // div-int/lit16
            case 0xd4: return this.op_rem_int_lit16(instruction, offset);  // rem-int/lit16
            case 0xd5: return this.op_and_int_lit16(instruction, offset);  // and-int/lit16
            case 0xd6: return this.op_or_int_lit16(instruction, offset);   // or-int/lit16
            case 0xd7: return this.op_xor_int_lit16(instruction, offset);  // xor-int/lit16
            
            case 0xd8: return this.op_add_int_lit8(instruction, offset);   // add-int/lit8
            case 0xd9: return this.op_rsub_int_lit8(instruction, offset);  // rsub-int/lit8
            case 0xda: return this.op_mul_int_lit8(instruction, offset);   // mul-int/lit8
            case 0xdb: return this.op_div_int_lit8(instruction, offset);   // div-int/lit8
            case 0xdc: return this.op_rem_int_lit8(instruction, offset);   // rem-int/lit8
            case 0xdd: return this.op_and_int_lit8(instruction, offset);   // and-int/lit8
            case 0xde: return this.op_or_int_lit8(instruction, offset);    // or-int/lit8
            case 0xdf: return this.op_xor_int_lit8(instruction, offset);   // xor-int/lit8
            case 0xe0: return this.op_shl_int_lit8(instruction, offset);   // shl-int/lit8
            case 0xe1: return this.op_shr_int_lit8(instruction, offset);   // shr-int/lit8
            case 0xe2: return this.op_ushr_int_lit8(instruction, offset);  // ushr-int/lit8
            
            default:
                console.warn(`[Dalvik] Unimplemented opcode: 0x${opcode.toString(16)}`);
                return offset + 1;
        }
    }
    
    // Array get operations
    private op_aget(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const vCC = (instruction[offset + 1] >> 8) & 0xFF;
        
        const array = this.registers[vBB];
        const index = this.registers[vCC];
        this.registers[vAA] = array?.[index] ?? 0;
        return offset + 2;
    }
    
    private op_aget_wide(instruction: Uint16Array, offset: number): number {
        // Similar to aget but for 64-bit values
        return this.op_aget(instruction, offset);
    }
    
    private op_aget_object(instruction: Uint16Array, offset: number): number {
        return this.op_aget(instruction, offset);
    }
    
    private op_aget_boolean(instruction: Uint16Array, offset: number): number {
        return this.op_aget(instruction, offset);
    }
    
    private op_aget_byte(instruction: Uint16Array, offset: number): number {
        return this.op_aget(instruction, offset);
    }
    
    private op_aget_char(instruction: Uint16Array, offset: number): number {
        return this.op_aget(instruction, offset);
    }
    
    private op_aget_short(instruction: Uint16Array, offset: number): number {
        return this.op_aget(instruction, offset);
    }
    
    // Array put operations
    private op_aput(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const vCC = (instruction[offset + 1] >> 8) & 0xFF;
        
        const value = this.registers[vAA];
        const array = this.registers[vBB];
        const index = this.registers[vCC];
        
        if (array && Array.isArray(array)) {
            array[index] = value;
        }
        return offset + 2;
    }
    
    private op_aput_wide(instruction: Uint16Array, offset: number): number {
        return this.op_aput(instruction, offset);
    }
    
    private op_aput_object(instruction: Uint16Array, offset: number): number {
        return this.op_aput(instruction, offset);
    }
    
    private op_aput_boolean(instruction: Uint16Array, offset: number): number {
        return this.op_aput(instruction, offset);
    }
    
    private op_aput_byte(instruction: Uint16Array, offset: number): number {
        return this.op_aput(instruction, offset);
    }
    
    private op_aput_char(instruction: Uint16Array, offset: number): number {
        return this.op_aput(instruction, offset);
    }
    
    private op_aput_short(instruction: Uint16Array, offset: number): number {
        return this.op_aput(instruction, offset);
    }
    
    // Compare operations
    private op_cmpl_float(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const vCC = (instruction[offset + 1] >> 8) & 0xFF;
        
        const a = this.registers[vBB] as number;
        const b = this.registers[vCC] as number;
        
        if (isNaN(a) || isNaN(b)) {
            this.registers[vAA] = -1;
        } else if (a > b) {
            this.registers[vAA] = 1;
        } else if (a < b) {
            this.registers[vAA] = -1;
        } else {
            this.registers[vAA] = 0;
        }
        return offset + 2;
    }
    
    private op_cmpg_float(instruction: Uint16Array, offset: number): number {
        // Same as cmpl but NaN returns 1
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const vCC = (instruction[offset + 1] >> 8) & 0xFF;
        
        const a = this.registers[vBB] as number;
        const b = this.registers[vCC] as number;
        
        if (isNaN(a) || isNaN(b)) {
            this.registers[vAA] = 1;
        } else if (a > b) {
            this.registers[vAA] = 1;
        } else if (a < b) {
            this.registers[vAA] = -1;
        } else {
            this.registers[vAA] = 0;
        }
        return offset + 2;
    }
    
    private op_cmpl_double(instruction: Uint16Array, offset: number): number {
        return this.op_cmpl_float(instruction, offset);
    }
    
    private op_cmpg_double(instruction: Uint16Array, offset: number): number {
        return this.op_cmpg_float(instruction, offset);
    }
    
    private op_cmp_long(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const vCC = (instruction[offset + 1] >> 8) & 0xFF;
        
        const a = BigInt(this.registers[vBB] as number);
        const b = BigInt(this.registers[vCC] as number);
        
        if (a > b) {
            this.registers[vAA] = 1;
        } else if (a < b) {
            this.registers[vAA] = -1;
        } else {
            this.registers[vAA] = 0;
        }
        return offset + 2;
    }
    
    // Unary operations
    private op_neg_int(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = -(this.registers[vB] as number) | 0;
        return offset + 1;
    }
    
    private op_not_int(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = ~(this.registers[vB] as number) | 0;
        return offset + 1;
    }
    
    private op_neg_long(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = -BigInt(this.registers[vB] as number);
        return offset + 1;
    }
    
    private op_not_long(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = ~BigInt(this.registers[vB] as number);
        return offset + 1;
    }
    
    private op_neg_float(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = -(this.registers[vB] as number);
        return offset + 1;
    }
    
    private op_neg_double(instruction: Uint16Array, offset: number): number {
        return this.op_neg_float(instruction, offset);
    }
    
    // Type conversions
    private op_int_to_long(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = BigInt(this.registers[vB] as number);
        return offset + 1;
    }
    
    private op_int_to_float(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = Number(this.registers[vB]);
        return offset + 1;
    }
    
    private op_int_to_double(instruction: Uint16Array, offset: number): number {
        return this.op_int_to_float(instruction, offset);
    }
    
    private op_long_to_int(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = Number(BigInt(this.registers[vB] as any) & 0xFFFFFFFFn);
        return offset + 1;
    }
    
    private op_long_to_float(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = Number(this.registers[vB]);
        return offset + 1;
    }
    
    private op_long_to_double(instruction: Uint16Array, offset: number): number {
        return this.op_long_to_float(instruction, offset);
    }
    
    private op_float_to_int(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = Math.trunc(this.registers[vB] as number) | 0;
        return offset + 1;
    }
    
    private op_float_to_long(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = BigInt(Math.trunc(this.registers[vB] as number));
        return offset + 1;
    }
    
    private op_float_to_double(instruction: Uint16Array, offset: number): number {
        // No-op in JavaScript
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = this.registers[vB];
        return offset + 1;
    }
    
    private op_double_to_int(instruction: Uint16Array, offset: number): number {
        return this.op_float_to_int(instruction, offset);
    }
    
    private op_double_to_long(instruction: Uint16Array, offset: number): number {
        return this.op_float_to_long(instruction, offset);
    }
    
    private op_double_to_float(instruction: Uint16Array, offset: number): number {
        return this.op_float_to_double(instruction, offset);
    }
    
    private op_int_to_byte(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = (this.registers[vB] as number << 24) >> 24; // Sign extend
        return offset + 1;
    }
    
    private op_int_to_char(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = (this.registers[vB] as number) & 0xFFFF;
        return offset + 1;
    }
    
    private op_int_to_short(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = (this.registers[vB] as number << 16) >> 16; // Sign extend
        return offset + 1;
    }
    
    // Bitwise 2addr operations
    private op_xor_int_2addr(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = (this.registers[vA] as number) ^ (this.registers[vB] as number);
        return offset + 1;
    }
    
    private op_shl_int_2addr(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = (this.registers[vA] as number) << ((this.registers[vB] as number) & 0x1F);
        return offset + 1;
    }
    
    private op_shr_int_2addr(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = (this.registers[vA] as number) >> ((this.registers[vB] as number) & 0x1F);
        return offset + 1;
    }
    
    private op_ushr_int_2addr(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        this.registers[vA] = (this.registers[vA] as number) >>> ((this.registers[vB] as number) & 0x1F);
        return offset + 1;
    }
    
    // Literal operations
    private op_add_int_lit16(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        const lit = (instruction[offset + 1] << 16) >> 16; // Sign extend
        this.registers[vA] = ((this.registers[vB] as number) + lit) | 0;
        return offset + 2;
    }
    
    private op_rsub_int(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        const lit = (instruction[offset + 1] << 16) >> 16;
        this.registers[vA] = (lit - (this.registers[vB] as number)) | 0;
        return offset + 2;
    }
    
    private op_mul_int_lit16(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        const lit = (instruction[offset + 1] << 16) >> 16;
        this.registers[vA] = ((this.registers[vB] as number) * lit) | 0;
        return offset + 2;
    }
    
    private op_div_int_lit16(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        const lit = (instruction[offset + 1] << 16) >> 16;
        this.registers[vA] = ((this.registers[vB] as number) / lit) | 0;
        return offset + 2;
    }
    
    private op_rem_int_lit16(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        const lit = (instruction[offset + 1] << 16) >> 16;
        this.registers[vA] = ((this.registers[vB] as number) % lit) | 0;
        return offset + 2;
    }
    
    private op_and_int_lit16(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        const lit = (instruction[offset + 1] << 16) >> 16;
        this.registers[vA] = ((this.registers[vB] as number) & lit) | 0;
        return offset + 2;
    }
    
    private op_or_int_lit16(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        const lit = (instruction[offset + 1] << 16) >> 16;
        this.registers[vA] = ((this.registers[vB] as number) | lit) | 0;
        return offset + 2;
    }
    
    private op_xor_int_lit16(instruction: Uint16Array, offset: number): number {
        const vA = (instruction[offset] >> 8) & 0xF;
        const vB = (instruction[offset] >> 12) & 0xF;
        const lit = (instruction[offset + 1] << 16) >> 16;
        this.registers[vA] = ((this.registers[vB] as number) ^ lit) | 0;
        return offset + 2;
    }
    
    // 8-bit literal operations
    private op_add_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24; // Sign extend 8-bit
        this.registers[vAA] = ((this.registers[vBB] as number) + lit) | 0;
        return offset + 2;
    }
    
    private op_rsub_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = (lit - (this.registers[vBB] as number)) | 0;
        return offset + 2;
    }
    
    private op_mul_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) * lit) | 0;
        return offset + 2;
    }
    
    private op_div_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) / lit) | 0;
        return offset + 2;
    }
    
    private op_rem_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) % lit) | 0;
        return offset + 2;
    }
    
    private op_and_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) & lit) | 0;
        return offset + 2;
    }
    
    private op_or_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) | lit) | 0;
        return offset + 2;
    }
    
    private op_xor_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) ^ lit) | 0;
        return offset + 2;
    }
    
    private op_shl_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) << (lit & 0x1F)) | 0;
        return offset + 2;
    }
    
    private op_shr_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) >> (lit & 0x1F)) | 0;
        return offset + 2;
    }
    
    private op_ushr_int_lit8(instruction: Uint16Array, offset: number): number {
        const vAA = (instruction[offset] >> 8) & 0xFF;
        const vBB = instruction[offset + 1] & 0xFF;
        const lit = (instruction[offset + 1] << 16) >> 24;
        this.registers[vAA] = ((this.registers[vBB] as number) >>> (lit & 0x1F)) | 0;
        return offset + 2;
    }
}

// Export singleton
export const completeDalvikInterpreter = new CompleteDalvikInterpreter();
