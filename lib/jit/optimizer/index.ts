/**
 * JIT Optimizer Pipeline
 *
 * Browser-safe (Cloudflare Pages / edge runtime) — no Node.js built-ins.
 * Operates on SSA IR from the transpiler lifter.
 */

import {
    SSAFunction,
    SSABlock,
    SSAInstruction,
    SSAValue,
    IROpcode,
    IRType,
    LiveInterval,
    IRInstruction,
} from '../../transpiler/lifter/types';

// Augment SSAInstruction to allow optimizer metadata without touching the source type
type SSAInstructionWithMeta = SSAInstruction & { meta?: unknown };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Integer wrap to i32 range */
function wrapI32(v: number): number {
    return ((v | 0) >>> 0) | 0; // signed 32-bit wrap
}

/** Integer wrap to i64 — JS bigint is used where we need full 64-bit */
function wrapI64(v: bigint): bigint {
    const mask = (1n << 64n) - 1n;
    const wrapped = v & mask;
    // Convert to signed
    if (wrapped >= (1n << 63n)) return wrapped - (1n << 64n);
    return wrapped;
}

function isConstOpcode(op: IROpcode): boolean {
    return (
        op === IROpcode.CONST_I32 ||
        op === IROpcode.CONST_I64 ||
        op === IROpcode.CONST_F32 ||
        op === IROpcode.CONST_F64
    );
}

function hasSideEffects(instr: SSAInstruction): boolean {
    switch (instr.opcode) {
        case IROpcode.CALL:
        case IROpcode.CALL_INDIRECT:
        case IROpcode.STORE:
        case IROpcode.STORE32:
        case IROpcode.TRAP:
        case IROpcode.V128_STORE:
        case IROpcode.BR:
        case IROpcode.BR_IF:
        case IROpcode.BR_TABLE:
        case IROpcode.JMP:
        case IROpcode.RET:
            return true;
        default:
            return false;
    }
}

/** Deep-clone an SSAFunction (shallow-copies primitives, deep-copies collections) */
function cloneSSAFunction(fn: SSAFunction): SSAFunction {
    const valueMap = new Map<number, SSAValue>();

    function cloneValue(v: SSAValue): SSAValue {
        if (valueMap.has(v.id)) return valueMap.get(v.id)!;
        const cv: SSAValue = { id: v.id, type: v.type, defInstr: v.defInstr, useCount: v.useCount };
        valueMap.set(v.id, cv);
        return cv;
    }

    function cloneInstr(i: SSAInstruction): SSAInstruction {
        return {
            id: i.id,
            opcode: i.opcode,
            result: i.result ? cloneValue(i.result) : null,
            operands: i.operands.map(cloneValue),
            imm: i.imm,
            memOffset: i.memOffset,
            branchTarget: i.branchTarget,
            phiSources: i.phiSources?.map(ps => ({ blockId: ps.blockId, value: cloneValue(ps.value) })),
        };
    }

    const blocks = new Map<number, SSABlock>();
    for (const [id, block] of fn.blocks) {
        blocks.set(id, {
            id: block.id,
            startAddr: block.startAddr,
            instructions: block.instructions.map(cloneInstr),
            predecessors: [...block.predecessors],
            successors: [...block.successors],
            dominator: block.dominator,
        });
    }

    return {
        name: fn.name,
        entryBlock: fn.entryBlock,
        blocks,
        params: fn.params.map(cloneValue),
        returnType: fn.returnType,
        stackSlots: new Map(fn.stackSlots),
    };
}

/** Collect all instructions in RPO order */
function collectInstructionsRPO(fn: SSAFunction): SSAInstruction[] {
    const result: SSAInstruction[] = [];
    const visited = new Set<number>();
    const stack: number[] = [fn.entryBlock];
    while (stack.length > 0) {
        const blockId = stack.pop()!;
        if (visited.has(blockId)) continue;
        visited.add(blockId);
        const block = fn.blocks.get(blockId);
        if (!block) continue;
        for (const instr of block.instructions) result.push(instr);
        for (const s of block.successors) {
            if (!visited.has(s)) stack.push(s);
        }
    }
    return result;
}

/** Build a map from SSAValue.id → SSAInstruction that defines it */
function buildDefMap(fn: SSAFunction): Map<number, SSAInstruction> {
    const defMap = new Map<number, SSAInstruction>();
    for (const block of fn.blocks.values()) {
        for (const instr of block.instructions) {
            if (instr.result) defMap.set(instr.result.id, instr);
        }
    }
    return defMap;
}

/** Build a map from SSAValue.id → SSAValue (all known values) */
function buildValueMap(fn: SSAFunction): Map<number, SSAValue> {
    const vmap = new Map<number, SSAValue>();
    for (const p of fn.params) vmap.set(p.id, p);
    for (const block of fn.blocks.values()) {
        for (const instr of block.instructions) {
            if (instr.result) vmap.set(instr.result.id, instr.result);
            for (const op of instr.operands) vmap.set(op.id, op);
        }
    }
    return vmap;
}

// ---------------------------------------------------------------------------
// Pass 1 — Constant Folding
// ---------------------------------------------------------------------------

function foldConstants(fn: SSAFunction): SSAFunction {
    const defMap = buildDefMap(fn);

    function getConstValue(v: SSAValue): number | bigint | null {
        const def = defMap.get(v.id);
        if (!def || def.imm === undefined) return null;
        if (!isConstOpcode(def.opcode)) return null;
        return def.imm;
    }

    function makeConstInstr(
        id: number,
        result: SSAValue,
        value: number | bigint,
        type: IRType,
    ): SSAInstruction {
        let opcode: IROpcode;
        switch (type) {
            case IRType.I32: opcode = IROpcode.CONST_I32; break;
            case IRType.I64: opcode = IROpcode.CONST_I64; break;
            case IRType.F32: opcode = IROpcode.CONST_F32; break;
            case IRType.F64: opcode = IROpcode.CONST_F64; break;
            default: opcode = IROpcode.CONST_I32;
        }
        return { id, opcode, result, operands: [], imm: value };
    }

    for (const block of fn.blocks.values()) {
        const newInstrs: SSAInstruction[] = [];

        for (const instr of block.instructions) {
            // BR_IF with constant condition
            if (instr.opcode === IROpcode.BR_IF && instr.operands.length >= 1) {
                const condVal = getConstValue(instr.operands[0]);
                if (condVal !== null) {
                    // Decrement condition's use count
                    instr.operands[0].useCount = Math.max(0, instr.operands[0].useCount - 1);
                    const taken = typeof condVal === 'bigint' ? condVal !== 0n : condVal !== 0;
                    if (taken) {
                        // Always branch — convert to unconditional BR
                        newInstrs.push({
                            id: instr.id,
                            opcode: IROpcode.BR,
                            result: null,
                            operands: [],
                            branchTarget: instr.branchTarget,
                        });
                        // Remove non-taken successor
                        if (block.successors.length === 2) {
                            block.successors = [block.successors[0]];
                        }
                    } else {
                        // Never branch — fall through (NOP the BR_IF, keep fall-through successor)
                        newInstrs.push({ id: instr.id, opcode: IROpcode.NOP, result: null, operands: [] });
                        if (block.successors.length === 2) {
                            block.successors = [block.successors[1]];
                        }
                    }
                    continue;
                }
            }

            // Only fold if all operands are constants
            if (instr.operands.length === 0 || !instr.result) {
                newInstrs.push(instr);
                continue;
            }

            const constVals = instr.operands.map(getConstValue);
            if (constVals.some(v => v === null)) {
                newInstrs.push(instr);
                continue;
            }

            const vals = constVals as Array<number | bigint>;
            const resType = instr.result.type;
            const isInt = resType === IRType.I32 || resType === IRType.I64;
            const isI64 = resType === IRType.I64;

            let folded: number | bigint | null = null;

            // Helper to get numeric/bigint value uniformly
            const n = (i: number): number => typeof vals[i] === 'bigint' ? Number(vals[i] as bigint) : vals[i] as number;
            const b = (i: number): bigint => typeof vals[i] === 'bigint' ? vals[i] as bigint : BigInt(vals[i] as number);

            switch (instr.opcode) {
                case IROpcode.ADD:
                    folded = isI64 ? wrapI64(b(0) + b(1)) : wrapI32(n(0) + n(1));
                    break;
                case IROpcode.SUB:
                    folded = isI64 ? wrapI64(b(0) - b(1)) : wrapI32(n(0) - n(1));
                    break;
                case IROpcode.MUL:
                    folded = isI64 ? wrapI64(b(0) * b(1)) : wrapI32(Math.imul(n(0), n(1)));
                    break;
                case IROpcode.DIV:
                case IROpcode.DIV_S:
                case IROpcode.DIV_U: {
                    const divisor = isI64 ? b(1) : n(1);
                    if ((typeof divisor === 'bigint' && divisor === 0n) || divisor === 0) {
                        // Division by zero → TRAP
                        newInstrs.push({ id: instr.id, opcode: IROpcode.TRAP, result: null, operands: [] });
                        continue;
                    }
                    folded = isI64 ? wrapI64(b(0) / b(1)) : wrapI32(Math.trunc(n(0) / n(1)));
                    break;
                }
                case IROpcode.AND:
                    folded = isI64 ? wrapI64(b(0) & b(1)) : wrapI32(n(0) & n(1));
                    break;
                case IROpcode.OR:
                    folded = isI64 ? wrapI64(b(0) | b(1)) : wrapI32(n(0) | n(1));
                    break;
                case IROpcode.XOR:
                    folded = isI64 ? wrapI64(b(0) ^ b(1)) : wrapI32(n(0) ^ n(1));
                    break;
                case IROpcode.SHL:
                    folded = isI64 ? wrapI64(b(0) << (b(1) & 63n)) : wrapI32(n(0) << (n(1) & 31));
                    break;
                case IROpcode.SHR_S:
                    folded = isI64 ? wrapI64(b(0) >> (b(1) & 63n)) : wrapI32(n(0) >> (n(1) & 31));
                    break;
                case IROpcode.SHR_U:
                    folded = isI64
                        ? wrapI64(BigInt.asUintN(64, b(0)) >> (b(1) & 63n))
                        : wrapI32((n(0) >>> (n(1) & 31)));
                    break;
                case IROpcode.NEG:
                    if (isInt) folded = isI64 ? wrapI64(-b(0)) : wrapI32(-n(0));
                    else folded = -n(0);
                    break;
                case IROpcode.NOT:
                    folded = isI64 ? wrapI64(~b(0)) : wrapI32(~n(0));
                    break;
                default:
                    newInstrs.push(instr);
                    continue;
            }

            if (folded !== null) {
                // Decrement use counts on replaced operands
                for (const op of instr.operands) {
                    op.useCount = Math.max(0, op.useCount - 1);
                }
                newInstrs.push(makeConstInstr(instr.id, instr.result, folded, resType));
                // Update defMap so subsequent folds can see this
                defMap.set(instr.result.id, newInstrs[newInstrs.length - 1]);
            } else {
                newInstrs.push(instr);
            }
        }

        block.instructions = newInstrs;
    }

    return fn;
}

// ---------------------------------------------------------------------------
// Pass 2 — Dead Store Elimination
// ---------------------------------------------------------------------------

function eliminateDeadStores(fn: SSAFunction): SSAFunction {
    // Keep iterating until no more removals (operand removal may cascade)
    let changed = true;
    while (changed) {
        changed = false;
        for (const block of fn.blocks.values()) {
            const keep: SSAInstruction[] = [];
            for (const instr of block.instructions) {
                const isDead =
                    instr.result !== null &&
                    instr.result.useCount === 0 &&
                    !hasSideEffects(instr);
                if (isDead) {
                    // Decrement operand use counts
                    for (const op of instr.operands) {
                        op.useCount = Math.max(0, op.useCount - 1);
                    }
                    changed = true;
                } else {
                    keep.push(instr);
                }
            }
            block.instructions = keep;
        }
    }
    return fn;
}

// ---------------------------------------------------------------------------
// Pass 3 — Copy Propagation
// ---------------------------------------------------------------------------

function propagateCopies(fn: SSAFunction): SSAFunction {
    const defMap = buildDefMap(fn);

    // Build copy chain: follow MOV chains until we reach a non-MOV definition
    function resolveRoot(v: SSAValue): SSAValue {
        let cur = v;
        const seen = new Set<number>();
        while (true) {
            if (seen.has(cur.id)) break; // cycle guard
            seen.add(cur.id);
            const def = defMap.get(cur.id);
            if (!def || def.opcode !== IROpcode.MOV || def.operands.length === 0) break;
            cur = def.operands[0];
        }
        return cur;
    }

    for (const block of fn.blocks.values()) {
        for (const instr of block.instructions) {
            // Replace each operand with its copy-propagated root
            for (let i = 0; i < instr.operands.length; i++) {
                const root = resolveRoot(instr.operands[i]);
                if (root.id !== instr.operands[i].id) {
                    // Decrement old, increment new
                    instr.operands[i].useCount = Math.max(0, instr.operands[i].useCount - 1);
                    root.useCount++;
                    instr.operands[i] = root;
                }
            }
            // Also propagate in PHI sources
            if (instr.phiSources) {
                for (const ps of instr.phiSources) {
                    const root = resolveRoot(ps.value);
                    if (root.id !== ps.value.id) {
                        ps.value.useCount = Math.max(0, ps.value.useCount - 1);
                        root.useCount++;
                        ps.value = root;
                    }
                }
            }
        }
    }

    // MOVs that now have useCount 0 will be cleaned up by DSE
    return fn;
}

// ---------------------------------------------------------------------------
// Pass 4 — Inliner
// ---------------------------------------------------------------------------

/** Callsite context stored in instruction meta during inlining */
interface CallMeta {
    callee?: SSAFunction;
}

const INLINE_INSTR_LIMIT = 45;
const INLINE_ID_OFFSET = 1_000_000;

function countInstructions(fn: SSAFunction): number {
    let count = 0;
    for (const block of fn.blocks.values()) count += block.instructions.length;
    return count;
}

function isRecursive(callee: SSAFunction): boolean {
    for (const block of callee.blocks.values()) {
        for (const instr of block.instructions) {
            if (
                (instr.opcode === IROpcode.CALL || instr.opcode === IROpcode.CALL_INDIRECT) &&
                (instr.imm as string | undefined) === callee.name
            ) {
                return true;
            }
        }
    }
    return false;
}

function inlineFunctions(fn: SSAFunction): SSAFunction {
    // We need a global ID counter to keep SSA IDs unique
    let nextId = 0;
    for (const block of fn.blocks.values()) {
        for (const instr of block.instructions) {
            nextId = Math.max(nextId, instr.id + 1);
            if (instr.result) nextId = Math.max(nextId, instr.result.id + 1);
        }
    }

    // Compute which blocks are "hot" — for simplicity, treat all blocks as hot
    // (a real impl would consult profile counters)
    const hotBlocks = new Set<number>(fn.blocks.keys());

    for (const [blockId, block] of fn.blocks) {
        if (!hotBlocks.has(blockId)) continue;

        const newInstrs: SSAInstruction[] = [];
        for (const instr of block.instructions) {
            if (instr.opcode !== IROpcode.CALL) {
                newInstrs.push(instr);
                continue;
            }

            const meta = (instr as SSAInstructionWithMeta).meta as CallMeta | undefined;
            const callee = meta?.callee;

            if (
                !callee ||
                countInstructions(callee) > INLINE_INSTR_LIMIT ||
                isRecursive(callee)
            ) {
                newInstrs.push(instr);
                continue;
            }

            // Clone callee and remap all IDs by INLINE_ID_OFFSET
            const cloned = cloneSSAFunction(callee);
            const idOffset = INLINE_ID_OFFSET * (nextId + 1);

            // Remap helper
            function remapId(id: number): number {
                return id + idOffset;
            }

            // Remap all IDs in the cloned function
            for (const cb of cloned.blocks.values()) {
                cb.id = remapId(cb.id);
                cb.predecessors = cb.predecessors.map(remapId);
                cb.successors = cb.successors.map(remapId);
                cb.dominator = cb.dominator !== null ? remapId(cb.dominator) : null;
                for (const ci of cb.instructions) {
                    ci.id = remapId(ci.id);
                    if (ci.result) {
                        ci.result.id = remapId(ci.result.id);
                        ci.result.defInstr = remapId(ci.result.defInstr);
                    }
                    ci.operands = ci.operands.map(v => ({
                        ...v,
                        id: remapId(v.id),
                        defInstr: remapId(v.defInstr),
                    }));
                    if (ci.branchTarget !== undefined) ci.branchTarget = remapId(ci.branchTarget);
                    if (ci.phiSources) {
                        ci.phiSources = ci.phiSources.map(ps => ({
                            blockId: remapId(ps.blockId),
                            value: { ...ps.value, id: remapId(ps.value.id), defInstr: remapId(ps.value.defInstr) },
                        }));
                    }
                }
            }
            cloned.entryBlock = remapId(cloned.entryBlock);

            // Wire arguments: replace callee params with call-site operands
            const argMap = new Map<number, SSAValue>();
            for (let i = 0; i < cloned.params.length && i < instr.operands.length; i++) {
                argMap.set(remapId(cloned.params[i].id), instr.operands[i]);
            }

            // Substitute param references
            for (const cb of cloned.blocks.values()) {
                for (const ci of cb.instructions) {
                    ci.operands = ci.operands.map(v => argMap.get(v.id) ?? v);
                }
            }

            // Find RET instruction in callee; wire return value to call result
            let returnValue: SSAValue | null = null;
            for (const cb of cloned.blocks.values()) {
                for (const ci of cb.instructions) {
                    if (ci.opcode === IROpcode.RET && ci.operands.length > 0) {
                        returnValue = ci.operands[0];
                        // Replace RET with NOP
                        ci.opcode = IROpcode.NOP;
                        ci.operands = [];
                    }
                }
            }

            // If call has a result, wire it to the return value via MOV
            if (instr.result && returnValue) {
                const movInstr: SSAInstruction = {
                    id: nextId++,
                    opcode: IROpcode.MOV,
                    result: instr.result,
                    operands: [returnValue],
                };
                // Merge all cloned blocks into fn
                for (const [cbId, cb] of cloned.blocks) {
                    fn.blocks.set(cbId, cb);
                }
                // Replace call with entry block's instructions + MOV
                const entryBlock = cloned.blocks.get(cloned.entryBlock)!;
                newInstrs.push(...entryBlock.instructions);
                newInstrs.push(movInstr);
            } else {
                for (const [cbId, cb] of cloned.blocks) {
                    fn.blocks.set(cbId, cb);
                }
                const entryBlock = cloned.blocks.get(cloned.entryBlock)!;
                newInstrs.push(...entryBlock.instructions);
            }
        }

        block.instructions = newInstrs;
    }

    return fn;
}

// ---------------------------------------------------------------------------
// Pass 5 — LICM (Loop Invariant Code Motion)
// ---------------------------------------------------------------------------

/** Compute dominators using simple fixed-point iteration (Cooper et al.) */
function computeDominators(fn: SSAFunction): Map<number, Set<number>> {
    const blockIds = [...fn.blocks.keys()];
    const domSets = new Map<number, Set<number>>();

    // Initialize
    for (const id of blockIds) {
        domSets.set(id, new Set(blockIds));
    }
    domSets.set(fn.entryBlock, new Set([fn.entryBlock]));

    let changed = true;
    while (changed) {
        changed = false;
        for (const id of blockIds) {
            if (id === fn.entryBlock) continue;
            const block = fn.blocks.get(id)!;
            let newDom: Set<number> | null = null;
            for (const predId of block.predecessors) {
                const predDom = domSets.get(predId)!;
                if (newDom === null) {
                    newDom = new Set(predDom);
                } else {
                    for (const d of newDom) {
                        if (!predDom.has(d)) newDom.delete(d);
                    }
                }
            }
            if (newDom === null) newDom = new Set<number>();
            newDom.add(id);

            const old = domSets.get(id)!;
            if (newDom.size !== old.size || ![...newDom].every(d => old.has(d))) {
                domSets.set(id, newDom);
                changed = true;
            }
        }
    }

    return domSets;
}

/** Detect back edges: (B → S) where S dominates B */
function findBackEdges(fn: SSAFunction, domSets: Map<number, Set<number>>): Array<[number, number]> {
    const backEdges: Array<[number, number]> = [];
    for (const [id, block] of fn.blocks) {
        for (const succId of block.successors) {
            if (domSets.get(id)?.has(succId)) {
                backEdges.push([id, succId]); // back edge from id to succId (loop header)
            }
        }
    }
    return backEdges;
}

/** Collect all blocks in a natural loop given back edge tail → header */
function collectLoopBlocks(fn: SSAFunction, tail: number, header: number): Set<number> {
    const loop = new Set<number>([header]);
    const worklist: number[] = [tail];
    while (worklist.length > 0) {
        const b = worklist.pop()!;
        if (loop.has(b)) continue;
        loop.add(b);
        const block = fn.blocks.get(b);
        if (!block) continue;
        for (const pred of block.predecessors) worklist.push(pred);
    }
    return loop;
}

function hoistLoopInvariants(fn: SSAFunction): SSAFunction {
    const domSets = computeDominators(fn);
    const backEdges = findBackEdges(fn, domSets);

    for (const [tail, header] of backEdges) {
        const loopBlocks = collectLoopBlocks(fn, tail, header);
        const headerBlock = fn.blocks.get(header);
        if (!headerBlock) continue;

        // Find or create pre-header
        // Pre-header: new block that is the sole predecessor of header from outside the loop
        const outsidePreds = headerBlock.predecessors.filter(p => !loopBlocks.has(p));
        if (outsidePreds.length === 0) continue;

        // Compute all value IDs defined inside the loop
        const loopDefs = new Set<number>();
        for (const bid of loopBlocks) {
            const b = fn.blocks.get(bid)!;
            for (const instr of b.instructions) {
                if (instr.result) loopDefs.add(instr.result.id);
            }
        }

        // Create pre-header block if it doesn't exist
        let preHeaderId = -1;
        const existingPreHeader = outsidePreds.find(p => {
            const pb = fn.blocks.get(p)!;
            return pb.successors.length === 1 && pb.successors[0] === header;
        });

        if (existingPreHeader !== undefined) {
            preHeaderId = existingPreHeader;
        } else {
            // Create a new pre-header
            preHeaderId = Math.max(...fn.blocks.keys()) + 1;
            const preHeader: SSABlock = {
                id: preHeaderId,
                startAddr: 0,
                instructions: [],
                predecessors: [...outsidePreds],
                successors: [header],
                dominator: null,
            };
            fn.blocks.set(preHeaderId, preHeader);

            // Redirect outside preds to pre-header
            for (const pid of outsidePreds) {
                const pb = fn.blocks.get(pid)!;
                pb.successors = pb.successors.map(s => (s === header ? preHeaderId : s));
                headerBlock.predecessors = headerBlock.predecessors.map(p => (p === pid ? preHeaderId : p));
            }
            headerBlock.predecessors.push(preHeaderId);
            // Clean up duplicates from the initial set
            headerBlock.predecessors = [...new Set(headerBlock.predecessors)];
        }

        const preHeaderBlock = fn.blocks.get(preHeaderId)!;

        // Hoist loop-invariant instructions from loop blocks
        for (const bid of loopBlocks) {
            if (bid === header) continue; // Header last, preserve PHI structure
            const b = fn.blocks.get(bid)!;
            const keep: SSAInstruction[] = [];
            for (const instr of b.instructions) {
                if (hasSideEffects(instr)) { keep.push(instr); continue; }
                if (!instr.result) { keep.push(instr); continue; }
                // Invariant: all operands defined outside loop
                const invariant = instr.operands.every(op => !loopDefs.has(op.id));
                if (invariant) {
                    loopDefs.delete(instr.result.id); // no longer defined inside loop
                    // Insert before terminal of pre-header
                    const terminal = preHeaderBlock.instructions.findIndex(
                        i => i.opcode === IROpcode.BR || i.opcode === IROpcode.BR_IF,
                    );
                    if (terminal === -1) {
                        preHeaderBlock.instructions.push(instr);
                    } else {
                        preHeaderBlock.instructions.splice(terminal, 0, instr);
                    }
                } else {
                    keep.push(instr);
                }
            }
            b.instructions = keep;
        }
    }

    return fn;
}

// ---------------------------------------------------------------------------
// Pass 6 — Loop Unrolling
// ---------------------------------------------------------------------------

const UNROLL_TRIP_LIMIT = 8;
const UNROLL_INSTR_LIMIT = 200;

function unrollLoops(fn: SSAFunction): SSAFunction {
    const domSets = computeDominators(fn);
    const backEdges = findBackEdges(fn, domSets);

    let nextBlockId = Math.max(...fn.blocks.keys()) + 1;
    let nextInstrId = 0;
    let nextValueId = 0;
    for (const b of fn.blocks.values()) {
        for (const i of b.instructions) {
            nextInstrId = Math.max(nextInstrId, i.id + 1);
            if (i.result) nextValueId = Math.max(nextValueId, i.result.id + 1);
        }
    }

    for (const [tail, header] of backEdges) {
        const loopBlocks = collectLoopBlocks(fn, tail, header);
        const headerBlock = fn.blocks.get(header)!;

        // Count instructions in loop body
        let bodyInstrCount = 0;
        for (const bid of loopBlocks) bodyInstrCount += fn.blocks.get(bid)!.instructions.length;

        // Find static trip count via the back-edge condition
        // Look for a CONST_I32 controlling BR_IF in header
        let tripCount: number | null = null;
        for (const instr of headerBlock.instructions) {
            if (instr.opcode === IROpcode.BR_IF && instr.operands.length > 0) {
                // If the operand is a CMP result we can't easily determine trip count statically
                // We only handle the case where the branch operand is a direct CONST_I32
                const defMap = buildDefMap(fn);
                const condDef = defMap.get(instr.operands[0].id);
                if (condDef && isConstOpcode(condDef.opcode) && typeof condDef.imm === 'number') {
                    tripCount = condDef.imm;
                }
            }
        }

        if (
            tripCount === null ||
            tripCount > UNROLL_TRIP_LIMIT ||
            tripCount * bodyInstrCount > UNROLL_INSTR_LIMIT
        ) {
            continue;
        }

        // Duplicate loop body N times (already executed once in original), remove back edge
        // For simplicity: clone body N-1 more times and chain them
        const blockSeq: number[] = [...loopBlocks];

        for (let iter = 1; iter < tripCount; iter++) {
            const idOff = iter * 2_000_000;
            const newBlockIds: number[] = [];

            for (const bid of blockSeq) {
                const orig = fn.blocks.get(bid)!;
                const newId = nextBlockId++;
                newBlockIds.push(newId);

                const newBlock: SSABlock = {
                    id: newId,
                    startAddr: orig.startAddr,
                    instructions: orig.instructions.map(i => ({
                        id: i.id + idOff,
                        opcode: i.opcode,
                        result: i.result
                            ? { id: i.result.id + idOff, type: i.result.type, defInstr: i.result.defInstr + idOff, useCount: i.result.useCount }
                            : null,
                        operands: i.operands.map(v => ({ id: v.id + idOff, type: v.type, defInstr: v.defInstr + idOff, useCount: v.useCount })),
                        imm: i.imm,
                        memOffset: i.memOffset,
                        branchTarget: i.branchTarget !== undefined ? i.branchTarget + idOff : undefined,
                    })),
                    predecessors: orig.predecessors.map(p => p + idOff),
                    successors: orig.successors.map(s => s + idOff),
                    dominator: orig.dominator !== null ? orig.dominator + idOff : null,
                };
                fn.blocks.set(newId, newBlock);
            }
        }

        // Remove back edge from tail → header
        const tailBlock = fn.blocks.get(tail)!;
        tailBlock.successors = tailBlock.successors.filter(s => s !== header);
        headerBlock.predecessors = headerBlock.predecessors.filter(p => p !== tail);

        // Remove the back-edge BR from tail block
        tailBlock.instructions = tailBlock.instructions.filter(
            i => !(i.opcode === IROpcode.BR && i.branchTarget === header),
        );
    }

    return fn;
}

// ---------------------------------------------------------------------------
// Pass 7 — CSE (Common Subexpression Elimination)
// ---------------------------------------------------------------------------

function eliminateCommonSubexpressions(fn: SSAFunction): SSAFunction {
    // Process blocks in RPO, tracking expression → first SSAValue that computed it
    const visited = new Set<number>();
    const stack: number[] = [fn.entryBlock];
    const exprMap = new Map<string, SSAValue>(); // expression key → canonical value

    function exprKey(instr: SSAInstruction): string | null {
        if (hasSideEffects(instr)) return null;
        if (!instr.result) return null;
        if (instr.opcode === IROpcode.PHI) return null; // PHI nodes are not CSE candidates
        // Key: opcode + sorted or ordered operand IDs (order matters for non-commutative)
        const operandStr = instr.operands.map(v => v.id).join(',');
        const immStr = instr.imm !== undefined ? `@${String(instr.imm)}` : '';
        const memStr = instr.memOffset !== undefined ? `#${instr.memOffset}` : '';
        return `${instr.opcode}:${operandStr}${immStr}${memStr}`;
    }

    while (stack.length > 0) {
        const blockId = stack.pop()!;
        if (visited.has(blockId)) continue;
        visited.add(blockId);

        const block = fn.blocks.get(blockId)!;
        const newInstrs: SSAInstruction[] = [];

        for (const instr of block.instructions) {
            const key = exprKey(instr);
            if (key !== null) {
                const canonical = exprMap.get(key);
                if (canonical && instr.result) {
                    // Replace this instruction's result with canonical value
                    // All uses of instr.result.id should now point to canonical
                    // We emit a MOV so copy propagation can clean it up
                    for (const op of instr.operands) {
                        op.useCount = Math.max(0, op.useCount - 1);
                    }
                    instr.result.useCount = Math.max(0, instr.result.useCount);
                    canonical.useCount += instr.result.useCount;

                    const movInstr: SSAInstruction = {
                        id: instr.id,
                        opcode: IROpcode.MOV,
                        result: instr.result,
                        operands: [canonical],
                    };
                    newInstrs.push(movInstr);
                    continue;
                } else if (instr.result) {
                    exprMap.set(key, instr.result);
                }
            }
            newInstrs.push(instr);
        }

        block.instructions = newInstrs;

        for (const s of block.successors) {
            if (!visited.has(s)) stack.push(s);
        }
    }

    return fn;
}

// ---------------------------------------------------------------------------
// Pass 8 — Linear Scan Register Allocator
// ---------------------------------------------------------------------------

/** Extended SSAFunction with live intervals */
interface SSAFunctionWithIntervals extends SSAFunction {
    liveIntervals?: LiveInterval[];
}

function allocateRegisters(fn: SSAFunction): SSAFunctionWithIntervals {
    // 1. Assign a linear position to every instruction
    const instrOrder = new Map<number, number>(); // instrId → position
    let pos = 0;
    const visited = new Set<number>();
    const stack: number[] = [fn.entryBlock];

    while (stack.length > 0) {
        const blockId = stack.pop()!;
        if (visited.has(blockId)) continue;
        visited.add(blockId);
        const block = fn.blocks.get(blockId)!;
        for (const instr of block.instructions) {
            instrOrder.set(instr.id, pos++);
        }
        for (const s of block.successors) {
            if (!visited.has(s)) stack.push(s);
        }
    }

    // 2. Compute live intervals: first def → last use
    const intervals = new Map<number, LiveInterval>(); // valueId → interval

    function touchValue(v: SSAValue, atPos: number): void {
        const existing = intervals.get(v.id);
        if (!existing) {
            intervals.set(v.id, { valueId: v.id, type: v.type, start: atPos, end: atPos, localIdx: -1 });
        } else {
            if (atPos < existing.start) existing.start = atPos;
            if (atPos > existing.end) existing.end = atPos;
        }
    }

    for (const [, block] of fn.blocks) {
        for (const instr of block.instructions) {
            const p = instrOrder.get(instr.id) ?? 0;
            if (instr.result) touchValue(instr.result, p);
            for (const op of instr.operands) touchValue(op, p);
            if (instr.phiSources) {
                for (const ps of instr.phiSources) touchValue(ps.value, p);
            }
        }
    }

    // 3. Sort intervals by start
    const sortedIntervals = [...intervals.values()].sort((a, b) => a.start - b.start);

    // 4. Linear scan allocation: separate pools per type
    // Pool: list of free local indices
    const typeToPool = new Map<IRType, number[]>([
        [IRType.I32, []],
        [IRType.I64, []],
        [IRType.F32, []],
        [IRType.F64, []],
        [IRType.V128, []],
        [IRType.PTR, []],
        [IRType.VOID, []],
    ]);
    const typeNextIdx = new Map<IRType, number>([
        [IRType.I32, 0],
        [IRType.I64, 0],
        [IRType.F32, 0],
        [IRType.F64, 0],
        [IRType.V128, 0],
        [IRType.PTR, 0],
        [IRType.VOID, 0],
    ]);

    const MAX_LOCALS_PER_TYPE = 64;

    // Active set: intervals currently live, sorted by end
    const active: LiveInterval[] = [];

    function expireOld(current: LiveInterval): void {
        // Remove intervals whose end is before current.start
        for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].end < current.start) {
                const expired = active.splice(i, 1)[0];
                // Return local index to pool
                const pool = typeToPool.get(expired.type);
                if (pool && expired.localIdx >= 0) pool.push(expired.localIdx);
            }
        }
    }

    for (const interval of sortedIntervals) {
        expireOld(interval);

        const pool = typeToPool.get(interval.type) ?? [];
        if (pool.length > 0) {
            interval.localIdx = pool.pop()!;
        } else {
            const next = typeNextIdx.get(interval.type) ?? 0;
            if (next < MAX_LOCALS_PER_TYPE) {
                interval.localIdx = next;
                typeNextIdx.set(interval.type, next + 1);
            } else {
                interval.localIdx = -1; // spilled
            }
        }

        active.push(interval);
        active.sort((a, b) => a.end - b.end);
    }

    const result = fn as SSAFunctionWithIntervals;
    result.liveIntervals = sortedIntervals;
    return result;
}

// ---------------------------------------------------------------------------
// Pass 9 — SIMD Widening
// ---------------------------------------------------------------------------

/**
 * Detect pattern: 4× scalar I32_ADD on LOAD32 at stride-4 addresses.
 * Replace with V128_LOAD + I32X4_ADD.
 *
 * Pattern in one block:
 *   v0 = LOAD32 [base + 0]
 *   v1 = LOAD32 [base + 4]
 *   v2 = LOAD32 [base + 8]
 *   v3 = LOAD32 [base + 12]
 *   a0 = LOAD32 [src  + 0]
 *   a1 = LOAD32 [src  + 4]
 *   a2 = LOAD32 [src  + 8]
 *   a3 = LOAD32 [src  + 12]
 *   r0 = ADD v0 a0
 *   r1 = ADD v1 a1
 *   r2 = ADD v2 a2
 *   r3 = ADD v3 a3
 */
function widenToSIMD(fn: SSAFunction): SSAFunction {
    for (const block of fn.blocks.values()) {
        const instrs = block.instructions;

        // Index loads by (base value id, offset)
        const load32Map = new Map<string, { instr: SSAInstruction; baseId: number; offset: number }>();
        for (const instr of instrs) {
            if (instr.opcode === IROpcode.LOAD32 && instr.result && instr.operands.length >= 1) {
                const offset = instr.memOffset ?? 0;
                const baseId = instr.operands[0].id;
                load32Map.set(`${baseId}:${offset}`, { instr, baseId, offset });
            }
        }

        // Find groups of 4 consecutive LOAD32s sharing a base with stride 4
        // Then find ADD groups that use those loads
        interface LoadGroup {
            base: number;
            startOffset: number;
            loads: SSAInstruction[]; // 4 loads
        }

        const groups: LoadGroup[] = [];
        const usedInstrs = new Set<number>();

        for (const [, entry] of load32Map) {
            if (entry.offset % 16 !== 0) continue; // look for groups starting at 16-byte aligned offsets
            const loads: SSAInstruction[] = [];
            for (let i = 0; i < 4; i++) {
                const key = `${entry.baseId}:${entry.offset + i * 4}`;
                const l = load32Map.get(key);
                if (!l) break;
                loads.push(l.instr);
            }
            if (loads.length === 4) {
                groups.push({ base: entry.baseId, startOffset: entry.offset, loads });
            }
        }

        if (groups.length < 2) continue; // Need at least two groups for an ADD

        // Find ADD patterns: pairs of groups where each load from group A adds with corresponding load from group B
        for (let gi = 0; gi < groups.length; gi++) {
            for (let gj = gi + 1; gj < groups.length; gj++) {
                const gA = groups[gi];
                const gB = groups[gj];

                // Find 4 ADD instructions: ADD(gA.loads[k].result, gB.loads[k].result)
                const addInstrs: SSAInstruction[] = [];
                for (let k = 0; k < 4; k++) {
                    const la = gA.loads[k];
                    const lb = gB.loads[k];
                    if (!la.result || !lb.result) break;
                    const found = instrs.find(i =>
                        i.opcode === IROpcode.ADD &&
                        i.operands.length === 2 &&
                        ((i.operands[0].id === la.result!.id && i.operands[1].id === lb.result!.id) ||
                            (i.operands[0].id === lb.result!.id && i.operands[1].id === la.result!.id)) &&
                        !usedInstrs.has(i.id),
                    );
                    if (!found) break;
                    addInstrs.push(found);
                }

                if (addInstrs.length < 4) continue;

                // Mark as used
                for (const l of gA.loads) usedInstrs.add(l.id);
                for (const l of gB.loads) usedInstrs.add(l.id);
                for (const a of addInstrs) usedInstrs.add(a.id);

                // Generate SIMD replacement
                // Find a representative base SSAValue
                const baseValA = gA.loads[0].operands[0];
                const baseValB = gB.loads[0].operands[0];

                // We need an SSAValue for the SIMD result — reuse the first ADD's result
                const simdResult = addInstrs[0].result!;

                // Create V128_LOAD for gA
                let nextSIMDId = 0;
                for (const b of fn.blocks.values())
                    for (const i of b.instructions) nextSIMDId = Math.max(nextSIMDId, i.id + 1);

                const vA: SSAValue = { id: nextSIMDId + 1, type: IRType.V128, defInstr: nextSIMDId, useCount: 1 };
                const loadA: SSAInstruction = {
                    id: nextSIMDId,
                    opcode: IROpcode.V128_LOAD,
                    result: vA,
                    operands: [baseValA],
                    memOffset: gA.startOffset,
                };
                nextSIMDId += 2;

                const vB: SSAValue = { id: nextSIMDId + 1, type: IRType.V128, defInstr: nextSIMDId, useCount: 1 };
                const loadB: SSAInstruction = {
                    id: nextSIMDId,
                    opcode: IROpcode.V128_LOAD,
                    result: vB,
                    operands: [baseValB],
                    memOffset: gB.startOffset,
                };
                nextSIMDId += 2;

                const addSIMD: SSAInstruction = {
                    id: nextSIMDId,
                    opcode: IROpcode.I32X4_ADD,
                    result: { ...simdResult, type: IRType.V128 },
                    operands: [vA, vB],
                };

                // Replace first ADD with the SIMD sequence; NOP the rest
                let insertedSIMD = false;
                const newInstrs: SSAInstruction[] = [];
                for (const instr of block.instructions) {
                    if (usedInstrs.has(instr.id)) {
                        if (instr.id === addInstrs[0].id && !insertedSIMD) {
                            newInstrs.push(loadA, loadB, addSIMD);
                            insertedSIMD = true;
                        }
                        // Skip replaced instructions
                        continue;
                    }
                    newInstrs.push(instr);
                }
                block.instructions = newInstrs;
            }
        }
    }

    return fn;
}

// ---------------------------------------------------------------------------
// buildSSAFromFlat — Mem2Reg / SSA construction from flat IRInstruction[]
// ---------------------------------------------------------------------------

export function buildSSAFromFlat(
    name: string,
    instructions: IRInstruction[],
): SSAFunction {
    if (instructions.length === 0) {
        const emptyBlock: SSABlock = {
            id: 0,
            startAddr: 0,
            instructions: [],
            predecessors: [],
            successors: [],
            dominator: null,
        };
        return {
            name,
            entryBlock: 0,
            blocks: new Map([[0, emptyBlock]]),
            params: [],
            returnType: IRType.VOID,
            stackSlots: new Map(),
        };
    }

    // Split flat instructions into basic blocks at BR/BR_IF/RET boundaries
    const blocks: IRInstruction[][] = [];
    let current: IRInstruction[] = [];

    for (const instr of instructions) {
        current.push(instr);
        const op = instr.opcode.toLowerCase();
        if (op === 'br' || op === 'br_if' || op === 'br_table' || op === 'jmp' || op === 'ret') {
            blocks.push(current);
            current = [];
        }
    }
    if (current.length > 0) blocks.push(current);

    // Assign block IDs
    const ssaBlocks = new Map<number, SSABlock>();
    let valueIdCounter = 0;
    let instrIdCounter = 0;

    // Map IRInstruction.id → SSAValue (for operand resolution)
    const irIdToValue = new Map<number, SSAValue>();

    // Determine IRType from opcode / operand metadata
    function inferType(instr: IRInstruction): IRType {
        const op = instr.opcode.toLowerCase();
        if (op === 'const_i64') return IRType.I64;
        if (op === 'const_f32') return IRType.F32;
        if (op === 'const_f64') return IRType.F64;
        if (op.includes('f64')) return IRType.F64;
        if (op.includes('f32')) return IRType.F32;
        if (op.includes('i64') || op.includes('64')) return IRType.I64;
        if (op.includes('v128')) return IRType.V128;
        if (op === 'ret' || op === 'store' || op === 'store32' || op === 'trap' || op === 'nop') return IRType.VOID;
        return IRType.I32;
    }

    function opcodeFromString(op: string): IROpcode {
        const upper = op.toUpperCase() as keyof typeof IROpcode;
        // Try direct mapping
        for (const key of Object.keys(IROpcode) as Array<keyof typeof IROpcode>) {
            if (IROpcode[key].toLowerCase() === op.toLowerCase()) return IROpcode[key];
        }
        return IROpcode.UNKNOWN;
    }

    function getImmFromIR(instr: IRInstruction): number | bigint | undefined {
        if (instr.op1?.type === 'imm') {
            const v = instr.op1.value;
            return typeof v === 'number' ? v : undefined;
        }
        return undefined;
    }

    for (let bi = 0; bi < blocks.length; bi++) {
        const rawInstrs = blocks[bi];
        const ssaInstrs: SSAInstruction[] = [];

        for (const raw of rawInstrs) {
            const opcode = opcodeFromString(raw.opcode);
            const type = inferType(raw);
            const hasResult = type !== IRType.VOID && opcode !== IROpcode.BR && opcode !== IROpcode.BR_IF;

            const result: SSAValue | null = hasResult
                ? { id: valueIdCounter++, type, defInstr: instrIdCounter, useCount: 0 }
                : null;

            // Resolve operands: each op that references a previous IR id
            const operands: SSAValue[] = [];

            function resolveOp(op: IRInstruction['op1']): void {
                if (!op) return;
                if (op.type === 'temp' || op.type === 'reg') {
                    const refId = typeof op.value === 'number' ? op.value : parseInt(op.value as string, 10);
                    const existing = irIdToValue.get(refId);
                    if (existing) {
                        existing.useCount++;
                        operands.push(existing);
                    }
                }
                // imm operands are captured via getImmFromIR
            }

            resolveOp(raw.op1);
            resolveOp(raw.op2);
            resolveOp(raw.op3);

            const ssaInstr: SSAInstruction = {
                id: instrIdCounter++,
                opcode,
                result,
                operands,
                imm: getImmFromIR(raw),
                memOffset: raw.addr,
            };

            if (result) {
                irIdToValue.set(raw.id, result);
                result.defInstr = ssaInstr.id;
            }

            ssaInstrs.push(ssaInstr);
        }

        // Infer successors from the last instruction
        const lastRaw = rawInstrs[rawInstrs.length - 1];
        const successors: number[] = [];
        const lastOp = lastRaw.opcode.toLowerCase();
        if (lastOp === 'br' || lastOp === 'jmp') {
            if (typeof lastRaw.op1?.value === 'number') successors.push(lastRaw.op1.value);
        } else if (lastOp === 'br_if') {
            if (typeof lastRaw.op1?.value === 'number') successors.push(lastRaw.op1.value);
            if (bi + 1 < blocks.length) successors.push(bi + 1); // fall-through
        } else if (lastOp !== 'ret') {
            if (bi + 1 < blocks.length) successors.push(bi + 1);
        }

        ssaBlocks.set(bi, {
            id: bi,
            startAddr: rawInstrs[0].addr ?? 0,
            instructions: ssaInstrs,
            predecessors: [], // filled in below
            successors,
            dominator: bi === 0 ? null : 0,
        });
    }

    // Fill predecessors
    for (const [id, block] of ssaBlocks) {
        for (const s of block.successors) {
            const sb = ssaBlocks.get(s);
            if (sb && !sb.predecessors.includes(id)) sb.predecessors.push(id);
        }
    }

    return {
        name,
        entryBlock: 0,
        blocks: ssaBlocks,
        params: [],
        returnType: IRType.VOID,
        stackSlots: new Map(),
    };
}

// ---------------------------------------------------------------------------
// JITOptimizerPipeline
// ---------------------------------------------------------------------------

export class JITOptimizerPipeline {
    private readonly tier: number;

    constructor(tier: number) {
        this.tier = tier;
    }

    run(fn: SSAFunction): SSAFunction {
        let result = fn;

        if (this.tier >= 1) {
            result = foldConstants(result);
            result = eliminateDeadStores(result);
            result = propagateCopies(result);
            // Run DSE again after copy propagation exposes more dead MOVs
            result = eliminateDeadStores(result);
        }

        if (this.tier >= 2) {
            result = inlineFunctions(result);
            result = hoistLoopInvariants(result);
            result = unrollLoops(result);
            result = eliminateCommonSubexpressions(result);
            // Re-run tier 1 passes after tier 2 transformations
            result = foldConstants(result);
            result = propagateCopies(result);
            result = eliminateDeadStores(result);
            result = allocateRegisters(result);
            result = widenToSIMD(result);
        }

        return result;
    }
}
