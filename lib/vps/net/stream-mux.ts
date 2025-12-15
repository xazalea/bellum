import type { P2PNode } from '@/src/nacho/net/p2p_node';

export type StreamMode = 'tcp' | 'udp';

type FrameType = 1 | 2 | 3; // open, data, close

type StreamCallbacks = {
  onData?: (bytes: Uint8Array) => void;
  onClose?: () => void;
};

function u32(n: number) {
  return n >>> 0;
}

function encodeFrame(args: { type: FrameType; streamId: number; seq: number; mode: StreamMode; payload?: Uint8Array }): ArrayBuffer {
  const payload = args.payload || new Uint8Array(0);
  // Header: type(1) mode(1) reserved(2) streamId(4) seq(4) payloadLen(4) = 16 bytes
  const buf = new ArrayBuffer(16 + payload.byteLength);
  const dv = new DataView(buf);
  dv.setUint8(0, args.type);
  dv.setUint8(1, args.mode === 'tcp' ? 1 : 2);
  dv.setUint16(2, 0);
  dv.setUint32(4, u32(args.streamId));
  dv.setUint32(8, u32(args.seq));
  dv.setUint32(12, u32(payload.byteLength));
  new Uint8Array(buf, 16).set(payload);
  return buf;
}

function decodeFrame(buf: ArrayBuffer): { type: FrameType; mode: StreamMode; streamId: number; seq: number; payload: Uint8Array } | null {
  if (buf.byteLength < 16) return null;
  const dv = new DataView(buf);
  const type = dv.getUint8(0) as FrameType;
  const modeRaw = dv.getUint8(1);
  const mode: StreamMode = modeRaw === 1 ? 'tcp' : 'udp';
  const streamId = dv.getUint32(4);
  const seq = dv.getUint32(8);
  const len = dv.getUint32(12);
  if (16 + len > buf.byteLength) return null;
  const payload = new Uint8Array(buf.slice(16, 16 + len));
  return { type, mode, streamId, seq, payload };
}

class Stream {
  readonly peerId: string;
  readonly streamId: number;
  readonly mode: StreamMode;

  private node: P2PNode;
  private seq = 0;
  private closed = false;
  private callbacks: StreamCallbacks = {};

  // TCP ordering
  private expectSeq = 0;
  private pending = new Map<number, Uint8Array>();

  constructor(node: P2PNode, peerId: string, streamId: number, mode: StreamMode) {
    this.node = node;
    this.peerId = peerId;
    this.streamId = streamId;
    this.mode = mode;
  }

  onData(cb: (bytes: Uint8Array) => void) {
    this.callbacks.onData = cb;
  }

  onClose(cb: () => void) {
    this.callbacks.onClose = cb;
  }

  send(payload: Uint8Array) {
    if (this.closed) return;
    const f = encodeFrame({ type: 2, streamId: this.streamId, seq: this.seq++, mode: this.mode, payload });
    this.node.sendRaw(this.peerId, f);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    const f = encodeFrame({ type: 3, streamId: this.streamId, seq: this.seq++, mode: this.mode });
    this.node.sendRaw(this.peerId, f);
  }

  _deliver(frame: { type: FrameType; seq: number; payload: Uint8Array }) {
    if (frame.type === 3) {
      this.closed = true;
      this.callbacks.onClose?.();
      return;
    }
    if (frame.type !== 2) return;

    if (this.mode === 'udp') {
      this.callbacks.onData?.(frame.payload);
      return;
    }

    // TCP-like: deliver in seq order.
    if (frame.seq === this.expectSeq) {
      this.callbacks.onData?.(frame.payload);
      this.expectSeq += 1;
      while (this.pending.has(this.expectSeq)) {
        const next = this.pending.get(this.expectSeq)!;
        this.pending.delete(this.expectSeq);
        this.callbacks.onData?.(next);
        this.expectSeq += 1;
      }
      return;
    }
    if (frame.seq > this.expectSeq) this.pending.set(frame.seq, frame.payload);
  }
}

export class StreamMux {
  private node: P2PNode;
  private streams = new Map<string, Stream>(); // key: peerId:streamId

  constructor(node: P2PNode) {
    this.node = node;
    this.node.onRawMessage((data, from) => {
      const frame = decodeFrame(data);
      if (!frame) return;
      const key = `${from}:${frame.streamId}`;
      let s = this.streams.get(key);
      if (!s && frame.type === 1) {
        s = new Stream(this.node, from, frame.streamId, frame.mode);
        this.streams.set(key, s);
      }
      if (!s) return;
      s._deliver({ type: frame.type, seq: frame.seq, payload: frame.payload });
      if (frame.type === 3) this.streams.delete(key);
    });
  }

  open(peerId: string, mode: StreamMode): Stream {
    const streamId = Math.floor(Math.random() * 0xffffffff);
    const key = `${peerId}:${streamId}`;
    const s = new Stream(this.node, peerId, streamId, mode);
    this.streams.set(key, s);
    const f = encodeFrame({ type: 1, streamId, seq: 0, mode });
    this.node.sendRaw(peerId, f);
    return s;
  }
}

