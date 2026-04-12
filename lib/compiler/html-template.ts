export interface EmbeddedAssetMap {
  [key: string]: {
    data: string;
    algorithm: string;
    originalSize: number;
  };
}

export function buildSelfExtractingHtml(assets: EmbeddedAssetMap): string {
  const assetJson = JSON.stringify(assets);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bellum Export</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
canvas{width:100%;height:100%;display:block}
#hud{position:fixed;top:8px;right:8px;font:11px monospace;color:#555;pointer-events:none;z-index:9}
#boot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#333;font:12px monospace;background:#000;z-index:10}
#boot.done{display:none}
</style>
</head>
<body>
<div id="boot">initializing...</div>
<canvas id="c"></canvas>
<div id="hud"></div>
<script>
const ASSETS=${assetJson};

async function decodeBase64(b64){
  const bin=atob(b64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return bytes.buffer;
}

async function decompress(algorithm,buffer){
  if(algorithm==='none'||algorithm===''||!buffer.byteLength) return buffer;
  try{
    const ds=new DecompressionStream('deflate');
    const writer=ds.writable.getWriter();
    const reader=ds.readable.getReader();
    writer.write(new Uint8Array(buffer));
    writer.close();
    const chunks=[];
    let totalLen=0;
    while(true){
      const{value,done}=await reader.read();
      if(done) break;
      chunks.push(value);
      totalLen+=value.length;
    }
    const out=new Uint8Array(totalLen);
    let off=0;
    for(const ch of chunks){out.set(ch,off);off+=ch.length;}
    return out.buffer;
  }catch(e){
    console.warn('decompress fail, using raw',e);
    return buffer;
  }
}

async function loadAsset(key){
  const a=ASSETS[key];
  if(!a) return null;
  const raw=await decodeBase64(a.data);
  return decompress(a.algorithm,raw);
}

function readU32(d,o){return d.getUint32(o,true)}
function readU16(d,o){return d.getUint16(o,true)}
function readU8(d,o){return d.getUint8(o)}
function readS32(d,o){return d.getInt32(o,true)}
function readS16(d,o){return d.getInt16(o,true)}

class DEXReader{
  constructor(buf){
    this.buf=buf;
    this.dv=new DataView(buf);
    this.u8=new Uint8Array(buf);
    this.strings=[];
    this.types=[];
    this.fields=[];
    this.methods=[];
    this.classes=[];
  }
  parse(){
    const d=this.dv;
    const magic=String.fromCharCode(...new Uint8Array(this.buf,0,8));
    if(!magic.startsWith('dex')) throw new Error('Not a DEX file: '+magic);
    const strSize=readU32(d,0x38);
    const strOff=readU32(d,0x3C);
    const typeSize=readU32(d,0x40);
    const typeOff=readU32(d,0x44);
    const methSize=readU32(d,0x58);
    const methOff=readU32(d,0x5C);
    const clsSize=readU32(d,0x60);
    const clsOff=readU32(d,0x64);
    for(let i=0;i<strSize;i++){
      const off=readU32(d,strOff+i*4);
      this.strings.push(this.readString(off));
    }
    for(let i=0;i<typeSize;i++){
      this.types.push(this.strings[readU32(d,typeOff+i*4)]);
    }
    for(let i=0;i<methSize;i++){
      const base=methOff+i*8;
      this.methods.push({
        classType:this.types[readU16(d,base)],
        proto:readU32(d,base+2),
        name:this.strings[readU32(d,base+4)]
      });
    }
    for(let i=0;i<clsSize;i++){
      const base=clsOff+i*32;
      this.classes.push({
        type:this.types[readU32(d,base)],
        access:readU32(d,base+4),
        superClass:readU32(d,base+8)===0xFFFFFFFF?null:this.types[readU32(d,base+8)],
        classDataOff:readU32(d,base+24)
      });
    }
    return this;
  }
  readString(off){
    const u=this.u8;
    let sz=0;let b=u[off];
    while((b&0x80)!==0){sz=((b&0x7f)<<7)|sz;off++;b=u[off];}
    sz=(b<<7)|sz;
    off++;
    let s='';
    for(let i=0;i<sz;){
      const c=u[off++];
      if(c===0) break;
      if(c<0x80){s+=String.fromCharCode(c);i++;}
      else if(c<0xe0){s+=String.fromCharCode(((c&0x1f)<<6)|(u[off++]&0x3f));i++;}
      else{s+=String.fromCharCode(((c&0x0f)<<12)|((u[off++]&0x3f)<<6)|(u[off++]&0x3f));i++;}
    }
    return s;
  }
}

class DalvikVM{
  constructor(dex,cvs){
    this.dex=dex;
    this.cvs=cvs;
    this.ctx=cvs.getContext('2d');
    this.regs=new Int32Array(65536);
    this.heap=new Map();
    this.nextId=1;
    this.strings=dex.strings;
    this.pc=0;
    this.insns=null;
    this.running=false;
    this.fps=0;
    this.frameCount=0;
    this.lastFpsTime=0;
    this.canvasWidth=0;
    this.canvasHeight=0;
    this.initCanvas();
  }
  initCanvas(){
    this.cvs.width=this.cvs.clientWidth*window.devicePixelRatio||800;
    this.cvs.height=this.cvs.clientHeight*window.devicePixelRatio||600;
    this.canvasWidth=this.cvs.width;
    this.canvasHeight=this.cvs.height;
    this.ctx.fillStyle='#000';
    this.ctx.fillRect(0,0,this.canvasWidth,this.canvasHeight);
  }
  alloc(obj){
    const id=this.nextId++;
    this.heap.set(id,obj);
    return id;
  }
  findMainClass(){
    for(const cls of this.dex.classes){
      if(cls.superClass&&cls.superClass.includes('Activity')) return cls;
    }
    return this.dex.classes[0]||null;
  }
  async boot(){
    const mainCls=this.findMainClass();
    if(!mainCls) throw new Error('No Activity class found');
    this.running=true;
    this.lastFpsTime=performance.now();
    this.renderLoop();
  }
  renderLoop(){
    if(!this.running) return;
    this.frameCount++;
    const now=performance.now();
    if(now-this.lastFpsTime>=1000){
      this.fps=this.frameCount;
      this.frameCount=0;
      this.lastFpsTime=now;
      document.getElementById('hud').textContent=this.fps+' FPS';
    }
    requestAnimationFrame(()=>this.renderLoop());
  }
  stop(){
    this.running=false;
  }
}

async function boot(){
  const bootEl=document.getElementById('boot');
  const cvs=document.getElementById('c');
  bootEl.textContent='loading assets...';
  const appData=await loadAsset('appBinary');
  if(!appData){bootEl.textContent='error: no app data';return;}
  bootEl.textContent='parsing DEX...';
  let dexBuf=appData;
  const magic=new Uint8Array(dexBuf,0,4);
  const isZip=String.fromCharCode(...magic)==='PK';
  if(isZip){
    try{
      const entries=new Map();
      const dv=new DataView(dexBuf);
      let off=dexBuf.byteLength;
      for(let i=dv.byteLength-22;i>=0;i--){
        if(dv.getUint32(i,true)===0x06054b50){off=dv.getUint32(i+16,true);break;}
      }
      while(off<dv.byteLength-4){
        const sig=dv.getUint32(off,true);
        if(sig!==0x02014b50) break;
        const nameLen=dv.getUint16(off+28,true);
        const extraLen=dv.getUint16(off+30,true);
        const commentLen=dv.getUint16(off+32,true);
        const compSize=dv.getUint32(off+20,true);
        const localOff=dv.getUint32(off+42,true);
        const flags=dv.getUint16(off+8,true);
        const method=dv.getUint16(off+10,true);
        const nameBytes=new Uint8Array(dexBuf,localOff+30,dv.getUint16(localOff+26,true));
        let name='';
        for(let j=0;j<nameBytes.length;j++) name+=String.fromCharCode(nameBytes[j]);
        const dataOff=localOff+30+dv.getUint16(localOff+26,true)+dv.getUint16(localOff+28,true);
        if(name==='classes.dex'){
          if(method===8){
            const raw=new Uint8Array(dexBuf,dataOff,compSize);
            const ds=new DecompressionStream('deflate');
            const w=ds.writable.getWriter();
            const r=ds.readable.getReader();
            w.write(raw);w.close();
            const chunks=[];let total=0;
            while(true){const{value,done}=await r.read();if(done)break;chunks.push(value);total+=value.length;}
            const out=new Uint8Array(total);let o2=0;
            for(const ch of chunks){out.set(ch,o2);o2+=ch.length;}
            dexBuf=out.buffer;
          } else {
            dexBuf=dexBuf.slice(dataOff,dataOff+compSize);
          }
          break;
        }
        off+=46+nameLen+extraLen+commentLen;
      }
    }catch(e){console.error('ZIP parse error',e);}
  }
  try{
    const dex=new DEXReader(dexBuf).parse();
    bootEl.textContent='booting vm ('+dex.classes.length+' classes)...';
    const vm=new DalvikVM(dex,cvs);
    await vm.boot();
    bootEl.classList.add('done');
  }catch(e){
    bootEl.textContent='error: '+(e.message||e);
    bootEl.style.color='#666';
  }
}
boot();
<\/script>
</body>
</html>`;
}
