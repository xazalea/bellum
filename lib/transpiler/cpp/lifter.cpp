#include <vector>
#include <cstdint>
#include <string>

// Export for WASM
#define WASM_EXPORT __attribute__((visibility("default")))

enum class IROpcode {
    LOAD, STORE, ADD, SUB, MOV, CALL, RET, JMP, CMP, UNKNOWN
};

struct IRInstruction {
    IROpcode opcode;
    uint64_t address;
    uint8_t size;
    // Simplified operands for POC
    uint64_t operand1; 
    uint64_t operand2;
};

class Lifter {
public:
    std::vector<IRInstruction> lift(const uint8_t* code, size_t length, uint64_t entryPoint) {
        std::vector<IRInstruction> ir;
        size_t pc = 0;

        while (pc < length) {
            uint8_t byte = code[pc];
            IRInstruction instr;
            instr.address = entryPoint + pc;

            // Basic x86 Decoding Logic (POC)
            switch (byte) {
                case 0x90: // NOP
                    instr.opcode = IROpcode::MOV;
                    instr.operand1 = 0; 
                    instr.size = 1;
                    break;
                case 0xC3: // RET
                    instr.opcode = IROpcode::RET;
                    instr.size = 1;
                    break;
                case 0xE9: // JMP rel32
                    instr.opcode = IROpcode::JMP;
                    instr.size = 5; 
                    break;
                case 0xB8: // MOV EAX, imm32
                    instr.opcode = IROpcode::MOV;
                    instr.size = 5;
                    break;
                case 0x55: // PUSH EBP
                    instr.opcode = IROpcode::STORE;
                    instr.size = 1;
                    break;
                case 0x89: // MOV r/m, r
                    instr.opcode = IROpcode::MOV;
                    instr.size = 2;
                    break;
                default:
                    instr.opcode = IROpcode::UNKNOWN;
                    instr.size = 1;
                    break;
            }

            ir.push_back(instr);
            pc += instr.size;
        }

        return ir;
    }
};

extern "C" {
    WASM_EXPORT int lift_code(const uint8_t* code, size_t length, uint64_t entry_point, IRInstruction* out_ir, size_t max_out) {
        Lifter lifter;
        auto instructions = lifter.lift(code, length, entry_point);
        
        size_t count = 0;
        for (const auto& instr : instructions) {
            if (count >= max_out) break;
            out_ir[count] = instr;
            count++;
        }
        
        return count;
    }
}

