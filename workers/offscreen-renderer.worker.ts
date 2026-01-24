type InitMessage = {
  type: 'INIT';
  canvas: OffscreenCanvas;
};

type FrameMessage = {
  type: 'FRAME';
  bitmap: ImageBitmap;
};

type WorkerMessage = InitMessage | FrameMessage;

let ctx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === 'INIT') {
    ctx = message.canvas.getContext('2d', { alpha: false });
    return;
  }
  if (message.type === 'FRAME' && ctx) {
    ctx.drawImage(message.bitmap, 0, 0);
    message.bitmap.close();
  }
};
