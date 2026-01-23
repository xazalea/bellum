/**
 * Mesa-Style WGSL Optimizer (lightweight)
 * Inspired by Mesa's shader optimization philosophy, but browser-safe and fast.
 *
 * NOTE: This intentionally uses conservative string-level transforms to avoid
 * breaking shader semantics. It can be upgraded to a real AST-based pass later.
 */

export type MesaOptimizeOptions = {
  enableDeadCodeElim?: boolean;
  enableConstantFolding?: boolean;
  enableTrivialAlgebra?: boolean;
  enableWhitespaceCleanup?: boolean;
};

const DEFAULT_OPTIONS: Required<MesaOptimizeOptions> = {
  enableDeadCodeElim: true,
  enableConstantFolding: true,
  enableTrivialAlgebra: true,
  enableWhitespaceCleanup: true,
};

export class MesaStyleOptimizer {
  optimizeWGSL(source: string, options: MesaOptimizeOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let wgsl = source.replace(/\r\n/g, '\n');

    if (opts.enableDeadCodeElim) {
      wgsl = this.removeDeadConstDeclarations(wgsl);
      wgsl = this.removeIfFalseBlocks(wgsl);
    }

    if (opts.enableConstantFolding) {
      wgsl = this.foldSimpleConstants(wgsl);
    }

    if (opts.enableTrivialAlgebra) {
      wgsl = this.simplifyTrivialAlgebra(wgsl);
    }

    if (opts.enableWhitespaceCleanup) {
      wgsl = this.cleanupWhitespace(wgsl);
    }

    return wgsl;
  }

  private removeDeadConstDeclarations(wgsl: string): string {
    const constDecls = Array.from(
      wgsl.matchAll(/^\s*const\s+(\w+)\s*=\s*[^;]+;\s*$/gm)
    ).map(match => match[1]);

    for (const name of constDecls) {
      const usageRegex = new RegExp(`\\b${name}\\b`, 'g');
      const matches = wgsl.match(usageRegex);
      if (matches && matches.length <= 1) {
        const declRegex = new RegExp(`^\\s*const\\s+${name}\\s*=\\s*[^;]+;\\s*$\\n?`, 'gm');
        wgsl = wgsl.replace(declRegex, '');
      }
    }

    return wgsl;
  }

  private removeIfFalseBlocks(wgsl: string): string {
    return wgsl.replace(/if\s*\(\s*(false|0)\s*\)\s*\{[^}]*\}/g, '');
  }

  private foldSimpleConstants(wgsl: string): string {
    return wgsl.replace(
      /(\b(?:let|const)\s+\w+\s*=\s*)(-?\d+(?:\.\d+)?)(\s*[\+\-\*\/]\s*)(-?\d+(?:\.\d+)?)(\s*;)/g,
      (_match, prefix, left, op, right, suffix) => {
        const a = parseFloat(left);
        const b = parseFloat(right);
        let value: number;
        switch (op.trim()) {
          case '+':
            value = a + b;
            break;
          case '-':
            value = a - b;
            break;
          case '*':
            value = a * b;
            break;
          case '/':
            value = b === 0 ? a : a / b;
            break;
          default:
            return `${prefix}${left}${op}${right}${suffix}`;
        }
        if (!Number.isFinite(value)) {
          return `${prefix}${left}${op}${right}${suffix}`;
        }
        return `${prefix}${this.formatNumber(value)}${suffix}`;
      }
    );
  }

  private simplifyTrivialAlgebra(wgsl: string): string {
    // x + 0, x - 0
    wgsl = wgsl.replace(/\b(\w+)\s*\+\s*0(\.0+)?\b/g, '$1');
    wgsl = wgsl.replace(/\b(\w+)\s*-\s*0(\.0+)?\b/g, '$1');
    // x * 1, 1 * x
    wgsl = wgsl.replace(/\b(\w+)\s*\*\s*1(\.0+)?\b/g, '$1');
    wgsl = wgsl.replace(/\b1(\.0+)?\s*\*\s*(\w+)\b/g, '$2');
    // x * 0, 0 * x (safe for numeric types)
    wgsl = wgsl.replace(/\b(\w+)\s*\*\s*0(\.0+)?\b/g, '0.0');
    wgsl = wgsl.replace(/\b0(\.0+)?\s*\*\s*(\w+)\b/g, '0.0');
    return wgsl;
  }

  private cleanupWhitespace(wgsl: string): string {
    wgsl = wgsl.replace(/\n{3,}/g, '\n\n');
    wgsl = wgsl.replace(/[ \t]+$/gm, '');
    return wgsl;
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return `${value}.0`;
    }
    return `${value}`;
  }
}
