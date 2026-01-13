/**
 * GLSL to WGSL Translator  
 * Real-time shader translation for OpenGL ES applications (Android)
 * 
 * Features:
 * - GLSL ES 2.0 and 3.0 support
 * - Vertex and fragment shader translation
 * - Attribute/varying/uniform mapping
 * - Built-in function translation
 * - Texture sampling translation
 * - Translation caching
 */

// ============================================================================
// Types
// ============================================================================

export type GLSLStage = 'vertex' | 'fragment';
export type GLSLVersion = '100' | '300 es';

export interface GLSLShader {
  version: GLSLVersion;
  stage: GLSLStage;
  code: string;
  attributes: GLSLVariable[];
  varyings: GLSLVariable[];
  uniforms: GLSLVariable[];
  functions: string[];
}

export interface GLSLVariable {
  name: string;
  type: string;
  location?: number;
}

// ============================================================================
// GLSL to WGSL Translator
// ============================================================================

export class GLSLToWGSLTranslator {
  private cache: Map<string, string> = new Map();
  private readonly CACHE_SIZE = 1000;

  /**
   * Translate GLSL to WGSL
   */
  translate(glslCode: string, stage: GLSLStage): string {
    const hash = this.hashCode(glslCode + stage);
    
    // Check cache
    const cached = this.cache.get(hash);
    if (cached) {
      console.log('[GLSL->WGSL] Using cached translation');
      return cached;
    }

    console.log(`[GLSL->WGSL] Translating ${stage} shader...`);

    // Parse GLSL
    const glslShader = this.parseGLSL(glslCode, stage);

    // Convert to WGSL
    const wgsl = this.convertGLSLtoWGSL(glslShader);

    // Cache translation
    this.cacheTranslation(hash, wgsl);

    return wgsl;
  }

  /**
   * Parse GLSL shader
   */
  private parseGLSL(code: string, stage: GLSLStage): GLSLShader {
    // Extract version
    const versionMatch = code.match(/#version\s+(\d+\s*(?:es)?)/);
    const version = versionMatch ? (versionMatch[1].trim() as GLSLVersion) : '100';

    // Extract attributes
    const attributes = this.extractVariables(code, 'attribute');

    // Extract varyings
    const varyings = this.extractVariables(code, 'varying');

    // Extract uniforms
    const uniforms = this.extractVariables(code, 'uniform');

    return {
      version,
      stage,
      code,
      attributes,
      varyings,
      uniforms,
      functions: [],
    };
  }

  /**
   * Convert GLSL to WGSL
   */
  private convertGLSLtoWGSL(glsl: GLSLShader): string {
    let wgsl = '';

    // 1. Create input/output structs
    if (glsl.stage === 'vertex') {
      wgsl += this.createVertexInputStruct(glsl.attributes);
      wgsl += this.createVertexOutputStruct(glsl.varyings);
    } else {
      wgsl += this.createFragmentInputStruct(glsl.varyings);
      wgsl += this.createFragmentOutputStruct();
    }

    // 2. Create uniform bindings
    wgsl += this.createUniformBindings(glsl.uniforms);

    // 3. Convert main function
    wgsl += this.convertMainFunction(glsl);

    // 4. Clean up and optimize
    wgsl = this.optimizeWGSL(wgsl);

    return wgsl;
  }

  /**
   * Create vertex input struct
   */
  private createVertexInputStruct(attributes: GLSLVariable[]): string {
    if (attributes.length === 0) return '';

    let wgsl = 'struct VertexInput {\n';
    
    attributes.forEach((attr, index) => {
      const wgslType = this.convertType(attr.type);
      wgsl += `  @location(${index}) ${attr.name}: ${wgslType},\n`;
    });
    
    wgsl += '}\n\n';
    return wgsl;
  }

  /**
   * Create vertex output struct
   */
  private createVertexOutputStruct(varyings: GLSLVariable[]): string {
    let wgsl = 'struct VertexOutput {\n';
    wgsl += '  @builtin(position) position: vec4<f32>,\n';
    
    varyings.forEach((varying, index) => {
      if (varying.name !== 'gl_Position') {
        const wgslType = this.convertType(varying.type);
        wgsl += `  @location(${index}) ${varying.name}: ${wgslType},\n`;
      }
    });
    
    wgsl += '}\n\n';
    return wgsl;
  }

  /**
   * Create fragment input struct
   */
  private createFragmentInputStruct(varyings: GLSLVariable[]): string {
    let wgsl = 'struct FragmentInput {\n';
    wgsl += '  @builtin(position) position: vec4<f32>,\n';
    
    varyings.forEach((varying, index) => {
      if (varying.name !== 'gl_Position') {
        const wgslType = this.convertType(varying.type);
        wgsl += `  @location(${index}) ${varying.name}: ${wgslType},\n`;
      }
    });
    
    wgsl += '}\n\n';
    return wgsl;
  }

  /**
   * Create fragment output struct
   */
  private createFragmentOutputStruct(): string {
    return `struct FragmentOutput {
  @location(0) color: vec4<f32>,
}

`;
  }

  /**
   * Create uniform bindings
   */
  private createUniformBindings(uniforms: GLSLVariable[]): string {
    let wgsl = '';
    let bindingIndex = 0;

    for (const uniform of uniforms) {
      const wgslType = this.convertType(uniform.type);
      
      if (uniform.type.includes('sampler')) {
        // Texture uniforms
        wgsl += `@group(0) @binding(${bindingIndex}) var ${uniform.name}: texture_2d<f32>;\n`;
        bindingIndex++;
        wgsl += `@group(0) @binding(${bindingIndex}) var ${uniform.name}_sampler: sampler;\n`;
        bindingIndex++;
      } else {
        // Regular uniforms - wrap in struct for alignment
        wgsl += `struct ${this.capitalize(uniform.name)}Data {\n`;
        wgsl += `  value: ${wgslType},\n`;
        wgsl += `}\n`;
        wgsl += `@group(0) @binding(${bindingIndex}) var<uniform> ${uniform.name}: ${this.capitalize(uniform.name)}Data;\n\n`;
        bindingIndex++;
      }
    }

    return wgsl;
  }

  /**
   * Convert main function
   */
  private convertMainFunction(glsl: GLSLShader): string {
    let code = glsl.code;

    // Remove version directive
    code = code.replace(/#version.*\n/, '');

    // Remove precision qualifiers
    code = code.replace(/precision\s+\w+\s+\w+;/g, '');

    // Remove attribute/varying/uniform declarations
    code = code.replace(/\b(attribute|varying|uniform)\s+\w+\s+\w+;/g, '');

    // Extract main function
    const mainMatch = code.match(/void\s+main\s*\(\s*\)\s*{([\s\S]*?)}/);
    if (!mainMatch) {
      throw new Error('No main function found');
    }

    let mainBody = mainMatch[1];

    // Convert GLSL built-ins and functions
    mainBody = this.convertBuiltIns(mainBody, glsl.stage);
    mainBody = this.convertFunctions(mainBody);
    mainBody = this.convertTextureSampling(mainBody);
    mainBody = this.convertUniformAccess(mainBody);

    // Create WGSL entry point
    let wgsl = '';

    if (glsl.stage === 'vertex') {
      wgsl += '@vertex\n';
      wgsl += 'fn main(input: VertexInput) -> VertexOutput {\n';
      wgsl += '  var output: VertexOutput;\n';
      wgsl += mainBody;
      wgsl += '  return output;\n';
      wgsl += '}\n';
    } else {
      wgsl += '@fragment\n';
      wgsl += 'fn main(input: FragmentInput) -> FragmentOutput {\n';
      wgsl += '  var output: FragmentOutput;\n';
      wgsl += mainBody;
      wgsl += '  return output;\n';
      wgsl += '}\n';
    }

    return wgsl;
  }

  /**
   * Convert built-in variables
   */
  private convertBuiltIns(code: string, stage: GLSLStage): string {
    if (stage === 'vertex') {
      // gl_Position -> output.position
      code = code.replace(/\bgl_Position\b/g, 'output.position');
      
      // Vertex attributes -> input.attributeName
      code = code.replace(/\b(a_\w+)/g, 'input.$1');
      
      // Varyings -> output.varyingName
      code = code.replace(/\b(v_\w+)/g, 'output.$1');
    } else {
      // gl_FragColor -> output.color
      code = code.replace(/\bgl_FragColor\b/g, 'output.color');
      
      // Varyings -> input.varyingName
      code = code.replace(/\b(v_\w+)/g, 'input.$1');
      
      // gl_FragCoord -> input.position
      code = code.replace(/\bgl_FragCoord\b/g, 'input.position');
    }

    return code;
  }

  /**
   * Convert functions
   */
  private convertFunctions(code: string): string {
    const mappings: Record<string, string> = {
      'texture2D': 'textureSample',
      'mix': 'mix',
      'fract': 'fract',
      'mod': 'modf',
      'clamp': 'clamp',
      'step': 'step',
      'smoothstep': 'smoothstep',
      'length': 'length',
      'distance': 'distance',
      'dot': 'dot',
      'cross': 'cross',
      'normalize': 'normalize',
      'reflect': 'reflect',
      'refract': 'refract',
      'pow': 'pow',
      'exp': 'exp',
      'log': 'log',
      'exp2': 'exp2',
      'log2': 'log2',
      'sqrt': 'sqrt',
      'inversesqrt': 'inverseSqrt',
      'abs': 'abs',
      'sign': 'sign',
      'floor': 'floor',
      'ceil': 'ceil',
      'min': 'min',
      'max': 'max',
      'sin': 'sin',
      'cos': 'cos',
      'tan': 'tan',
      'asin': 'asin',
      'acos': 'acos',
      'atan': 'atan',
    };

    for (const [glsl, wgsl] of Object.entries(mappings)) {
      const regex = new RegExp(`\\b${glsl}\\b`, 'g');
      code = code.replace(regex, wgsl);
    }

    return code;
  }

  /**
   * Convert texture sampling
   */
  private convertTextureSampling(code: string): string {
    // texture2D(sampler, coords) -> textureSample(texture, sampler, coords)
    code = code.replace(
      /texture2D\((\w+),\s*([^)]+)\)/g,
      'textureSample($1, $1_sampler, $2)'
    );

    return code;
  }

  /**
   * Convert uniform access
   */
  private convertUniformAccess(code: string): string {
    // Uniforms need to access .value field
    // This is a simplification - would track uniform names in real impl
    const uniformPattern = /\b(u_\w+)\b(?!\s*\.)/g;
    code = code.replace(uniformPattern, '$1.value');

    return code;
  }

  /**
   * Convert types
   */
  private convertType(glslType: string): string {
    const typeMap: Record<string, string> = {
      'float': 'f32',
      'vec2': 'vec2<f32>',
      'vec3': 'vec3<f32>',
      'vec4': 'vec4<f32>',
      'int': 'i32',
      'ivec2': 'vec2<i32>',
      'ivec3': 'vec3<i32>',
      'ivec4': 'vec4<i32>',
      'uint': 'u32',
      'uvec2': 'vec2<u32>',
      'uvec3': 'vec3<u32>',
      'uvec4': 'vec4<u32>',
      'bool': 'bool',
      'bvec2': 'vec2<bool>',
      'bvec3': 'vec3<bool>',
      'bvec4': 'vec4<bool>',
      'mat2': 'mat2x2<f32>',
      'mat3': 'mat3x3<f32>',
      'mat4': 'mat4x4<f32>',
      'sampler2D': 'texture_2d<f32>',
      'samplerCube': 'texture_cube<f32>',
    };

    return typeMap[glslType] || glslType;
  }

  /**
   * Extract variables
   */
  private extractVariables(code: string, qualifier: string): GLSLVariable[] {
    const variables: GLSLVariable[] = [];
    const regex = new RegExp(`\\b${qualifier}\\s+(\\w+)\\s+(\\w+);`, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      variables.push({
        type: match[1],
        name: match[2],
      });
    }

    return variables;
  }

  /**
   * Optimize WGSL
   */
  private optimizeWGSL(wgsl: string): string {
    // Remove duplicate newlines
    wgsl = wgsl.replace(/\n{3,}/g, '\n\n');

    // Remove trailing whitespace
    wgsl = wgsl.replace(/[ \t]+$/gm, '');

    return wgsl;
  }

  /**
   * Cache translation
   */
  private cacheTranslation(hash: string, wgsl: string): void {
    if (this.cache.size >= this.CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(hash, wgsl);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Helper methods
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// Export singleton
export const glslToWGSLTranslator = new GLSLToWGSLTranslator();
