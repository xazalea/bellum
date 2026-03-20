/**
 * HLSL → WGSL Source-to-Source Transpiler
 * 4-phase: Lexer → Parser → Semantic Mapping → Code Generation
 * Cloudflare Pages / Edge Runtime compatible — zero Node.js built-ins.
 */

// ---------------------------------------------------------------------------
// PHASE 1: LEXER
// ---------------------------------------------------------------------------

export type TokenType =
  | 'keyword'
  | 'identifier'
  | 'number'
  | 'operator'
  | 'punctuation'
  | 'string'
  | 'whitespace';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

const HLSL_KEYWORDS = new Set([
  'cbuffer', 'tbuffer', 'struct', 'return', 'if', 'else', 'for', 'while',
  'do', 'break', 'continue', 'discard', 'true', 'false', 'void',
  'float', 'float2', 'float3', 'float4',
  'float2x2', 'float3x3', 'float4x4', 'matrix',
  'int', 'int2', 'int3', 'int4',
  'uint', 'uint2', 'uint3', 'uint4',
  'bool', 'half', 'double',
  'Texture2D', 'Texture3D', 'TextureCube',
  'Texture2DArray', 'TextureCubeArray',
  'SamplerState', 'SamplerComparisonState',
  'RWTexture2D', 'RWBuffer', 'RWStructuredBuffer', 'StructuredBuffer',
  'ByteAddressBuffer', 'RWByteAddressBuffer',
  'register', 'packoffset', 'in', 'out', 'inout', 'uniform',
  'static', 'const', 'inline', 'extern', 'volatile', 'shared', 'groupshared',
  'row_major', 'column_major',
  'numthreads',
]);

const OPERATORS = new Set([
  '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=',
  '&&', '||', '==', '!=', '<=', '>=', '<<', '>>', '->', '::',
  '+', '-', '*', '/', '%', '&', '|', '^', '~', '!', '<', '>', '=', '?',
]);

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  const advance = (n = 1) => {
    for (let i = 0; i < n; i++) {
      if (src[pos] === '\n') { line++; col = 1; } else { col++; }
      pos++;
    }
  };

  while (pos < src.length) {
    const startLine = line;
    const startCol = col;
    const ch = src[pos];

    // Block comments
    if (src[pos] === '/' && src[pos + 1] === '*') {
      let v = '';
      while (pos < src.length && !(src[pos] === '*' && src[pos + 1] === '/')) {
        v += src[pos]; advance();
      }
      if (pos < src.length) { v += '*/'; advance(2); }
      tokens.push({ type: 'whitespace', value: v, line: startLine, col: startCol });
      continue;
    }

    // Line comments
    if (src[pos] === '/' && src[pos + 1] === '/') {
      let v = '';
      while (pos < src.length && src[pos] !== '\n') { v += src[pos]; advance(); }
      tokens.push({ type: 'whitespace', value: v, line: startLine, col: startCol });
      continue;
    }

    // Preprocessor directives — treat as whitespace/comment
    if (ch === '#') {
      let v = '';
      while (pos < src.length && src[pos] !== '\n') { v += src[pos]; advance(); }
      tokens.push({ type: 'whitespace', value: v, line: startLine, col: startCol });
      continue;
    }

    // Whitespace
    if (/\s/.test(ch)) {
      let v = '';
      while (pos < src.length && /\s/.test(src[pos])) { v += src[pos]; advance(); }
      tokens.push({ type: 'whitespace', value: v, line: startLine, col: startCol });
      continue;
    }

    // String literals
    if (ch === '"') {
      let v = '"';
      advance();
      while (pos < src.length && src[pos] !== '"') {
        if (src[pos] === '\\') { v += src[pos]; advance(); }
        v += src[pos]; advance();
      }
      v += '"'; advance();
      tokens.push({ type: 'string', value: v, line: startLine, col: startCol });
      continue;
    }

    // Numbers: hex, float, int
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[pos + 1] ?? ''))) {
      let v = '';
      if (ch === '0' && (src[pos + 1] === 'x' || src[pos + 1] === 'X')) {
        v += src[pos]; advance(); v += src[pos]; advance();
        while (pos < src.length && /[0-9a-fA-F]/.test(src[pos])) { v += src[pos]; advance(); }
      } else {
        while (pos < src.length && /[0-9]/.test(src[pos])) { v += src[pos]; advance(); }
        if (pos < src.length && src[pos] === '.') {
          v += src[pos]; advance();
          while (pos < src.length && /[0-9]/.test(src[pos])) { v += src[pos]; advance(); }
        }
        if (pos < src.length && (src[pos] === 'e' || src[pos] === 'E')) {
          v += src[pos]; advance();
          if (pos < src.length && (src[pos] === '+' || src[pos] === '-')) { v += src[pos]; advance(); }
          while (pos < src.length && /[0-9]/.test(src[pos])) { v += src[pos]; advance(); }
        }
        // suffix: f, u, l, etc.
        while (pos < src.length && /[fFuUlL]/.test(src[pos])) { v += src[pos]; advance(); }
      }
      tokens.push({ type: 'number', value: v, line: startLine, col: startCol });
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let v = '';
      while (pos < src.length && /[a-zA-Z0-9_]/.test(src[pos])) { v += src[pos]; advance(); }
      const type: TokenType = HLSL_KEYWORDS.has(v) ? 'keyword' : 'identifier';
      tokens.push({ type, value: v, line: startLine, col: startCol });
      continue;
    }

    // Operators (try longest match first)
    let matched = false;
    for (const op of ['<<=', '>>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '&&', '||', '==', '!=', '<=', '>=', '<<', '>>', '->', '::', '+', '-', '*', '/', '%', '&', '|', '^', '~', '!', '<', '>', '=', '?']) {
      if (src.startsWith(op, pos)) {
        tokens.push({ type: 'operator', value: op, line: startLine, col: startCol });
        advance(op.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Punctuation
    if ('{}[]();:,.'.includes(ch)) {
      tokens.push({ type: 'punctuation', value: ch, line: startLine, col: startCol });
      advance();
      continue;
    }

    // Unknown — skip
    advance();
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// PHASE 2: PARSER — AST nodes
// ---------------------------------------------------------------------------

export type ASTNode =
  | ProgramNode
  | CBufferNode
  | TextureNode
  | SamplerNode
  | StructNode
  | FieldNode
  | FunctionNode
  | ParamNode
  | BlockNode
  | VarDeclNode
  | AssignNode
  | IfNode
  | ForNode
  | WhileNode
  | ReturnNode
  | DiscardNode
  | ExprStmtNode
  | BinaryExprNode
  | UnaryExprNode
  | TernaryExprNode
  | CallExprNode
  | MemberExprNode
  | IndexExprNode
  | IdentNode
  | LiteralNode
  | CastExprNode
  | NumthreadsAttrNode;

export interface ProgramNode { kind: 'program'; body: ASTNode[]; }
export interface CBufferNode { kind: 'cbuffer'; name: string; reg?: string; fields: FieldNode[]; }
export interface TextureNode { kind: 'texture'; texType: string; name: string; reg?: string; elementType?: string; }
export interface SamplerNode { kind: 'sampler'; name: string; reg?: string; }
export interface StructNode { kind: 'struct'; name: string; fields: FieldNode[]; }
export interface FieldNode { kind: 'field'; typeStr: string; name: string; semantic?: string; arraySize?: string; }
export interface FunctionNode {
  kind: 'function';
  returnType: string;
  name: string;
  params: ParamNode[];
  body: BlockNode;
  semantic?: string;
  numthreads?: [number, number, number];
}
export interface ParamNode { kind: 'param'; typeStr: string; name: string; semantic?: string; qualifier?: string; }
export interface BlockNode { kind: 'block'; stmts: ASTNode[]; }
export interface VarDeclNode { kind: 'varDecl'; typeStr: string; name: string; init?: ASTNode; qualifier?: string; arraySize?: string; }
export interface AssignNode { kind: 'assign'; op: string; left: ASTNode; right: ASTNode; }
export interface IfNode { kind: 'if'; cond: ASTNode; then: ASTNode; else?: ASTNode; }
export interface ForNode { kind: 'for'; init?: ASTNode; cond?: ASTNode; update?: ASTNode; body: ASTNode; }
export interface WhileNode { kind: 'while'; cond: ASTNode; body: ASTNode; }
export interface ReturnNode { kind: 'return'; value?: ASTNode; }
export interface DiscardNode { kind: 'discard'; }
export interface ExprStmtNode { kind: 'exprStmt'; expr: ASTNode; }
export interface BinaryExprNode { kind: 'binary'; op: string; left: ASTNode; right: ASTNode; }
export interface UnaryExprNode { kind: 'unary'; op: string; operand: ASTNode; prefix: boolean; }
export interface TernaryExprNode { kind: 'ternary'; cond: ASTNode; then: ASTNode; else: ASTNode; }
export interface CallExprNode { kind: 'call'; callee: ASTNode; args: ASTNode[]; }
export interface MemberExprNode { kind: 'member'; object: ASTNode; property: string; }
export interface IndexExprNode { kind: 'index'; object: ASTNode; index: ASTNode; }
export interface IdentNode { kind: 'ident'; name: string; }
export interface LiteralNode { kind: 'literal'; value: string; }
export interface CastExprNode { kind: 'cast'; targetType: string; expr: ASTNode; }
export interface NumthreadsAttrNode { kind: 'numthreads'; x: number; y: number; z: number; }

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    // filter out whitespace for parsing
    this.tokens = tokens.filter(t => t.type !== 'whitespace');
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error('Unexpected end of token stream');
    this.pos++;
    return t;
  }

  private expect(value: string): Token {
    const t = this.consume();
    if (t.value !== value) throw new Error(`Expected '${value}' but got '${t.value}' at line ${t.line}`);
    return t;
  }

  private check(value: string, offset = 0): boolean {
    return this.peek(offset)?.value === value;
  }

  private tryConsume(value: string): boolean {
    if (this.check(value)) { this.consume(); return true; }
    return false;
  }

  private isTypeName(v: string): boolean {
    return [
      'void', 'float', 'float2', 'float3', 'float4',
      'float2x2', 'float3x3', 'float4x4', 'matrix',
      'int', 'int2', 'int3', 'int4',
      'uint', 'uint2', 'uint3', 'uint4',
      'bool', 'half', 'double',
      'Texture2D', 'Texture3D', 'TextureCube', 'Texture2DArray', 'TextureCubeArray',
      'SamplerState', 'SamplerComparisonState',
      'RWTexture2D', 'RWBuffer', 'RWStructuredBuffer', 'StructuredBuffer',
    ].includes(v) || /^[A-Z][a-zA-Z0-9_]*/.test(v);
  }

  // Parse a type string including templates like Texture2D<float4>
  private parseTypeStr(): string {
    let t = this.consume().value;
    if (this.check('<')) {
      this.consume();
      let inner = '';
      let depth = 1;
      while (this.pos < this.tokens.length && depth > 0) {
        const tok = this.consume();
        if (tok.value === '<') depth++;
        else if (tok.value === '>') { depth--; if (depth === 0) break; }
        inner += tok.value;
      }
      t += `<${inner}>`;
    }
    return t;
  }

  private parseSemantic(): string | undefined {
    if (this.check(':')) {
      this.consume();
      const s = this.consume().value;
      return s;
    }
    return undefined;
  }

  private parseRegister(): string | undefined {
    // : register(t0) etc
    if (this.check(':') && this.peek(1)?.value === 'register') {
      this.consume(); this.consume(); this.expect('(');
      const reg = this.consume().value;
      this.expect(')');
      return reg;
    }
    return undefined;
  }

  parse(): ProgramNode {
    const body: ASTNode[] = [];
    while (this.pos < this.tokens.length) {
      const node = this.parseTopLevel();
      if (node) body.push(node);
    }
    return { kind: 'program', body };
  }

  private parseTopLevel(): ASTNode | null {
    const t = this.peek();
    if (!t) return null;

    // Attributes like [numthreads(x,y,z)]
    let numthreads: [number, number, number] | undefined;
    if (t.value === '[') {
      numthreads = this.parseNumthreadsAttr();
    }

    const cur = this.peek();
    if (!cur) return null;

    if (cur.value === 'cbuffer' || cur.value === 'tbuffer') {
      return this.parseCBuffer();
    }
    if (cur.value === 'struct') {
      return this.parseStruct();
    }
    if (cur.value === 'Texture2D' || cur.value === 'Texture3D' || cur.value === 'TextureCube' ||
        cur.value === 'Texture2DArray' || cur.value === 'TextureCubeArray' ||
        cur.value === 'RWTexture2D') {
      return this.parseTextureDecl();
    }
    if (cur.value === 'SamplerState' || cur.value === 'SamplerComparisonState') {
      return this.parseSamplerDecl();
    }

    // Function definition or global variable
    return this.parseFunctionOrVar(numthreads);
  }

  private parseNumthreadsAttr(): [number, number, number] | undefined {
    if (!this.check('[')) return undefined;
    this.consume(); // [
    const attrName = this.peek()?.value;
    if (attrName !== 'numthreads') {
      // skip unknown attribute
      let depth = 1;
      while (this.pos < this.tokens.length && depth > 0) {
        const v = this.consume().value;
        if (v === '[') depth++;
        if (v === ']') depth--;
      }
      return undefined;
    }
    this.consume(); // numthreads
    this.expect('(');
    const x = parseInt(this.consume().value, 10);
    this.expect(',');
    const y = parseInt(this.consume().value, 10);
    this.expect(',');
    const z = parseInt(this.consume().value, 10);
    this.expect(')');
    this.expect(']');
    return [x, y, z];
  }

  private parseCBuffer(): CBufferNode {
    this.consume(); // cbuffer / tbuffer
    const name = this.consume().value;
    let reg: string | undefined;
    if (this.check(':')) {
      this.consume();
      if (this.check('register')) {
        this.consume(); this.expect('(');
        reg = this.consume().value;
        this.expect(')');
      }
    }
    this.expect('{');
    const fields: FieldNode[] = [];
    while (!this.check('}')) {
      fields.push(this.parseField());
    }
    this.expect('}');
    this.tryConsume(';');
    return { kind: 'cbuffer', name, reg, fields };
  }

  private parseStruct(): StructNode {
    this.expect('struct');
    const name = this.consume().value;
    this.expect('{');
    const fields: FieldNode[] = [];
    while (!this.check('}')) {
      fields.push(this.parseField());
    }
    this.expect('}');
    this.tryConsume(';');
    return { kind: 'struct', name, fields };
  }

  private parseField(): FieldNode {
    // optional qualifiers
    let qualifier = '';
    while (this.peek()?.value === 'row_major' || this.peek()?.value === 'column_major' ||
           this.peek()?.value === 'nointerpolation' || this.peek()?.value === 'linear' ||
           this.peek()?.value === 'centroid' || this.peek()?.value === 'noperspective') {
      qualifier += this.consume().value + ' ';
    }
    const typeStr = this.parseTypeStr();
    const name = this.consume().value;
    let arraySize: string | undefined;
    if (this.check('[')) {
      this.consume();
      arraySize = this.consume().value;
      this.expect(']');
    }
    const semantic = this.parseSemantic();
    // optional packoffset
    if (this.check(':') && this.peek(1)?.value === 'packoffset') {
      this.consume(); this.consume();
      this.expect('('); this.consume(); this.expect(')');
    }
    this.expect(';');
    return { kind: 'field', typeStr, name, semantic, arraySize };
  }

  private parseTextureDecl(): TextureNode {
    const texType = this.parseTypeStr();
    const name = this.consume().value;
    const reg = this.parseRegister();
    if (!reg) {
      // might be : register(...)
      if (this.check(':')) {
        this.consume();
        if (this.peek()?.value === 'register') {
          this.consume(); this.expect('(');
          const r = this.consume().value; this.expect(')');
          this.tryConsume(';');
          return { kind: 'texture', texType, name, reg: r };
        }
      }
    }
    this.tryConsume(';');
    // extract element type from template
    const m = texType.match(/<([^>]+)>/);
    return { kind: 'texture', texType, name, reg, elementType: m ? m[1] : 'float4' };
  }

  private parseSamplerDecl(): SamplerNode {
    this.consume(); // SamplerState
    const name = this.consume().value;
    const reg = this.parseRegister();
    if (!reg) {
      if (this.check(':')) {
        this.consume();
        if (this.peek()?.value === 'register') {
          this.consume(); this.expect('(');
          const r = this.consume().value; this.expect(')');
          this.tryConsume(';');
          return { kind: 'sampler', name, reg: r };
        }
      }
    }
    this.tryConsume(';');
    return { kind: 'sampler', name, reg };
  }

  private parseFunctionOrVar(numthreads?: [number, number, number]): ASTNode | null {
    // Skip qualifiers
    while (['static', 'inline', 'extern', 'const', 'volatile'].includes(this.peek()?.value ?? '')) {
      this.consume();
    }

    if (this.pos >= this.tokens.length) return null;
    const returnType = this.parseTypeStr();

    if (this.pos >= this.tokens.length) return null;
    const name = this.consume().value;

    if (this.check('(')) {
      // function definition
      this.expect('(');
      const params: ParamNode[] = [];
      while (!this.check(')')) {
        params.push(this.parseParam());
        if (!this.check(')')) this.tryConsume(',');
      }
      this.expect(')');
      const semantic = this.parseSemantic();
      // optional register / attributes before body
      let body: BlockNode;
      if (this.check('{')) {
        body = this.parseBlock();
      } else {
        this.tryConsume(';');
        body = { kind: 'block', stmts: [] };
      }
      return { kind: 'function', returnType, name, params, body, semantic, numthreads };
    } else {
      // global variable declaration
      let arraySize: string | undefined;
      if (this.check('[')) {
        this.consume();
        arraySize = this.consume().value;
        this.expect(']');
      }
      let init: ASTNode | undefined;
      if (this.tryConsume('=')) {
        init = this.parseExpr();
      }
      this.tryConsume(';');
      return { kind: 'varDecl', typeStr: returnType, name, init, arraySize };
    }
  }

  private parseParam(): ParamNode {
    let qualifier = '';
    while (['in', 'out', 'inout', 'uniform', 'const', 'nointerpolation', 'linear', 'centroid', 'noperspective'].includes(this.peek()?.value ?? '')) {
      qualifier += this.consume().value + ' ';
    }
    const typeStr = this.parseTypeStr();
    // params can be unnamed (rare)
    let name = '_unnamed';
    if (this.peek()?.type === 'identifier' && !this.check(':') && !this.check(')') && !this.check(',')) {
      name = this.consume().value;
    } else if (this.peek()?.value !== ':' && this.peek()?.value !== ')' && this.peek()?.value !== ',') {
      name = this.consume().value;
    }
    const semantic = this.parseSemantic();
    return { kind: 'param', typeStr, name, semantic, qualifier: qualifier.trim() };
  }

  private parseBlock(): BlockNode {
    this.expect('{');
    const stmts: ASTNode[] = [];
    while (!this.check('}')) {
      const s = this.parseStatement();
      if (s) stmts.push(s);
    }
    this.expect('}');
    return { kind: 'block', stmts };
  }

  private parseStatement(): ASTNode | null {
    const t = this.peek();
    if (!t) return null;

    if (t.value === '{') return this.parseBlock();
    if (t.value === 'return') {
      this.consume();
      let value: ASTNode | undefined;
      if (!this.check(';')) value = this.parseExpr();
      this.tryConsume(';');
      return { kind: 'return', value };
    }
    if (t.value === 'discard') {
      this.consume(); this.tryConsume(';');
      return { kind: 'discard' };
    }
    if (t.value === 'if') return this.parseIf();
    if (t.value === 'for') return this.parseFor();
    if (t.value === 'while') return this.parseWhile();
    if (t.value === 'break') { this.consume(); this.tryConsume(';'); return { kind: 'exprStmt', expr: { kind: 'ident', name: 'break' } }; }
    if (t.value === 'continue') { this.consume(); this.tryConsume(';'); return { kind: 'exprStmt', expr: { kind: 'ident', name: 'continue' } }; }
    if (t.value === ';') { this.consume(); return null; }

    // Variable declarations: type name = ...
    if (this.isVarDecl()) {
      return this.parseVarDecl();
    }

    const expr = this.parseExpr();
    this.tryConsume(';');
    return { kind: 'exprStmt', expr };
  }

  private isVarDecl(): boolean {
    const t = this.peek();
    if (!t) return false;
    const typeKeywords = [
      'float', 'float2', 'float3', 'float4', 'float2x2', 'float3x3', 'float4x4', 'matrix',
      'int', 'int2', 'int3', 'int4', 'uint', 'uint2', 'uint3', 'uint4',
      'bool', 'half', 'double', 'void',
      'const', 'static',
    ];
    if (typeKeywords.includes(t.value)) return true;
    // user struct type: Identifier followed by another Identifier
    if (t.type === 'identifier' || t.type === 'keyword') {
      const next = this.peek(1);
      if (next && (next.type === 'identifier') && next.value !== '(') {
        // Could be a struct type name followed by variable name
        return /^[A-Z]/.test(t.value) || typeKeywords.includes(t.value);
      }
    }
    return false;
  }

  private parseVarDecl(): VarDeclNode {
    let qualifier = '';
    while (['const', 'static', 'volatile', 'groupshared'].includes(this.peek()?.value ?? '')) {
      qualifier += this.consume().value + ' ';
    }
    const typeStr = this.parseTypeStr();
    const name = this.consume().value;
    let arraySize: string | undefined;
    if (this.check('[')) {
      this.consume(); arraySize = this.consume().value; this.expect(']');
    }
    let init: ASTNode | undefined;
    if (this.tryConsume('=')) {
      init = this.parseExprNoComma();
    }
    this.tryConsume(';');
    return { kind: 'varDecl', typeStr, name, init, qualifier: qualifier.trim(), arraySize };
  }

  private parseIf(): IfNode {
    this.expect('if'); this.expect('(');
    const cond = this.parseExpr();
    this.expect(')');
    const then = this.parseStatement()!;
    let elseNode: ASTNode | undefined;
    if (this.check('else')) {
      this.consume();
      elseNode = this.parseStatement() ?? undefined;
    }
    return { kind: 'if', cond, then, else: elseNode };
  }

  private parseFor(): ForNode {
    this.expect('for'); this.expect('(');
    let init: ASTNode | undefined;
    if (!this.check(';')) {
      if (this.isVarDecl()) init = this.parseVarDecl();
      else { init = this.parseExpr(); this.tryConsume(';'); }
    } else { this.consume(); }
    let cond: ASTNode | undefined;
    if (!this.check(';')) cond = this.parseExpr();
    this.tryConsume(';');
    let update: ASTNode | undefined;
    if (!this.check(')')) update = this.parseExpr();
    this.expect(')');
    const body = this.parseStatement()!;
    return { kind: 'for', init, cond, update, body };
  }

  private parseWhile(): WhileNode {
    this.expect('while'); this.expect('(');
    const cond = this.parseExpr();
    this.expect(')');
    const body = this.parseStatement()!;
    return { kind: 'while', cond, body };
  }

  // Full expression with comma operator
  private parseExpr(): ASTNode {
    return this.parseAssignment();
  }

  private parseExprNoComma(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    const left = this.parseTernary();
    const op = this.peek()?.value;
    if (op && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].includes(op)) {
      this.consume();
      const right = this.parseAssignment();
      return { kind: 'assign', op, left, right };
    }
    return left;
  }

  private parseTernary(): ASTNode {
    const cond = this.parseOr();
    if (this.check('?')) {
      this.consume();
      const then = this.parseExpr();
      this.expect(':');
      const els = this.parseTernary();
      return { kind: 'ternary', cond, then, else: els };
    }
    return cond;
  }

  private parseOr(): ASTNode { return this.parseBinary(['||'], () => this.parseAnd()); }
  private parseAnd(): ASTNode { return this.parseBinary(['&&'], () => this.parseBitOr()); }
  private parseBitOr(): ASTNode { return this.parseBinary(['|'], () => this.parseBitXor()); }
  private parseBitXor(): ASTNode { return this.parseBinary(['^'], () => this.parseBitAnd()); }
  private parseBitAnd(): ASTNode { return this.parseBinary(['&'], () => this.parseEquality()); }
  private parseEquality(): ASTNode { return this.parseBinary(['==', '!='], () => this.parseRelational()); }
  private parseRelational(): ASTNode { return this.parseBinary(['<', '>', '<=', '>='], () => this.parseShift()); }
  private parseShift(): ASTNode { return this.parseBinary(['<<', '>>'], () => this.parseAdditive()); }
  private parseAdditive(): ASTNode { return this.parseBinary(['+', '-'], () => this.parseMultiplicative()); }
  private parseMultiplicative(): ASTNode { return this.parseBinary(['*', '/', '%'], () => this.parseUnary()); }

  private parseBinary(ops: string[], next: () => ASTNode): ASTNode {
    let left = next();
    while (ops.includes(this.peek()?.value ?? '')) {
      const op = this.consume().value;
      const right = next();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    const t = this.peek();
    if (t && ['!', '-', '+', '~', '++', '--'].includes(t.value)) {
      this.consume();
      const operand = this.parseUnary();
      return { kind: 'unary', op: t.value, operand, prefix: true };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();
    while (true) {
      if (this.check('.')) {
        this.consume();
        const prop = this.consume().value;
        expr = { kind: 'member', object: expr, property: prop };
      } else if (this.check('[')) {
        this.consume();
        const idx = this.parseExpr();
        this.expect(']');
        expr = { kind: 'index', object: expr, index: idx };
      } else if (this.check('(')) {
        this.consume();
        const args: ASTNode[] = [];
        while (!this.check(')')) {
          args.push(this.parseExprNoComma());
          if (!this.check(')')) this.tryConsume(',');
        }
        this.expect(')');
        expr = { kind: 'call', callee: expr, args };
      } else if (this.check('++') || this.check('--')) {
        const op = this.consume().value;
        expr = { kind: 'unary', op, operand: expr, prefix: false };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): ASTNode {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'number') { this.consume(); return { kind: 'literal', value: t.value }; }
    if (t.value === 'true' || t.value === 'false') { this.consume(); return { kind: 'literal', value: t.value }; }

    if (t.value === '(') {
      this.consume();
      // Check for cast: (type)expr
      const maybeType = this.peek();
      if (maybeType && this.isTypeName(maybeType.value)) {
        // look ahead: if next is ), it's a cast
        let savedPos = this.pos;
        try {
          const typeStr = this.parseTypeStr();
          if (this.check(')')) {
            this.consume();
            const expr = this.parseUnary();
            return { kind: 'cast', targetType: typeStr, expr };
          }
          // restore
          this.pos = savedPos;
        } catch { this.pos = savedPos; }
      }
      const inner = this.parseExpr();
      this.expect(')');
      return inner;
    }

    // Constructor calls like float4(...)
    if (this.isTypeName(t.value) && this.peek(1)?.value === '(') {
      const typeStr = this.parseTypeStr();
      this.consume(); // (
      const args: ASTNode[] = [];
      while (!this.check(')')) {
        args.push(this.parseExprNoComma());
        if (!this.check(')')) this.tryConsume(',');
      }
      this.expect(')');
      return { kind: 'call', callee: { kind: 'ident', name: typeStr }, args };
    }

    if (t.type === 'identifier' || t.type === 'keyword') {
      this.consume();
      return { kind: 'ident', name: t.value };
    }

    // String literal
    if (t.type === 'string') { this.consume(); return { kind: 'literal', value: t.value }; }

    throw new Error(`Unexpected token '${t.value}' at line ${t.line}`);
  }
}

// ---------------------------------------------------------------------------
// PHASE 3: SEMANTIC MAPPING
// ---------------------------------------------------------------------------

export function mapSemantic(semantic: string): string {
  const s = semantic.toUpperCase();
  if (s === 'SV_POSITION') return '@builtin(position)';
  if (s === 'SV_VERTEXID') return '@builtin(vertex_index)';
  if (s === 'SV_INSTANCEID') return '@builtin(instance_index)';
  if (s === 'SV_TARGET' || s === 'SV_TARGET0') return '@location(0)';
  if (s === 'SV_TARGET1') return '@location(1)';
  if (s === 'SV_TARGET2') return '@location(2)';
  if (s === 'SV_TARGET3') return '@location(3)';
  if (s === 'SV_DEPTH') return '@builtin(frag_depth)';
  if (s === 'SV_DISPATCHTHREADID') return '@builtin(global_invocation_id)';
  if (s === 'SV_GROUPTHREADID') return '@builtin(local_invocation_id)';
  if (s === 'SV_GROUPID') return '@builtin(workgroup_id)';
  if (s === 'SV_GROUPINDEX') return '@builtin(local_invocation_index)';
  if (s.startsWith('TEXCOORD')) {
    const n = parseInt(s.slice(8), 10) || 0;
    return `@location(${n})`;
  }
  if (s.startsWith('COLOR')) {
    const n = parseInt(s.slice(5), 10) || 0;
    return `@location(${n})`;
  }
  if (s === 'NORMAL') return '@location(2)';
  if (s === 'TANGENT') return '@location(3)';
  if (s === 'BINORMAL' || s === 'BITANGENT') return '@location(4)';
  if (s.startsWith('POSITION')) {
    const n = parseInt(s.slice(8), 10) || 0;
    return `@location(${n})`;
  }
  // Default: use location 0
  return '@location(0)';
}

function isBuiltinSemantic(semantic: string): boolean {
  const s = semantic.toUpperCase();
  return s.startsWith('SV_');
}

// ---------------------------------------------------------------------------
// PHASE 4: CODE GENERATION
// ---------------------------------------------------------------------------

export function mapType(hlslType: string): string {
  const t = hlslType.trim();
  const map: Record<string, string> = {
    'void': 'void',
    'float': 'f32', 'float2': 'vec2f', 'float3': 'vec3f', 'float4': 'vec4f',
    'float2x2': 'mat2x2f', 'float3x3': 'mat3x3f', 'float4x4': 'mat4x4f',
    'matrix': 'mat4x4f',
    'int': 'i32', 'int2': 'vec2i', 'int3': 'vec3i', 'int4': 'vec4i',
    'uint': 'u32', 'uint2': 'vec2u', 'uint3': 'vec3u', 'uint4': 'vec4u',
    'bool': 'bool', 'half': 'f32', 'double': 'f32',
    'Texture2D': 'texture_2d<f32>',
    'Texture3D': 'texture_3d<f32>',
    'TextureCube': 'texture_cube<f32>',
    'Texture2DArray': 'texture_2d_array<f32>',
    'TextureCubeArray': 'texture_cube_array<f32>',
    'SamplerState': 'sampler',
    'SamplerComparisonState': 'sampler_comparison',
  };
  if (map[t]) return map[t];

  // Texture2D<float4> etc
  const texMatch = t.match(/^(Texture2D|Texture3D|TextureCube|Texture2DArray|RWTexture2D)<(.+)>$/);
  if (texMatch) {
    const [, base, inner] = texMatch;
    const innerWGSL = mapType(inner.trim());
    const wgslInner = innerWGSL.startsWith('vec') ? innerWGSL.replace(/vec\d+([fiuFIU])/, (_m, s) => `f32`) : innerWGSL;
    const baseMap: Record<string, string> = {
      'Texture2D': 'texture_2d', 'Texture3D': 'texture_3d',
      'TextureCube': 'texture_cube', 'Texture2DArray': 'texture_2d_array',
      'RWTexture2D': 'texture_storage_2d',
    };
    if (base === 'RWTexture2D') return `texture_storage_2d<${wgslInner}, read_write>`;
    return `${baseMap[base] ?? 'texture_2d'}<f32>`;
  }

  // User-defined struct — pass through as-is (lower-cased first char for WGSL convention, but keep original)
  return t;
}

function mapNumber(v: string): string {
  // HLSL float literals: 1.0f, 1.f, .5f → remove f suffix
  return v.replace(/(\d)f$/i, '$1').replace(/(\d)u$/i, '$1').replace(/(\d+)l$/i, '$1');
}

interface GeneratorContext {
  bindingCounter: number;
  groupCounter: number;
  textureNames: Set<string>;
  samplerNames: Set<string>;
  structNames: Set<string>;
  inputStructName?: string;
  outputStructName?: string;
}

class WGSLCodeGen {
  private ctx: GeneratorContext = {
    bindingCounter: 0,
    groupCounter: 0,
    textureNames: new Set(),
    samplerNames: new Set(),
    structNames: new Set(),
  };
  private output: string[] = [];
  private indent = 0;

  private emit(s: string) { this.output.push('  '.repeat(this.indent) + s); }
  private emitRaw(s: string) { this.output.push(s); }
  private emitBlank() { this.output.push(''); }

  generate(program: ProgramNode, _profile: string): string {
    // Pre-pass: collect struct names, texture/sampler names
    for (const node of program.body) {
      if (node.kind === 'struct') this.ctx.structNames.add(node.name);
      if (node.kind === 'texture') this.ctx.textureNames.add(node.name);
      if (node.kind === 'sampler') this.ctx.samplerNames.add(node.name);
    }

    let bindingIdx = 0;
    let uniformGroupIdx = 0;
    let textureGroupIdx = 1;

    for (const node of program.body) {
      switch (node.kind) {
        case 'cbuffer': this.genCBuffer(node, uniformGroupIdx++, bindingIdx++); break;
        case 'texture': this.genTexture(node, textureGroupIdx, bindingIdx++); break;
        case 'sampler': this.genSampler(node, textureGroupIdx, bindingIdx++); break;
        case 'struct': this.genStruct(node); break;
        case 'function': this.genFunction(node); break;
        case 'varDecl': this.genGlobalVar(node); break;
      }
    }

    return this.output.join('\n');
  }

  private genCBuffer(node: CBufferNode, group: number, binding: number) {
    const structName = node.name;
    this.emit(`struct ${structName} {`);
    this.indent++;
    for (const f of node.fields) {
      const wgslType = mapType(f.typeStr);
      const arraySuffix = f.arraySize ? ` /* [${f.arraySize}] */` : '';
      this.emit(`${f.name}: ${wgslType},${arraySuffix}`);
    }
    this.indent--;
    this.emit('}');
    const varName = structName.charAt(0).toLowerCase() + structName.slice(1);
    this.emit(`@group(${group}) @binding(${binding}) var<uniform> ${varName}: ${structName};`);
    this.emitBlank();
  }

  private genTexture(node: TextureNode, group: number, binding: number) {
    const wgslType = mapType(node.texType);
    this.emit(`@group(${group}) @binding(${binding}) var ${node.name}: ${wgslType};`);
  }

  private genSampler(node: SamplerNode, group: number, binding: number) {
    this.emit(`@group(${group}) @binding(${binding}) var ${node.name}: sampler;`);
  }

  private genStruct(node: StructNode) {
    this.emit(`struct ${node.name} {`);
    this.indent++;
    for (const f of node.fields) {
      const wgslType = mapType(f.typeStr);
      const semanticAttr = f.semantic ? `${mapSemantic(f.semantic)} ` : '';
      this.emit(`${semanticAttr}${f.name}: ${wgslType},`);
    }
    this.indent--;
    this.emit('}');
    this.emitBlank();
  }

  private genGlobalVar(node: VarDeclNode) {
    const wgslType = mapType(node.typeStr);
    const qualifier = node.qualifier?.includes('const') ? 'const' : 'var<private>';
    if (node.init) {
      this.emit(`${qualifier} ${node.name}: ${wgslType} = ${this.genExpr(node.init)};`);
    } else {
      this.emit(`${qualifier} ${node.name}: ${wgslType};`);
    }
    this.emitBlank();
  }

  private genFunction(node: FunctionNode) {
    const isVertex = node.params.some(p => p.semantic && p.semantic.toUpperCase() === 'SV_POSITION') ||
      (node.returnType !== 'void' && node.semantic && node.semantic.toUpperCase() === 'SV_POSITION') ||
      node.params.some(p => this.ctx.structNames.has(p.typeStr) && p.name.toLowerCase().includes('vert')) ||
      (node.returnType !== 'void' && this.ctx.structNames.has(node.returnType) && node.name.toLowerCase().includes('vert'));
    const isFragment = node.params.some(p => p.semantic && p.semantic.toUpperCase().startsWith('SV_TARGET')) ||
      (node.semantic && node.semantic.toUpperCase().startsWith('SV_TARGET')) ||
      node.name.toLowerCase().includes('ps_') || node.name.toLowerCase().includes('frag');
    const isCompute = !!node.numthreads;

    let stageAttr = '';
    if (isCompute && node.numthreads) {
      const [x, y, z] = node.numthreads;
      stageAttr = `@compute @workgroup_size(${x}, ${y}, ${z})\n`;
    } else if (isVertex) {
      stageAttr = '@vertex\n';
    } else if (isFragment) {
      stageAttr = '@fragment\n';
    }

    const params = node.params.map(p => this.genParam(p)).join(', ');
    const retType = mapType(node.returnType);
    const retSemanticAttr = node.semantic ? `${mapSemantic(node.semantic)} ` : '';
    const retStr = retType === 'void' ? '' : ` -> ${retSemanticAttr}${retType}`;

    this.emit(`${stageAttr}fn ${node.name}(${params})${retStr} {`);
    this.indent++;
    this.genBlock(node.body);
    this.indent--;
    this.emit('}');
    this.emitBlank();
  }

  private genParam(p: ParamNode): string {
    const wgslType = mapType(p.typeStr);
    const semanticAttr = p.semantic ? `${mapSemantic(p.semantic)} ` : '';
    return `${semanticAttr}${p.name}: ${wgslType}`;
  }

  private genBlock(block: BlockNode) {
    for (const stmt of block.stmts) {
      this.genStatement(stmt);
    }
  }

  private genStatement(node: ASTNode) {
    switch (node.kind) {
      case 'block':
        this.emit('{');
        this.indent++;
        this.genBlock(node);
        this.indent--;
        this.emit('}');
        break;
      case 'varDecl': {
        const wgslType = mapType(node.typeStr);
        const qual = node.qualifier?.includes('const') ? 'let' : 'var';
        const initStr = node.init ? ` = ${this.genExpr(node.init)}` : '';
        this.emit(`${qual} ${node.name}: ${wgslType}${initStr};`);
        break;
      }
      case 'assign':
        this.emit(`${this.genExpr(node.left)} ${node.op} ${this.genExpr(node.right)};`);
        break;
      case 'if': {
        const condStr = this.genExpr(node.cond);
        this.emit(`if (${condStr}) {`);
        this.indent++;
        if (node.then.kind === 'block') this.genBlock(node.then);
        else this.genStatement(node.then);
        this.indent--;
        if (node.else) {
          this.emit('} else {');
          this.indent++;
          if (node.else.kind === 'block') this.genBlock(node.else);
          else this.genStatement(node.else);
          this.indent--;
        }
        this.emit('}');
        break;
      }
      case 'for': {
        const initStr = node.init ? this.genForInit(node.init) : '';
        const condStr = node.cond ? this.genExpr(node.cond) : '';
        const updStr = node.update ? this.genExprNoSemi(node.update) : '';
        this.emit(`for (${initStr}; ${condStr}; ${updStr}) {`);
        this.indent++;
        if (node.body.kind === 'block') this.genBlock(node.body);
        else this.genStatement(node.body);
        this.indent--;
        this.emit('}');
        break;
      }
      case 'while': {
        this.emit(`loop {`);
        this.indent++;
        this.emit(`if (!(${this.genExpr(node.cond)})) { break; }`);
        if (node.body.kind === 'block') this.genBlock(node.body);
        else this.genStatement(node.body);
        this.indent--;
        this.emit('}');
        break;
      }
      case 'return':
        if (node.value) this.emit(`return ${this.genExpr(node.value)};`);
        else this.emit('return;');
        break;
      case 'discard':
        this.emit('discard;');
        break;
      case 'exprStmt': {
        const e = node.expr;
        if (e.kind === 'ident' && (e.name === 'break' || e.name === 'continue')) {
          this.emit(`${e.name};`);
        } else {
          this.emit(`${this.genExpr(e)};`);
        }
        break;
      }
    }
  }

  private genForInit(node: ASTNode): string {
    if (node.kind === 'varDecl') {
      const wgslType = mapType(node.typeStr);
      const initStr = node.init ? ` = ${this.genExpr(node.init)}` : '';
      return `var ${node.name}: ${wgslType}${initStr}`;
    }
    return this.genExprNoSemi(node);
  }

  private genExprNoSemi(node: ASTNode): string {
    if (node.kind === 'assign') return `${this.genExpr(node.left)} ${node.op} ${this.genExpr(node.right)}`;
    return this.genExpr(node);
  }

  private genExpr(node: ASTNode): string {
    switch (node.kind) {
      case 'literal': return mapNumber(node.value);
      case 'ident': return node.name;
      case 'binary': return `(${this.genExpr(node.left)} ${node.op} ${this.genExpr(node.right)})`;
      case 'unary':
        if (node.prefix) return `${node.op}${this.genExpr(node.operand)}`;
        return `${this.genExpr(node.operand)}${node.op}`;
      case 'ternary':
        return `select(${this.genExpr(node.else)}, ${this.genExpr(node.then)}, ${this.genExpr(node.cond)})`;
      case 'assign':
        return `${this.genExpr(node.left)} ${node.op} ${this.genExpr(node.right)}`;
      case 'member': {
        const obj = this.genExpr(node.object);
        // tex.Sample → textureSample call (handled in call)
        return `${obj}.${node.property}`;
      }
      case 'index':
        return `${this.genExpr(node.object)}[${this.genExpr(node.index)}]`;
      case 'cast':
        return `${mapType(node.targetType)}(${this.genExpr(node.expr)})`;
      case 'call':
        return this.genCall(node);
      default:
        return '/* unsupported */';
    }
  }

  private genCall(node: CallExprNode): string {
    const args = node.args.map(a => this.genExpr(a));

    // Handle method calls: tex.Sample(s, uv), tex.SampleLevel(s, uv, lod)
    if (node.callee.kind === 'member') {
      const obj = this.genExpr(node.callee.object);
      const method = node.callee.property;
      if (method === 'Sample') return `textureSample(${obj}, ${args.join(', ')})`;
      if (method === 'SampleLevel') return `textureSampleLevel(${obj}, ${args.join(', ')})`;
      if (method === 'SampleBias') return `textureSampleBias(${obj}, ${args.join(', ')})`;
      if (method === 'SampleGrad') return `textureSampleGrad(${obj}, ${args.join(', ')})`;
      if (method === 'Load') return `textureLoad(${obj}, ${args.join(', ')})`;
      if (method === 'GetDimensions') return `textureDimensions(${obj})`;
      // fallback
      return `${obj}.${method}(${args.join(', ')})`;
    }

    const callee = node.callee.kind === 'ident' ? node.callee.name : this.genExpr(node.callee);

    // HLSL intrinsics → WGSL
    switch (callee) {
      case 'lerp': return `mix(${args.join(', ')})`;
      case 'saturate': return `clamp(${args[0]}, 0.0, 1.0)`;
      case 'frac': return `fract(${args[0]})`;
      case 'ddx': return `dpdx(${args[0]})`;
      case 'ddy': return `dpdy(${args[0]})`;
      case 'ddx_fine': return `dpdxFine(${args[0]})`;
      case 'ddy_fine': return `dpdyFine(${args[0]})`;
      case 'mul':
        if (args.length === 2) return `(${args[0]} * ${args[1]})`;
        return `(${args.join(' * ')})`;
      case 'GroupMemoryBarrierWithGroupSync': return 'workgroupBarrier()';
      case 'AllMemoryBarrierWithGroupSync': return 'storageBarrier()';
      case 'DeviceMemoryBarrierWithGroupSync': return 'storageBarrier()';
      case 'GroupMemoryBarrier': return 'workgroupBarrier()';
      case 'clip':
        // Generates inline if; caller must handle as statement
        return `/* clip */ (${args[0]} < 0.0 ? discard : ${args[0]})`;
      case 'asfloat': return `bitcast<f32>(${args[0]})`;
      case 'asint': return `bitcast<i32>(${args[0]})`;
      case 'asuint': return `bitcast<u32>(${args[0]})`;
      case 'rsqrt': return `inverseSqrt(${args[0]})`;
      case 'mad': return `fma(${args.join(', ')})`;
      case 'sign': return `sign(${args[0]})`;
      case 'pow': return `pow(${args.join(', ')})`;
      case 'log': return `log(${args[0]})`;
      case 'log2': return `log2(${args[0]})`;
      case 'log10': return `(log(${args[0]}) / log(10.0))`;
      case 'exp': return `exp(${args[0]})`;
      case 'exp2': return `exp2(${args[0]})`;
      case 'length': return `length(${args[0]})`;
      case 'normalize': return `normalize(${args[0]})`;
      case 'dot': return `dot(${args.join(', ')})`;
      case 'cross': return `cross(${args.join(', ')})`;
      case 'reflect': return `reflect(${args.join(', ')})`;
      case 'refract': return `refract(${args.join(', ')})`;
      case 'min': return `min(${args.join(', ')})`;
      case 'max': return `max(${args.join(', ')})`;
      case 'abs': return `abs(${args[0]})`;
      case 'floor': return `floor(${args[0]})`;
      case 'ceil': return `ceil(${args[0]})`;
      case 'round': return `round(${args[0]})`;
      case 'sqrt': return `sqrt(${args[0]})`;
      case 'clamp': return `clamp(${args.join(', ')})`;
      case 'step': return `step(${args.join(', ')})`;
      case 'smoothstep': return `smoothstep(${args.join(', ')})`;
      case 'transpose': return `transpose(${args[0]})`;
      case 'determinant': return `determinant(${args[0]})`;
      case 'any': return `any(${args[0]})`;
      case 'all': return `all(${args[0]})`;
      case 'countbits': return `countOneBits(${args[0]})`;
      case 'firstbithigh': return `(31u - firstLeadingBit(${args[0]}))`;
      case 'firstbitlow': return `firstTrailingBit(${args[0]})`;
      case 'reversebits': return `reverseBits(${args[0]})`;
      case 'modf': return `modf(${args[0]})`;
      case 'frexp': return `frexp(${args[0]})`;
      case 'ldexp': return `ldexp(${args.join(', ')})`;
      case 'distance': return `distance(${args.join(', ')})`;
      case 'trunc': return `trunc(${args[0]})`;
      case 'isnan': return `(${args[0]} != ${args[0]})`;
      case 'isinf': return `(abs(${args[0]}) == 0x7f800000u)`;

      // Constructor type mappings
      default: {
        const mappedType = mapType(callee);
        if (mappedType !== callee) return `${mappedType}(${args.join(', ')})`;
        return `${callee}(${args.join(', ')})`;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class HLSLToWGSLTranspiler {
  translate(hlsl: string, profile: string): string {
    try {
      const tokens = tokenize(hlsl);
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const codegen = new WGSLCodeGen();
      return codegen.generate(ast, profile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `/* HLSL→WGSL transpilation error: ${msg} */\n`;
    }
  }
}

export function transpileHLSL(hlsl: string, profile: string): string {
  return new HLSLToWGSLTranspiler().translate(hlsl, profile);
}
