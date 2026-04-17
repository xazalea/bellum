import { WebGL2Renderer } from '../graphics/webgl2-renderer';
import { X86Interpreter } from '../cpu/x86_interpreter';

export interface ExportableRuntime {
  type: 'apk' | 'exe';
  memory: Uint8Array;
  cpuState?: {
    regs: Int32Array;
    eip: number;
    eflags: number;
    segs: Uint16Array;
  };
  surfacePixels: Uint8Array;
  surfaceWidth: number;
  surfaceHeight: number;
  entryPoint: number;
  metadata: Record<string, string>;
  // APK / Dalvik fields
  dalvikBytecode?: Uint8Array;        // raw Dalvik bytecode for entry method
  dalvikInsnsSize?: number;           // number of 16-bit code units
  dalvikRegistersSize?: number;       // registers used by entry method
  dalvikInsSize?: number;             // argument registers
  dexStrings?: string[];              // string table for const-string resolution
  dexMethods?: Array<{ methodIdx: number; insns: Uint8Array; insnsSize: number; insSize: number; registersSize: number; methodName: string }>;  // all methods with bytecode
}

export class HTMLExporter {
  exportRuntime(runtime: ExportableRuntime): string {
    const isAPK = runtime.type === 'apk' && runtime.dalvikBytecode;
    const memBase64 = this.uint8ToBase64(runtime.memory.subarray(0, Math.min(runtime.memory.length, 64 * 1024 * 1024)));
    const pixelBase64 = this.uint8ToBase64(runtime.surfacePixels);
    const cpuStateJson = runtime.cpuState ? JSON.stringify({
      regs: Array.from(runtime.cpuState.regs),
      eip: runtime.cpuState.eip,
      eflags: runtime.cpuState.eflags,
      segs: Array.from(runtime.cpuState.segs),
    }) : 'null';
    const dalvikBytecodeB64 = runtime.dalvikBytecode ? this.uint8ToBase64(runtime.dalvikBytecode) : '';
    const dexStringsJson = runtime.dexStrings ? JSON.stringify(runtime.dexStrings) : '[]';
    const dexMethodsJson = runtime.dexMethods ? JSON.stringify(runtime.dexMethods.map(m => ({
      methodIdx: m.methodIdx, insnsSize: m.insnsSize, insSize: m.insSize, registersSize: m.registersSize, methodName: m.methodName,
      insnsB64: this.uint8ToBase64(m.insns),
    }))) : '[]';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${this.esc(runtime.metadata.title || 'Abyss Runtime Export')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050505;color:#e5e5e5;font-family:'Inter','SF Pro Display',-apple-system,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100vh;-webkit-font-smoothing:antialiased}
#header{padding:10px 16px;width:100%;background:#050505;border-bottom:1px solid #1a1a1a;display:flex;align-items:center;gap:12px}
#header h1{font-size:13px;font-weight:600;color:#f5f5f5;letter-spacing:-0.02em}
#status{font-size:11px;color:#666;margin-left:auto;font-family:'SF Mono','JetBrains Mono',monospace}
#canvas-wrap{position:relative;flex:1;display:flex;align-items:center;justify-content:center;width:100%;background:#050505}
canvas{image-rendering:pixelated;image-rendering:crisp-edges;max-width:100%;max-height:calc(100vh - 42px)}
#controls{position:absolute;bottom:12px;right:12px;display:flex;gap:6px;z-index:10}
button{background:#111;color:#bbb;border:1px solid #222;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:11px;transition:all 120ms}
button:hover{background:#1a1a1a;border-color:#333;color:#e5e5e5}
button:active{background:#222}
#fps{position:absolute;top:10px;left:10px;font-size:11px;color:#555;font-family:'SF Mono','JetBrains Mono',monospace;background:rgba(5,5,5,0.85);padding:4px 8px;border:1px solid #1a1a1a;border-radius:4px;backdrop-filter:blur(8px);pointer-events:none}
</style>
</head>
<body>
<div id="header"><h1>${this.esc(runtime.metadata.title || 'Exported Runtime')}</h1><span id="status">Initializing...</span></div>
<div id="canvas-wrap">
<canvas id="c" width="${runtime.surfaceWidth}" height="${runtime.surfaceHeight}"></canvas>
<div id="fps"></div>
<div id="controls"><button onclick="togglePause()">⏸ Pause</button><button onclick="resetRuntime()">↻ Reset</button></div>
</div>
<script>
const MEM_SIZE=${runtime.memory.length};
const SURF_W=${runtime.surfaceWidth};
const SURF_H=${runtime.surfaceHeight};
const TYPE="${runtime.type}";
const ENTRY=${runtime.entryPoint};
const CPU_STATE=${cpuStateJson};
const MEM_B64="${memBase64}";
const PIX_B64="${pixelBase64}";

const canvas=document.getElementById('c');
const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance'});
const statusEl=document.getElementById('status');
const fpsEl=document.getElementById('fps');

function b64ToU8(b64){const s=atob(b64),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}

let paused=false;
let running=true;
let frameCount=0;
let lastFpsTime=performance.now();
let lastFrameTime=performance.now();

function togglePause(){paused=!paused}
function resetRuntime(){location.reload()}

const CF=0x0001,PF=0x0004,AF=0x0010,ZF=0x0040;
const SF=0x0080,IF=0x0200,DF=0x0400,OF=0x0800;
const EAX=0,ECX=1,EDX=2,EBX=3,ESP=4,EBP=5,ESI=6,EDI=7;
const SEG_OV={0x26:0,0x2E:1,0x36:2,0x3E:3,0x64:4,0x65:5};

class X86{
constructor(){
this.regs=new Int32Array(8);this.segs=new Uint16Array(6);this.eflags=IF;this.eip=0;this.halted=false;
const b=new ArrayBuffer(MEM_SIZE);this.mem=new Uint8Array(b);this.mem16=new Uint16Array(b);this.mem32=new Int32Array(b);
this._ea=0;this._mr=0;this._mrr=false;this._sov=-1;this._rp=0;
}
r8(a){return this.mem[a>>>0]}r16(a){return this.mem16[a>>>1]}r32(a){return this.mem32[a>>>2]}
w8(a,v){this.mem[a>>>0]=v&0xFF}w16(a,v){this.mem16[a>>>1]=v&0xFFFF}w32(a,v){this.mem32[a>>>2]=v|0}
rm(a,s){return s===1?this.r8(a):s===2?this.r16(a):this.r32(a)}
wm(a,v,s){if(s===1)this.w8(a,v);else if(s===2)this.w16(a,v);else this.w32(a,v)}
load(b){this.mem.set(b)}
push32(v){this.regs[ESP]=(this.regs[ESP]-4)|0;this.w32(this.regs[ESP]>>>0,v)}
pop32(){const v=this.r32(this.regs[ESP]>>>0);this.regs[ESP]=(this.regs[ESP]+4)|0;return v}
push16(v){this.regs[ESP]=(this.regs[ESP]-2)|0;this.w16(this.regs[ESP]>>>0,v)}
pop16(){const v=this.r16(this.regs[ESP]>>>0);this.regs[ESP]=(this.regs[ESP]+2)|0;return v}
pv(v,s){if(s===2)this.push16(v);else this.push32(v)}
ppv(s){return s===2?this.pop16():this.pop32()}
gf(m){return(this.eflags&m)!==0}
sf(m,on){if(on)this.eflags|=m;else this.eflags&=~m}
par(v){let b=v&0xFF;b^=b>>4;b^=b>>2;b^=b>>1;return(b&1)===0}
ufr(r,s){const mk=s===1?0xFF:s===2?0xFFFF:0xFFFFFFFF;const v=r&mk;this.sf(ZF,v===0);this.sf(SF,!!(v&(s===1?0x80:s===2?0x8000:0x80000000)));this.sf(PF,this.par(v))}
ufa(a,b,r,s){this.ufr(r,s);const mk=s===1?0xFF:s===2?0xFFFF:0xFFFFFFFF;this.sf(CF,(r&~mk)!==0);this.sf(AF,((a^b^r)&0x10)!==0);this.sf(OF,!!((a^r)&(b^r)&(s===1?0x80:s===2?0x8000:0x80000000)))}
ufs(a,b,r,s){this.ufr(r,s);const mk=s===1?0xFF:s===2?0xFFFF:0xFFFFFFFF;this.sf(CF,(a&mk)<(b&mk));this.sf(AF,((a^b^r)&0x10)!==0);this.sf(OF,!!((a^b)&(a^r)&(s===1?0x80:s===2?0x8000:0x80000000)))}
ufl(r,s){this.ufr(r,s);this.sf(CF,false);this.sf(OF,false);this.sf(AF,false)}
gr8(i){return i<4?this.regs[i]&0xFF:(this.regs[i-4]>>>8)&0xFF}
sr8(i,v){if(i<4)this.regs[i]=(this.regs[i]&0xFFFFFF00)|(v&0xFF);else this.regs[i-4]=(this.regs[i-4]&0xFFFF00FF)|((v&0xFF)<<8)}
gr(i,s){return s===1?this.gr8(i):s===2?this.regs[i]&0xFFFF:this.regs[i]}
sr(i,v,s){if(s===1){this.sr8(i,v);return}if(s===2){this.regs[i]=(this.regs[i]&0xFFFF0000)|(v&0xFFFF);return}this.regs[i]=v|0}
f8(){const v=this.r8(this.eip);this.eip=(this.eip+1)>>>0;return v}
f16(){const v=this.r16(this.eip);this.eip=(this.eip+2)>>>0;return v}
f32(){const v=this.r32(this.eip);this.eip=(this.eip+4)>>>0;return v}
fi(s){return s===1?this.f8():s===2?this.f16():this.f32()}
dmodrm(as_){
const b=this.f8(),mod=(b>>>6)&3;this._mr=(b>>>3)&7;const rm=b&7;
if(mod===3){this._mrr=true;this._ea=rm;return}
this._mrr=false;let addr;
if(as_===4){
if(rm===4){const sib=this.f8(),sc=(sib>>>6)&3,ix=(sib>>>3)&7,bs=sib&7;const bv=(bs===5&&mod===0)?this.f32():this.regs[bs];const iv=ix===4?0:this.regs[ix];addr=(bv+(iv<<sc))>>>0}
else if(rm===5&&mod===0)addr=this.f32()>>>0;
else addr=this.regs[rm]>>>0;
if(mod===1)addr=(addr+((this.f8()<<24)>>24))>>>0;
else if(mod===2)addr=(addr+this.f32())>>>0;
}else{
switch(rm){case 0:addr=(this.regs[EBX]+this.regs[ESI])&0xFFFF;break;case 1:addr=(this.regs[EBX]+this.regs[EDI])&0xFFFF;break;case 2:addr=(this.regs[EBP]+this.regs[ESI])&0xFFFF;break;case 3:addr=(this.regs[EBP]+this.regs[EDI])&0xFFFF;break;case 4:addr=this.regs[ESI]&0xFFFF;break;case 5:addr=this.regs[EDI]&0xFFFF;break;case 6:addr=mod===0?this.f16():this.regs[EBP]&0xFFFF;break;case 7:addr=this.regs[EBX]&0xFFFF;break;default:addr=0}
if(mod===1)addr=(addr+((this.f8()<<24)>>24))&0xFFFF;else if(mod===2)addr=(addr+this.f16())&0xFFFF;
}
this._ea=addr>>>0;
}
grm(s){return this._mrr?this.gr(this._ea,s):this.rm(this._ea,s)}
srm(v,s){if(this._mrr)this.sr(this._ea,v,s);else this.wm(this._ea,v,s)}
alu(alu_,a,b,s){
const m=s===1?0xFF:s===2?0xFFFF:0xFFFFFFFF;
switch(alu_){
case 0:{const r=(a+b)&m;this.ufa(a,b,r,s);return r}
case 1:{const r=(a|b)&m;this.ufl(r,s);return r}
case 2:{const c=this.gf(CF)?1:0;const r=(a+b+c)&m;this.ufa(a,b+c,r,s);return r}
case 3:{const c=this.gf(CF)?1:0;const r=(a-b-c)&m;this.ufs(a,b+c,r,s);return r}
case 4:{const r=(a&b)&m;this.ufl(r,s);return r}
case 5:{const r=(a-b)&m;this.ufs(a,b,r,s);return r}
case 6:{const r=(a^b)&m;this.ufl(r,s);return r}
case 7:this.ufs(a,b,(a-b)&m,s);return a;
default:return a;
}}
jcc(i){return[!this.gf(OF),!!this.gf(OF),!!this.gf(CF),!this.gf(CF),!!this.gf(ZF),!this.gf(ZF),!!(this.gf(CF)||this.gf(ZF)),!(this.gf(CF)||this.gf(ZF)),!!this.gf(SF),!this.gf(SF),!!this.gf(PF),!this.gf(PF),this.gf(SF)!==this.gf(OF),this.gf(SF)===this.gf(OF),this.gf(SF)!==this.gf(OF)||this.gf(ZF),this.gf(SF)===this.gf(OF)&&!this.gf(ZF)][i]}
handleVBIOS(){
const ah=(this.regs[EAX]>>8)&0xFF;
if(ah===0x00){const mode=this.regs[EAX]&0xFF}
else if(ah===0x0C){const color=this.regs[EAX]&0xFF;const x=this.regs[ECX]&0xFFFF;const y=(this.regs[EDX]>>16)&0xFFFF;
if(surfPixels&&x<SURF_W&&y<SURF_H){const idx=(y*SURF_W+x)*4;surfPixels[idx]=(color&4)?255:0;surfPixels[idx+1]=(color&2)?255:0;surfPixels[idx+2]=(color&1)?255:0;surfPixels[idx+3]=255}
}}
handleDOS(){
const ah=(this.regs[EAX]>>8)&0xFF;
if(ah===0x4C){this.halted=true}
}
dispatch(op,os,as_){
switch(op){
case 0x00:this.dmodrm(as_);this.srm(this.alu(0,this.grm(1),this.gr(this._mr,1),1),1);break;
case 0x01:this.dmodrm(as_);this.srm(this.alu(0,this.grm(os),this.gr(this._mr,os),os),os);break;
case 0x02:this.dmodrm(as_);this.sr(this._mr,this.alu(0,this.gr(this._mr,1),this.grm(1),1),1);break;
case 0x03:this.dmodrm(as_);this.sr(this._mr,this.alu(0,this.gr(this._mr,os),this.grm(os),os),os);break;
case 0x04:{const r=this.alu(0,this.regs[EAX]&0xFF,this.f8(),1);this.sr8(0,r);break}
case 0x05:{this.sr(EAX,this.alu(0,os===2?this.regs[EAX]&0xFFFF:this.regs[EAX],this.fi(os),os),os);break}
case 0x08:this.dmodrm(as_);this.srm(this.alu(1,this.grm(1),this.gr(this._mr,1),1),1);break;
case 0x09:this.dmodrm(as_);this.srm(this.alu(1,this.grm(os),this.gr(this._mr,os),os),os);break;
case 0x0A:this.dmodrm(as_);this.sr(this._mr,this.alu(1,this.gr(this._mr,1),this.grm(1),1),1);break;
case 0x0B:this.dmodrm(as_);this.sr(this._mr,this.alu(1,this.gr(this._mr,os),this.grm(os),os),os);break;
case 0x0C:this.sr8(0,this.alu(1,this.regs[EAX]&0xFF,this.f8(),1));break;
case 0x0D:{this.sr(EAX,this.alu(1,os===2?this.regs[EAX]&0xFFFF:this.regs[EAX],this.fi(os),os),os);break}
case 0x10:this.dmodrm(as_);this.srm(this.alu(2,this.grm(1),this.gr(this._mr,1),1),1);break;
case 0x11:this.dmodrm(as_);this.srm(this.alu(2,this.grm(os),this.gr(this._mr,os),os),os);break;
case 0x12:this.dmodrm(as_);this.sr(this._mr,this.alu(2,this.gr(this._mr,1),this.grm(1),1),1);break;
case 0x13:this.dmodrm(as_);this.sr(this._mr,this.alu(2,this.gr(this._mr,os),this.grm(os),os),os);break;
case 0x14:this.sr8(0,this.alu(2,this.regs[EAX]&0xFF,this.f8(),1));break;
case 0x15:{this.sr(EAX,this.alu(2,os===2?this.regs[EAX]&0xFFFF:this.regs[EAX],this.fi(os),os),os);break}
case 0x18:this.dmodrm(as_);this.srm(this.alu(3,this.grm(1),this.gr(this._mr,1),1),1);break;
case 0x19:this.dmodrm(as_);this.srm(this.alu(3,this.grm(os),this.gr(this._mr,os),os),os);break;
case 0x1A:this.dmodrm(as_);this.sr(this._mr,this.alu(3,this.gr(this._mr,1),this.grm(1),1),1);break;
case 0x1B:this.dmodrm(as_);this.sr(this._mr,this.alu(3,this.gr(this._mr,os),this.grm(os),os),os);break;
case 0x1C:this.sr8(0,this.alu(3,this.regs[EAX]&0xFF,this.f8(),1));break;
case 0x1D:{this.sr(EAX,this.alu(3,os===2?this.regs[EAX]&0xFFFF:this.regs[EAX],this.fi(os),os),os);break}
case 0x20:this.dmodrm(as_);this.srm(this.alu(4,this.grm(1),this.gr(this._mr,1),1),1);break;
case 0x21:this.dmodrm(as_);this.srm(this.alu(4,this.grm(os),this.gr(this._mr,os),os),os);break;
case 0x22:this.dmodrm(as_);this.sr(this._mr,this.alu(4,this.gr(this._mr,1),this.grm(1),1),1);break;
case 0x23:this.dmodrm(as_);this.sr(this._mr,this.alu(4,this.gr(this._mr,os),this.grm(os),os),os);break;
case 0x24:this.sr8(0,this.alu(4,this.regs[EAX]&0xFF,this.f8(),1));break;
case 0x25:{this.sr(EAX,this.alu(4,os===2?this.regs[EAX]&0xFFFF:this.regs[EAX],this.fi(os),os),os);break}
case 0x28:this.dmodrm(as_);this.srm(this.alu(5,this.grm(1),this.gr(this._mr,1),1),1);break;
case 0x29:this.dmodrm(as_);this.srm(this.alu(5,this.grm(os),this.gr(this._mr,os),os),os);break;
case 0x2A:this.dmodrm(as_);this.sr(this._mr,this.alu(5,this.gr(this._mr,1),this.grm(1),1),1);break;
case 0x2B:this.dmodrm(as_);this.sr(this._mr,this.alu(5,this.gr(this._mr,os),this.grm(os),os),os);break;
case 0x2C:this.sr8(0,this.alu(5,this.regs[EAX]&0xFF,this.f8(),1));break;
case 0x2D:{this.sr(EAX,this.alu(5,os===2?this.regs[EAX]&0xFFFF:this.regs[EAX],this.fi(os),os),os);break}
case 0x30:this.dmodrm(as_);this.srm(this.alu(6,this.grm(1),this.gr(this._mr,1),1),1);break;
case 0x31:this.dmodrm(as_);this.srm(this.alu(6,this.grm(os),this.gr(this._mr,os),os),os);break;
case 0x32:this.dmodrm(as_);this.sr(this._mr,this.alu(6,this.gr(this._mr,1),this.grm(1),1),1);break;
case 0x33:this.dmodrm(as_);this.sr(this._mr,this.alu(6,this.gr(this._mr,os),this.grm(os),os),os);break;
case 0x34:this.sr8(0,this.alu(6,this.regs[EAX]&0xFF,this.f8(),1));break;
case 0x35:{this.sr(EAX,this.alu(6,os===2?this.regs[EAX]&0xFFFF:this.regs[EAX],this.fi(os),os),os);break}
case 0x38:this.dmodrm(as_);this.alu(7,this.grm(1),this.gr(this._mr,1),1);break;
case 0x39:this.dmodrm(as_);this.alu(7,this.grm(os),this.gr(this._mr,os),os);break;
case 0x3A:this.dmodrm(as_);this.alu(7,this.gr(this._mr,1),this.grm(1),1);break;
case 0x3B:this.dmodrm(as_);this.alu(7,this.gr(this._mr,os),this.grm(os),os);break;
case 0x3C:this.alu(7,this.regs[EAX]&0xFF,this.f8(),1);break;
case 0x3D:{this.alu(7,os===2?this.regs[EAX]&0xFFFF:this.regs[EAX],this.fi(os),os);break}
case 0x40:case 0x41:case 0x42:case 0x43:case 0x44:case 0x45:case 0x46:case 0x47:{const c=this.gf(CF);const v=this.gr(op-0x40,os);this.ufa(v,1,(v+1),os);this.sf(CF,c);this.sr(op-0x40,(v+1),os);break}
case 0x48:case 0x49:case 0x4A:case 0x4B:case 0x4C:case 0x4D:case 0x4E:case 0x4F:{const c=this.gf(CF);const v=this.gr(op-0x48,os);this.ufs(v,1,(v-1),os);this.sf(CF,c);this.sr(op-0x48,(v-1),os);break}
case 0x50:case 0x51:case 0x52:case 0x53:case 0x54:case 0x55:case 0x56:case 0x57:this.pv(this.regs[op-0x50],os);break;
case 0x58:case 0x59:case 0x5A:case 0x5B:case 0x5C:case 0x5D:case 0x5E:case 0x5F:this.sr(op-0x58,this.ppv(os),os);break;
case 0x68:this.pv(this.fi(os),os);break;
case 0x6A:this.pv((this.f8()<<24)>>24,os);break;
case 0x70:case 0x71:case 0x72:case 0x73:case 0x74:case 0x75:case 0x76:case 0x77:case 0x78:case 0x79:case 0x7A:case 0x7B:case 0x7C:case 0x7D:case 0x7E:case 0x7F:{const r=(this.f8()<<24)>>24;if(this.jcc(op-0x70))this.eip=(this.eip+r)>>>0;break}
case 0x80:case 0x81:case 0x82:case 0x83:{const sz=(op===0x80||op===0x82)?1:os;this.dmodrm(as_);const a=this.grm(sz);const im=op===0x83?((this.f8()<<24)>>24)&(os===2?0xFFFF:0xFFFFFFFF):this.fi(sz);const r=this.alu(this._mr,a,im,sz);if(this._mr!==7)this.srm(r,sz);break}
case 0x84:this.dmodrm(as_);this.ufl(this.grm(1)&this.gr(this._mr,1),1);break;
case 0x85:this.dmodrm(as_);this.ufl(this.grm(os)&this.gr(this._mr,os),os);break;
case 0x86:this.dmodrm(as_);{const a=this.grm(1),b=this.gr(this._mr,1);this.srm(b,1);this.sr(this._mr,a,1);break}
case 0x87:this.dmodrm(as_);{const a=this.grm(os),b=this.gr(this._mr,os);this.srm(b,os);this.sr(this._mr,a,os);break}
case 0x88:this.dmodrm(as_);this.srm(this.gr(this._mr,1),1);break;
case 0x89:this.dmodrm(as_);this.srm(this.gr(this._mr,os),os);break;
case 0x8A:this.dmodrm(as_);this.sr(this._mr,this.grm(1),1);break;
case 0x8B:this.dmodrm(as_);this.sr(this._mr,this.grm(os),os);break;
case 0x8D:this.dmodrm(as_);this.sr(this._mr,this._ea,os);break;
case 0x8F:this.dmodrm(as_);this.srm(this.ppv(os),os);break;
case 0x90:break;
case 0x91:case 0x92:case 0x93:case 0x94:case 0x95:case 0x96:case 0x97:{const t=this.regs[EAX];this.regs[EAX]=this.regs[op-0x90];this.regs[op-0x90]=t;break}
case 0x99:this.regs[EDX]=(this.regs[EAX]&(os===2?0x8000:0x80000000))?(os===2?0xFFFF:-1):0;break;
case 0xA0:this.sr8(0,this.r8(this.f32()));break;
case 0xA1:this.sr(EAX,this.rm(this.f32(),os),os);break;
case 0xA2:this.w8(this.f32(),this.gr8(0));break;
case 0xA3:this.wm(this.f32(),this.gr(EAX,os),os);break;
case 0xA8:this.ufl((this.regs[EAX]&0xFF)&this.f8(),1);break;
case 0xA9:this.ufl((os===2?this.regs[EAX]&0xFFFF:this.regs[EAX])&this.fi(os),os);break;
case 0xB0:case 0xB1:case 0xB2:case 0xB3:case 0xB4:case 0xB5:case 0xB6:case 0xB7:this.sr8(op-0xB0,this.f8());break;
case 0xB8:case 0xB9:case 0xBA:case 0xBB:case 0xBC:case 0xBD:case 0xBE:case 0xBF:this.sr(op-0xB8,this.fi(os),os);break;
case 0xC2:{const im=this.f16();this.eip=this.pop32();this.regs[ESP]=(this.regs[ESP]+im)|0;break}
case 0xC3:this.eip=this.pop32();break;
case 0xC6:this.dmodrm(as_);this.srm(this.fi(1),1);break;
case 0xC7:this.dmodrm(as_);this.srm(this.fi(os),os);break;
case 0xC9:this.regs[ESP]=this.regs[EBP];this.regs[EBP]=this.pop32();break;
case 0xCD:{const n=this.f8();if(n===0x10)this.handleVBIOS();else if(n===0x21)this.handleDOS();break}
case 0xE8:{const r=this.f32()|0;this.push32(this.eip);this.eip=(this.eip+r)>>>0;break}
case 0xE9:{const r=this.f32()|0;this.eip=(this.eip+r)>>>0;break}
case 0xEB:{const r=(this.f8()<<24)>>24;this.eip=(this.eip+r)>>>0;break}
case 0xF4:this.halted=true;break;
case 0xF5:this.sf(CF,!this.gf(CF));break;
case 0xF6:case 0xF7:{const sz=op===0xF6?1:os;this.dmodrm(as_);
if(this._mr===0||this._mr===1){this.ufl(this.grm(sz)&this.fi(sz),sz)}
else if(this._mr===4){const v=this.grm(sz);const mk=sz===1?0xFF:sz===2?0xFFFF:0xFFFFFFFF;this.srm(~v&mk,sz);this.ufl(~v&mk,sz)}
else if(this._mr===5){const v=this.grm(sz);const mk=sz===1?0xFF:sz===2?0xFFFF:0xFFFFFFFF;const r=(-v)&mk;this.srm(r,sz);this.ufs(0,v,r,sz);this.sf(CF,v!==0)}
else if(this._mr===2&&sz===4){const val=this.grm(sz)>>>0;const r=(this.regs[EAX]>>>0)*val;this.regs[EAX]=r>>>0;this.regs[EDX]=(r/0x100000000)>>>0;this.sf(CF,this.regs[EDX]!==0);this.sf(OF,this.regs[EDX]!==0)}
else if(this._mr===3){const val=this.grm(sz)>>>0;if(val===0){this.halted=true;return}if(sz===4){const hi=this.regs[EDX]>>>0,lo=this.regs[EAX]>>>0;const d=hi*0x100000000+lo;this.regs[EAX]=(d/val)|0;this.regs[EDX]=(d%val)|0}}
break}
case 0xFE:this.dmodrm(as_);{const sz=1;const c=this.gf(CF);const v=this.grm(sz);if(this._mr===0){this.ufa(v,1,(v+1),sz);this.sf(CF,c);this.srm((v+1),sz)}else{this.ufs(v,1,(v-1),sz);this.sf(CF,c);this.srm((v-1),sz)}break}
case 0xFF:this.dmodrm(as_);{
if(this._mr===0){const c=this.gf(CF);const v=this.grm(os);this.ufa(v,1,(v+1),os);this.sf(CF,c);this.srm((v+1),os)}
else if(this._mr===1){const c=this.gf(CF);const v=this.grm(os);this.ufs(v,1,(v-1),os);this.sf(CF,c);this.srm((v-1),os)}
else if(this._mr===2)this.pv(this.grm(os),os);
else if(this._mr===4){this.push32(this.eip);this.eip=this.grm(os)}
else if(this._mr===6)this.pv(this.grm(os),os);
break}
case 0x0F:{const op2=this.f8();
if(op2>=0x80&&op2<=0x8F){const r=this.f32()|0;if(this.jcc(op2-0x80))this.eip=(this.eip+r)>>>0}
else if(op2>=0x90&&op2<=0x9F){this.dmodrm(as_);if(this.jcc(op2-0x90))this.sr(this._mr,this.grm(os),os)}
else if(op2>=0xB0&&op2<=0xBF){this.dmodrm(as_);this.srm(this.jcc(op2-0xB0)?1:0,1)}
else if(op2===0xAF){this.dmodrm(as_);const r=Math.imul(this.gr(this._mr,os)|0,this.grm(os)|0);this.sr(this._mr,r,os);const mk=os===1?0xFF:os===2?0xFFFF:0xFFFFFFFF;this.sf(CF,(r&~mk)!==0);this.sf(OF,(r&~mk)!==0)}
else if(op2===0xB6){this.dmodrm(as_);this.sr(this._mr,this.grm(1)&0xFF,os)}
else if(op2===0xB7){this.dmodrm(as_);this.sr(this._mr,this.grm(2)&0xFFFF,os)}
else if(op2===0xBE){this.dmodrm(as_);let v=this.grm(1);this.sr(this._mr,(v<<24)>>24,os)}
else if(op2===0xBF){this.dmodrm(as_);let v=this.grm(2);this.sr(this._mr,(v<<16)>>16,os)}
else if(op2===0xA0)this.push32(this.regs[4]);
else if(op2===0xA1)this.regs[4]=this.pop32()&0xFFFF;
else if(op2===0xA8)this.push32(this.regs[5]);
else if(op2===0xA9)this.regs[5]=this.pop32()&0xFFFF;
break}
default:break;
}}
run(n){for(let i=0;i<n&&!this.halted;i++)this.step()}
step(){
this._sov=-1;this._rp=0;let os=4,as_=4;
let loop=true;
while(loop){const b=this.f8();switch(b){case 0xF0:break;case 0xF2:this._rp=0xF2;break;case 0xF3:this._rp=0xF3;break;case 0x66:os=2;break;case 0x67:as_=2;break;case 0x26:case 0x2E:case 0x36:case 0x3E:case 0x64:case 0x65:this._sov=SEG_OV[b];break;default:this.eip--;loop=false;break}}
this.dispatch(this.f8(),os,as_);
}
}

const IS_APK=TYPE==="apk";
const DALVIK_INSNS_SIZE=${runtime.dalvikInsnsSize ?? 0};
const DALVIK_REGS_SIZE=${runtime.dalvikRegistersSize ?? 16};
const DALVIK_INS_SIZE=${runtime.dalvikInsSize ?? 1};
const DALVIK_B64="${dalvikBytecodeB64}";
const DEX_STRINGS=${dexStringsJson};
const DEX_METHODS=${dexMethodsJson};

let cpu=new X86();
let surfPixels=new Uint8Array(SURF_W*SURF_H*4);

let prog, tex, vao;
function initGL(){
  const vs=\`#version 300 es
  in vec2 aP;in vec2 aT;out vec2 vT;
  void main(){gl_Position=vec4(aP,0,1);vT=aT;}\`;
  const fs=\`#version 300 es
  precision highp float;in vec2 vT;out vec4 fc;uniform sampler2D uT;
  void main(){fc=texture(uT,vT);}\`;
  function cs(t,s){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh}
  const v=cs(gl.VERTEX_SHADER,vs),f=cs(gl.FRAGMENT_SHADER,fs);
  prog=gl.createProgram();gl.attachShader(prog,v);gl.attachShader(prog,f);gl.linkProgram(prog);
  vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0,1,1,-1,1,1,-1,1,0,0,1,1,1,0]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,16,0);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,16,8);
  gl.bindVertexArray(null);
  tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SURF_W,SURF_H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}

function renderFrame(){
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,SURF_W,SURF_H,gl.RGBA,gl.UNSIGNED_BYTE,surfPixels);
  gl.useProgram(prog);gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.uniform1i(gl.getUniformLocation(prog,'uT'),0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.bindVertexArray(null);
}

// ---- Minimal Dalvik interpreter for APK export ----
class DalvikVM{
constructor(){this.regs=new Int32Array(256);this.fRegs=new Float64Array(256);this.pc=0;this.code=new Uint8Array(0);this.heap=new Map();this.nextObj=1;this.lastResult=0;this.lastResultF=0;this.methodTable=new Map();this.stringPool=new Map();this.apiMethods=new Map();
for(let i=0;i<DEX_METHODS.length;i++){const m=DEX_METHODS[i];const insns=b64ToU8(m.insnsB64);this.methodTable.set(m.methodIdx,{insns,insnsSize:m.insnsSize,insSize:m.insSize,regsSize:m.registersSize,name:m.methodName});if(m.methodName)this.apiMethods.set(m.methodName,m.methodIdx);
}
this._registerAPIs();
this._viewY=0; // auto-layout cursor for views
}
// Pixel-level rendering helpers for the embedded DalvikVM
_drawText(x,y,text,color){
const font8=this._font;if(!font8)return;
const r=(color>>16)&0xff,g=(color>>8)&0xff,b=color&0xff;
for(let i=0;i<text.length;i++){const g2=font8[text.charCodeAt(i)];if(!g2)continue;const cx=x+i*8,cy=y;
for(let row=0;row<8;row++){const py=cy+row;if(py<0||py>=SURF_H)continue;for(let col=0;col<8;col++){const px=cx+col;if(px<0||px>=SURF_W)continue;if(g2[row]&(1<<(7-col))){const idx=(py*SURF_W+px)*4;surfPixels[idx]=r;surfPixels[idx+1]=g;surfPixels[idx+2]=b;surfPixels[idx+3]=255;}}}}}
}
_fillRect(x,y,w,h,color){
const r=(color>>16)&0xff,g=(color>>8)&0xff,b=color&0xff;
const sx=Math.max(0,x|0),sy=Math.max(0,y|0),ex=Math.min(SURF_W,(x+w)|0),ey=Math.min(SURF_H,(y+h)|0);
for(let row=sy;row<ey;row++){for(let col=sx;col<ex;col++){const idx=(row*SURF_W+col)*4;surfPixels[idx]=r;surfPixels[idx+1]=g;surfPixels[idx+2]=b;surfPixels[idx+3]=255;}}
}
_buildFont(){
const f=new Array(256);for(let c=0;c<256;c++){const g=new Uint8Array(8);if(c>=0x21&&c<=0x7e){const v=c-0x20;for(let row=0;row<8;row++){let bits=0;const shift=(row+v)&7;bits=((v<<shift)|(v>>(8-shift)))&0xff;if(row===7)bits|=0x7e;if(row>=1&&row<=6)bits|=(1<<((v+row)%8));g[row]=bits&0xfe;}}else if(c===0x20){}else{for(let row=1;row<7;row++)g[row]=0x7c;}f[c]=g;}return f;
}
_font=null;
_viewY=0;
_registerAPIs(){
this._font=this._buildFont();
const r=(name,fn)=>{const idx=this.apiMethods.get(name);if(idx!==undefined)this.methodTable.set(idx,{insns:new Uint8Array(0),insnsSize:0,insSize:1,regsSize:4,name,handler:fn});};
r('onCreate',(a)=>0);r('setContentView',(a)=>0);
r('findViewById',(a)=>{const id=this.nextObj++;this.heap.set(id,{id:a[1],x:0,y:this._viewY,w:SURF_W,h:48,bgColor:0xFF202020,textColor:0xFF8AB4F8});return id;});
r('setText',(a)=>{const o=this.heap.get(a[0]);if(o){const s=this.stringPool.get(a[1])||('res#'+a[1]);o.text=s;if(s&&o.x!==undefined)this._drawText(o.x+16,o.y+12,s,o.textColor||0xFF8AB4F8);}return 0;});
r('getText',(a)=>{const o=this.heap.get(a[0]);const s=o?.text||'';const id=this.nextObj++;this.heap.set(id,{type:'string',value:s});this.stringPool.set(id,s);return id;});
r('setVisibility',(a)=>0);r('invalidate',(a)=>0);r('requestLayout',(a)=>0);
r('getWidth',(a)=>SURF_W);r('getHeight',(a)=>SURF_H);
r('setBackgroundColor',(a)=>{const o=this.heap.get(a[0]);if(o){o.bgColor=a[1];if(o.x!==undefined)this._fillRect(o.x,o.y,o.w,o.h,a[1]);}return 0;});
r('setOnClickListener',(a)=>{const o=this.heap.get(a[0]);if(o)o.clickListener=a[1];return 0;});
r('addView',(a)=>0);r('setOrientation',(a)=>0);
r('d',(a)=>0);r('i',(a)=>0);r('w',(a)=>0);r('e',(a)=>0);r('v',(a)=>0);
r('getSystemService',(a)=>{const id=this.nextObj++;this.heap.set(id,{service:a[1]});return id;});
r('getResources',(a)=>{const id=this.nextObj++;this.heap.set(id,{type:'resources'});return id;});
r('getString',(a)=>{const s=this.stringPool.get(a[1])||('res#'+a[1]);const id=this.nextObj++;this.heap.set(id,{type:'string',value:s});this.stringPool.set(id,s);return id;});
r('getDisplayMetrics',(a)=>{const id=this.nextObj++;this.heap.set(id,{type:'displayMetrics',density:160,densityDpi:160,widthPixels:SURF_W,heightPixels:SURF_H});return id;});
r('getIntent',(a)=>{const id=this.nextObj++;this.heap.set(id,{});return id;});r('getActionBar',(a)=>{const id=this.nextObj++;this.heap.set(id,{});return id;});
r('putExtra',(a)=>a.length>2?a[2]:0);r('getStringExtra',(a)=>0);r('getIntExtra',(a)=>a.length>2?a[2]:0);
r('toString',(a)=>{const o=this.heap.get(a[0]);const s=o?JSON.stringify(o).substring(0,64):'Object';const id=this.nextObj++;this.heap.set(id,{type:'string',value:s});this.stringPool.set(id,s);return id;});
r('equals',(a)=>a[0]===a[1]?1:0);r('hashCode',(a)=>a[0]&0x7FFFFFFF);r('getClass',(a)=>{const id=this.nextObj++;this.heap.set(id,{type:'class'});return id;});
r('<init>',(a)=>a[0]);r('<clinit>',(a)=>0);
}
resolveString(idx){return DEX_STRINGS[idx]||'';}
allocObj(d){const id=this.nextObj++;this.heap.set(id,d);return id;}
getObj(id){return this.heap.get(id);}
setObjField(id,k,v){const o=this.heap.get(id);if(o)o[k]=v;}
step(op){
if(op===0x0E){this.pc+=2;return false;}
if(op===0x0F){const v=this.code[this.pc+1];this.lastResult=this.regs[v];this.lastResultF=this.lastResult;this.pc+=2;return false;}
if(op===0x10){const v=this.code[this.pc+1];this.lastResult=this.regs[v];this.lastResultF=this.fRegs[v];this.pc+=2;return false;}
if(op===0x11){const v=this.code[this.pc+1];this.lastResult=this.regs[v];this.lastResultF=this.lastResult;this.pc+=2;return false;}
this.exec(op);return true;
}
exec(op){
switch(op){
case 0x00:this.pc+=2;break;
case 0x01:{const b=this.code[this.pc+1];this.regs[b&0xF]=this.regs[(b>>4)&0xF];this.pc+=2;break;}
case 0x07:{const b=this.code[this.pc+1];this.regs[b&0xF]=this.regs[(b>>4)&0xF];this.pc+=2;break;}
case 0x0A:{const v=this.code[this.pc+1];this.regs[v]=this.lastResult;this.pc+=2;break;}
case 0x0B:{const v=this.code[this.pc+1];this.regs[v]=this.lastResult;this.fRegs[v]=this.lastResultF;this.pc+=2;break;}
case 0x0C:{const v=this.code[this.pc+1];this.regs[v]=this.lastResult;this.pc+=2;break;}
case 0x12:{const b=this.code[this.pc+1];let v=(b>>4)&0xF;if(v>7)v-=16;this.regs[b&0xF]=v;this.pc+=2;break;}
case 0x13:{const v=this.code[this.pc+1];let r=(this.code[this.pc+3]<<8)|this.code[this.pc+2];this.regs[v]=(r<<16)>>16;this.pc+=4;break;}
case 0x15:{const v=this.code[this.pc+1];this.regs[v]=((this.code[this.pc+3]<<8)|this.code[this.pc+2])<<16;this.pc+=4;break;}
case 0x1A:{const v=this.code[this.pc+1];const si=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const id=this.allocObj({type:'string',value:this.resolveString(si)});this.stringPool.set(id,this.resolveString(si));this.regs[v]=id;this.pc+=4;break;}
case 0x1C:{const v=this.code[this.pc+1];this.regs[v]=this.allocObj({type:'class'});this.pc+=4;break;}
case 0x1F:this.pc+=4;break;
case 0x20:{const b=this.code[this.pc+1];this.regs[b&0xF]=1;this.pc+=4;break;}
case 0x21:{const b=this.code[this.pc+1];const a=this.heap.get(this.regs[(b>>4)&0xF]);this.regs[b&0xF]=a?.length||0;this.pc+=2;break;}
case 0x22:{const v=this.code[this.pc+1];this.regs[v]=this.allocObj({});this.pc+=4;break;}
case 0x23:{const b=this.code[this.pc+1];const len=this.regs[(b>>4)&0xF];this.regs[b&0xF]=this.allocObj(new Array(len>0?len:0).fill(0));this.pc+=4;break;}
case 0x28:{const o=this.code[this.pc+1];const s=o>127?o-256:o;this.pc+=s*2;break;}
case 0x29:{const o=(this.code[this.pc+2]<<8)|this.code[this.pc+1];this.pc+=(o>32767?o-65536:o)*2;break;}
case 0x32:{const b=this.code[this.pc+1];const o=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const s=o>32767?o-65536:o;if(this.regs[b&0xF]===this.regs[(b>>4)&0xF])this.pc+=s*2;else this.pc+=4;break;}
case 0x33:{const b=this.code[this.pc+1];const o=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const s=o>32767?o-65536:o;if(this.regs[b&0xF]!==this.regs[(b>>4)&0xF])this.pc+=s*2;else this.pc+=4;break;}
case 0x34:{const b=this.code[this.pc+1];const o=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const s=o>32767?o-65536:o;if(this.regs[b&0xF]<this.regs[(b>>4)&0xF])this.pc+=s*2;else this.pc+=4;break;}
case 0x35:{const b=this.code[this.pc+1];const o=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const s=o>32767?o-65536:o;if(this.regs[b&0xF]>=this.regs[(b>>4)&0xF])this.pc+=s*2;else this.pc+=4;break;}
case 0x38:{const v=this.code[this.pc+1];const o=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const s=o>32767?o-65536:o;if(this.regs[v]===0)this.pc+=s*2;else this.pc+=4;break;}
case 0x39:{const v=this.code[this.pc+1];const o=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const s=o>32767?o-65536:o;if(this.regs[v]!==0)this.pc+=s*2;else this.pc+=4;break;}
case 0x3A:{const v=this.code[this.pc+1];const o=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const s=o>32767?o-65536:o;if(this.regs[v]<0)this.pc+=s*2;else this.pc+=4;break;}
case 0x3C:{const v=this.code[this.pc+1];const o=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const s=o>32767?o-65536:o;if(this.regs[v]>0)this.pc+=s*2;else this.pc+=4;break;}
case 0x44:{const v=this.code[this.pc+1];const bb=this.code[this.pc+2];const cc=this.code[this.pc+3];const a=this.heap.get(this.regs[bb]);this.regs[v]=a?.[this.regs[cc]]||0;this.pc+=4;break;}
case 0x4B:{const v=this.code[this.pc+1];const bb=this.code[this.pc+2];const cc=this.code[this.pc+3];const a=this.heap.get(this.regs[bb]);if(a)a[this.regs[cc]]=this.regs[v];this.pc+=4;break;}
case 0x52:case 0x54:{const b=this.code[this.pc+1];const o=this.heap.get(this.regs[(b>>4)&0xF])||{};this.regs[b&0xF]=o.field||0;this.pc+=4;break;}
case 0x59:case 0x5B:{const b=this.code[this.pc+1];let o=this.heap.get(this.regs[(b>>4)&0xF]);if(!o){o={};this.heap.set(this.regs[(b>>4)&0xF],o);}o.field=this.regs[b&0xF];this.pc+=4;break;}
case 0x60:case 0x62:{this.regs[this.code[this.pc+1]]=0;this.pc+=4;break;}
case 0x67:case 0x69:{this.pc+=4;break;}
case 0x6E:case 0x6F:case 0x70:case 0x71:case 0x72:{
const b2=this.code[this.pc+1];const ac=(b2>>4)&0xF;const mi=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const args=[];
if(ac>=1)args.push(this.regs[this.code[this.pc+4]&0xF]);
if(ac>=2)args.push(this.regs[(this.code[this.pc+4]>>4)&0xF]);
if(ac>=3)args.push(this.regs[this.code[this.pc+5]&0xF]);
if(ac>=4)args.push(this.regs[(this.code[this.pc+5]>>4)&0xF]);
if(ac>=5)args.push(this.regs[this.code[this.pc+6]&0xF]);
const m=this.methodTable.get(mi);
if(m){if(m.handler){const r=m.handler(args);this.lastResult=r;this.lastResultF=r;}else if(m.insns.length>0){this.callMethod(m,args);}}
this.pc+=6;break;}
case 0x73:case 0x74:case 0x75:case 0x76:case 0x77:{
const b2=this.code[this.pc+1];const ac=(b2>>4)&0xF;const mi=(this.code[this.pc+3]<<8)|this.code[this.pc+2];const c=this.code[this.pc+4]|(this.code[this.pc+5]<<8);const args=[];
for(let i=0;i<ac;i++)args.push(this.regs[(c>>(i*4))&0xF]);
const m=this.methodTable.get(mi);
if(m){if(m.handler){const r=m.handler(args);this.lastResult=r;this.lastResultF=r;}else if(m.insns.length>0){this.callMethod(m,args);}}
this.pc+=6;break;}
case 0x7B:{const b=this.code[this.pc+1];this.regs[b&0xF]=-this.regs[(b>>4)&0xF];this.pc+=2;break;}
case 0x90:{const v=this.code[this.pc+1];this.regs[v]=this.regs[this.code[this.pc+2]]+this.regs[this.code[this.pc+3]];this.pc+=4;break;}
case 0x91:{const v=this.code[this.pc+1];this.regs[v]=this.regs[this.code[this.pc+2]]-this.regs[this.code[this.pc+3]];this.pc+=4;break;}
case 0x92:{const v=this.code[this.pc+1];this.regs[v]=Math.imul(this.regs[this.code[this.pc+2]],this.regs[this.code[this.pc+3]]);this.pc+=4;break;}
case 0x93:{const v=this.code[this.pc+1];const d=this.regs[this.code[this.pc+3]];this.regs[v]=d?Math.floor(this.regs[this.code[this.pc+2]]/d):0;this.pc+=4;break;}
case 0x95:{const v=this.code[this.pc+1];this.regs[v]=this.regs[this.code[this.pc+2]]&this.regs[this.code[this.pc+3]];this.pc+=4;break;}
case 0x96:{const v=this.code[this.pc+1];this.regs[v]=this.regs[this.code[this.pc+2]]|this.regs[this.code[this.pc+3]];this.pc+=4;break;}
case 0x97:{const v=this.code[this.pc+1];this.regs[v]=this.regs[this.code[this.pc+2]]^this.regs[this.code[this.pc+3]];this.pc+=4;break;}
case 0xB0:{const b=this.code[this.pc+1];this.regs[b&0xF]+=this.regs[(b>>4)&0xF];this.pc+=2;break;}
case 0xB1:{const b=this.code[this.pc+1];this.regs[b&0xF]-=this.regs[(b>>4)&0xF];this.pc+=2;break;}
case 0xB2:{const b=this.code[this.pc+1];this.regs[b&0xF]=Math.imul(this.regs[b&0xF],this.regs[(b>>4)&0xF]);this.pc+=2;break;}
case 0xD0:{const b=this.code[this.pc+1];let l=(this.code[this.pc+3]<<8)|this.code[this.pc+2];l=l>32767?l-65536:l;this.regs[b&0xF]=this.regs[(b>>4)&0xF]+l;this.pc+=4;break;}
case 0xD8:{const v=this.code[this.pc+1];let l=this.code[this.pc+3];l=l>127?l-256:l;this.regs[v]=this.regs[this.code[this.pc+2]]+l;this.pc+=4;break;}
case 0x05:{const v=this.code[this.pc+1];const w=(this.code[this.pc+3]<<8)|this.code[this.pc+2];this.fRegs[v]=this.fRegs[w];this.fRegs[v+1]=this.fRegs[w+1];this.pc+=4;break;}
case 0x16:{const v=this.code[this.pc+1];const l=(this.code[this.pc+3]<<8)|this.code[this.pc+2];this.fRegs[v]=l/65536;this.pc+=4;break;}
case 0x82:{const b=this.code[this.pc+1];this.fRegs[b&0xF]=this.regs[(b>>4)&0xF];this.pc+=2;break;}
case 0x83:{const b=this.code[this.pc+1];this.regs[b&0xF]=this.fRegs[(b>>4)&0xF]|0;this.pc+=2;break;}
case 0xA0:{const v=this.code[this.pc+1];this.fRegs[v]=this.fRegs[this.code[this.pc+2]]+this.fRegs[this.code[this.pc+3]];this.pc+=4;break;}
case 0xA1:{const v=this.code[this.pc+1];this.fRegs[v]=this.fRegs[this.code[this.pc+2]]-this.fRegs[this.code[this.pc+3]];this.pc+=4;break;}
case 0xA2:{const v=this.code[this.pc+1];this.fRegs[v]=this.fRegs[this.code[this.pc+2]]*this.fRegs[this.code[this.pc+3]];this.pc+=4;break;}
case 0xC0:{const b=this.code[this.pc+1];this.fRegs[b&0xF]+=this.fRegs[(b>>4)&0xF];this.pc+=2;break;}
case 0xC1:{const b=this.code[this.pc+1];this.fRegs[b&0xF]-=this.fRegs[(b>>4)&0xF];this.pc+=2;break;}
case 0xC2:{const b=this.code[this.pc+1];this.fRegs[b&0xF]*=this.fRegs[(b>>4)&0xF];this.pc+=2;break;}
// --- Size-correct stubs for multi-byte opcodes (prevent PC alignment corruption) ---
case 0x02:this.pc+=4;break;  // move/from16 (4 bytes)
case 0x06:this.pc+=6;break;  // move-wide/16 (6 bytes)
case 0x09:this.pc+=6;break;  // move-object/16 (6 bytes)
case 0x08:this.pc+=4;break;  // move-object/from16 (4 bytes)
case 0x0D:this.pc+=2;break;  // move-exception (2 bytes)
case 0x14:this.pc+=6;break;  // const/32 (6 bytes)
case 0x17:case 0x18:this.pc+=10;break;  // const-wide (10 bytes)
case 0x19:this.pc+=4;break;  // const-wide/high16 (4 bytes)
case 0x1B:this.pc+=6;break;  // const-string/jumbo (6 bytes)
case 0x1D:case 0x1E:this.pc+=2;break;  // monitor-enter/exit (2 bytes)
case 0x24:case 0x25:this.pc+=6;break;  // filled-new-array (6 bytes)
case 0x26:this.pc+=6;break;  // fill-array-data (6 bytes)
case 0x2A:this.pc+=6;break;  // goto/32 (6 bytes)
case 0x2B:case 0x2C:this.pc+=4;break;  // packed/sparse-switch (4 bytes)
case 0x2D:case 0x2E:case 0x2F:case 0x30:case 0x31:this.pc+=4;break;  // cmpl/cmpg-float (4 bytes)
case 0x36:case 0x37:this.pc+=4;break;  // if-gt/le (4 bytes)
case 0x3B:case 0x3D:this.pc+=4;break;  // if-gez/lez (4 bytes)
case 0x43:case 0x45:case 0x46:this.pc+=4;break;  // aget variants (4 bytes)
case 0x4C:case 0x4D:case 0x4E:case 0x4F:this.pc+=4;break;  // aput variants (4 bytes)
case 0x53:this.pc+=4;break;  // iget-wide (4 bytes)
case 0x5A:this.pc+=4;break;  // iput-wide (4 bytes)
case 0x61:case 0x63:this.pc+=4;break;  // sget-wide/object (4 bytes)
case 0x68:case 0x6A:this.pc+=4;break;  // sput-wide/object (4 bytes)
case 0x7C:case 0x7D:case 0x7E:case 0x7F:case 0x80:case 0x81:this.pc+=2;break;  // neg/not/neg-float variants (2 bytes)
case 0x84:case 0x85:case 0x86:case 0x87:case 0x88:case 0x89:case 0x8A:case 0x8B:case 0x8C:case 0x8D:case 0x8E:case 0x8F:this.pc+=2;break;  // int/float conversion (2 bytes)
case 0x94:case 0x98:case 0x99:case 0x9A:case 0x9B:case 0x9C:case 0x9D:case 0x9E:case 0x9F:this.pc+=4;break;  // rem/and/or/xor/shl/shr/ushr-int (4 bytes)
case 0xA3:case 0xA4:case 0xA5:case 0xA6:case 0xA7:case 0xA8:case 0xA9:case 0xAA:this.pc+=4;break;  // double arithmetic (4 bytes)
case 0xAB:case 0xAC:case 0xAD:case 0xAE:case 0xAF:this.pc+=4;break;  // double arithmetic /3addr (4 bytes)
case 0xB3:case 0xB4:case 0xB5:case 0xB6:case 0xB7:case 0xB8:case 0xB9:case 0xBA:this.pc+=2;break;  // div/rem/and/or/xor/shl/shr/ushr-int/2addr (2 bytes)
case 0xBB:case 0xBC:case 0xBD:case 0xBE:case 0xBF:this.pc+=2;break;  // double/2addr arithmetic (2 bytes)
case 0xC3:case 0xC4:case 0xC5:case 0xC6:case 0xC7:case 0xC8:case 0xC9:case 0xCA:case 0xCB:case 0xCC:case 0xCD:case 0xCE:case 0xCF:this.pc+=2;break;  // double/2addr arithmetic (2 bytes)
case 0xD1:case 0xD2:case 0xD3:case 0xD4:case 0xD5:case 0xD6:case 0xD7:this.pc+=4;break;  // /lit16 arithmetic (4 bytes)
case 0xD9:case 0xDA:case 0xDB:case 0xDC:case 0xDD:case 0xDE:case 0xDF:case 0xE0:case 0xE1:case 0xE2:this.pc+=4;break;  // /lit8 arithmetic (4 bytes)
case 0xF0:case 0xF1:case 0xF2:case 0xF3:case 0xF4:case 0xF5:case 0xF6:case 0xF7:case 0xF8:case 0xF9:case 0xFA:case 0xFB:case 0xFC:case 0xFD:case 0xFE:case 0xFF:this.pc+=2;break;  // extended opcodes (2 bytes, rarely used)
default:this.pc+=2;break;
}}
callMethod(m,args){
const sp=this.pc,sc=this.code,sr=new Int32Array(this.regs),sf=new Float64Array(this.fRegs),sl=this.lastResult,slf=this.lastResultF;
for(let i=0;i<args.length&&i<m.insSize;i++)this.regs[i]=args[i];
this.code=m.insns;this.pc=0;const mx=Math.min(m.insnsSize,10000);
for(let s=0;s<mx;s++){if(this.pc>=this.code.length)break;if(!this.step(this.code[this.pc]))break;}
this.pc=sp;this.code=sc;this.regs.set(sr);this.fRegs.set(sf);this.lastResult=sl;this.lastResultF=slf;
}
}
let dalvik=null;

let canvasClickHandler=null;
function boot(){
  if(IS_APK){
    statusEl.textContent='Loading APK...';
    const bc=b64ToU8(DALVIK_B64);
    dalvik=new DalvikVM();
    dalvik.code=bc;dalvik.pc=0;
    dalvik.regs[0]=1; // 'this' ref
    const pixBytes=b64ToU8(PIX_B64);
    surfPixels.set(pixBytes);
    // Add click handler for Android onClick dispatching
    canvasClickHandler=(e)=>{if(!dalvik)return;const r=canvas.getBoundingClientRect();const mx=((e.clientX-r.left)/r.width*SURF_W)|0;const my=((e.clientY-r.top)/r.height*SURF_H)|0;
    // Search heap for objects with clickListeners
    for(const[id,obj]of dalvik.heap){if(obj.clickListener!==undefined){if(obj.x!==undefined&&mx>=obj.x&&mx<=obj.x+obj.w&&my>=obj.y&&my<=obj.y+obj.h){const m=dalvik.methodTable.get(obj.clickListener);if(m){if(m.handler)m.handler([id]);else if(m.insns.length>0)dalvik.callMethod(m,[id]);}}}}};
    canvas.addEventListener('click',canvasClickHandler);
    statusEl.textContent='Running (Dalvik)';
  } else {
    statusEl.textContent='Loading memory...';
    const memBytes=b64ToU8(MEM_B64);
    cpu.load(memBytes);
    if(CPU_STATE){
      cpu.regs=new Int32Array(CPU_STATE.regs);
      cpu.eip=CPU_STATE.eip;
      cpu.eflags=CPU_STATE.eflags;
      cpu.segs=new Uint16Array(CPU_STATE.segs);
    } else {
      cpu.eip=ENTRY;
    }
    const pixBytes=b64ToU8(PIX_B64);
    surfPixels.set(pixBytes);
    statusEl.textContent='Running';
  }
}

let instructionsPerFrame=500000;
let framePacingBuffer=[];
let targetFrameTime=1000/60;

function adaptInstructions(frameDelta){
framePacingBuffer.push(frameDelta);
if(framePacingBuffer.length>30)framePacingBuffer.shift();
const avgDelta=framePacingBuffer.reduce((a,b)=>a+b,0)/framePacingBuffer.length;
const budgetMs=targetFrameTime*0.8;
if(avgDelta>targetFrameTime*1.5){instructionsPerFrame=Math.max(10000,(instructionsPerFrame*0.7)|0)}
else if(avgDelta<budgetMs){instructionsPerFrame=Math.min(2000000,(instructionsPerFrame*1.1)|0)}
return instructionsPerFrame;
}

function loop(){
  if(!paused){
    const now=performance.now();
    const delta=now-lastFrameTime;
    lastFrameTime=now;
    if(IS_APK&&dalvik){
      const mx=50000;
      for(let i=0;i<mx;i++){if(dalvik.pc>=dalvik.code.length)break;if(!dalvik.step(dalvik.code[dalvik.pc]))break;}
    } else if(!cpu.halted){
      const ips=adaptInstructions(delta);
      cpu.run(ips);
      if(cpu.halted) statusEl.textContent='Halted';
    }
  }
  renderFrame();
  frameCount++;
  const now=performance.now();
  if(now-lastFpsTime>=1000){fpsEl.textContent=frameCount+' FPS';frameCount=0;lastFpsTime=now}
  requestAnimationFrame(loop);
}

initGL();boot();loop();
<\/script>
</body>
</html>`;
  }

  /** Export APK runtime with embedded Dalvik interpreter + bytecode. */
  exportFromAPK(renderer: WebGL2Renderer, dalvikBytecode: Uint8Array, dalvikInsnsSize: number, dalvikRegistersSize: number, dalvikInsSize: number, dexStrings: string[], dexMethods: Array<{ methodIdx: number; insns: Uint8Array; insnsSize: number; insSize: number; registersSize: number; methodName: string }>, metadata: Record<string, string> = {}): string {
    const surface = renderer.getSurface();
    const runtime: ExportableRuntime = {
      type: 'apk',
      memory: new Uint8Array(0),
      surfacePixels: surface.pixels,
      surfaceWidth: surface.width,
      surfaceHeight: surface.height,
      entryPoint: 0,
      metadata,
      dalvikBytecode,
      dalvikInsnsSize,
      dalvikRegistersSize,
      dalvikInsSize,
      dexStrings,
      dexMethods,
    };
    return this.exportRuntime(runtime);
  }

  exportFromRenderer(renderer: WebGL2Renderer, memory: Uint8Array, type: 'apk' | 'exe', entryPoint: number, metadata: Record<string, string> = {}): string {
    const surface = renderer.getSurface();
    const runtime: ExportableRuntime = {
      type,
      memory,
      surfacePixels: surface.pixels,
      surfaceWidth: surface.width,
      surfaceHeight: surface.height,
      entryPoint,
      metadata,
    };
    return this.exportRuntime(runtime);
  }

  exportFromCPU(cpu: X86Interpreter, renderer: WebGL2Renderer, type: 'apk' | 'exe', metadata: Record<string, string> = {}): string {
    const surface = renderer.getSurface();
    const runtime: ExportableRuntime = {
      type,
      memory: new Uint8Array(cpu.mem.buffer),
      cpuState: {
        regs: new Int32Array(cpu.regs),
        eip: cpu.eip,
        eflags: cpu.eflags,
        segs: new Uint16Array(cpu.segs),
      },
      surfacePixels: surface.pixels,
      surfaceWidth: surface.width,
      surfaceHeight: surface.height,
      entryPoint: cpu.eip,
      metadata,
    };
    return this.exportRuntime(runtime);
  }

  downloadHTML(html: string, filename: string): void {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let result = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      result += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(result);
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
