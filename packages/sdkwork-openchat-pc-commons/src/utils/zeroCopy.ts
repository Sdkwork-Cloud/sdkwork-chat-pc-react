


export interface TransferableData<T> {
  data: T;
  transferables: Transferable[];
}


export function createTransferableBuffer(
  source: ArrayBuffer | Uint8Array
): TransferableData<ArrayBuffer> {
  if (source instanceof Uint8Array) {
    const buffer = source.buffer as ArrayBuffer;
    return {
      data: buffer,
      transferables: [buffer],
    };
  }
  return {
    data: source,
    transferables: [source],
  };
}


export function stringToBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}


export function bufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}


export function createSharedBuffer(size: number): SharedArrayBuffer {
  return new SharedArrayBuffer(size);
}


export class ZeroCopyMessageQueue<T> {
  private queue: Array<{ data: T; transferables: Transferable[] }> = [];
  private sharedBuffer?: SharedArrayBuffer;
  private dataView?: DataView;

  constructor(sharedBufferSize?: number) {
    if (sharedBufferSize && typeof SharedArrayBuffer !== 'undefined') {
      this.sharedBuffer = new SharedArrayBuffer(sharedBufferSize);
      this.dataView = new DataView(this.sharedBuffer);
    }
  }

  
  enqueue(data: T, transferables: Transferable[] = []): void {
    this.queue.push({ data, transferables });
  }

  
  dequeue(): { data: T; transferables: Transferable[] } | undefined {
    return this.queue.shift();
  }

  
  dequeueAll(): { data: T; transferables: Transferable[] }[] {
    const items = [...this.queue];
    this.queue = [];
    return items;
  }

  
  writeToSharedBuffer(data: ArrayBuffer, offset: number = 0): boolean {
    if (!this.sharedBuffer || !this.dataView) return false;

    const source = new Uint8Array(data);
    const target = new Uint8Array(this.sharedBuffer, offset, source.length);
    target.set(source);

    return true;
  }

  
  readFromSharedBuffer(offset: number, length: number): ArrayBuffer | null {
    if (!this.sharedBuffer) return null;

    const source = new Uint8Array(this.sharedBuffer, offset, length);
    const result = new ArrayBuffer(length);
    new Uint8Array(result).set(source);

    return result;
  }

  
  get length(): number {
    return this.queue.length;
  }

  
  clear(): void {
    this.queue = [];
  }
}


export class ZeroCopyFileReader {
  private file: File;
  private chunkSize: number;

  constructor(file: File, chunkSize: number = 1024 * 1024) {
    this.file = file;
    this.chunkSize = chunkSize;
  }

  
  async *readChunks(): AsyncGenerator<TransferableData<ArrayBuffer>, void, unknown> {
    let offset = 0;

    while (offset < this.file.size) {
      const chunk = await this.file.slice(offset, offset + this.chunkSize).arrayBuffer();
      
      yield {
        data: chunk,
        transferables: [chunk],
      };

      offset += this.chunkSize;
    }
  }

  
  async readAll(): Promise<TransferableData<ArrayBuffer>> {
    const buffer = await this.file.arrayBuffer();
    return {
      data: buffer,
      transferables: [buffer],
    };
  }
}


export class ZeroCopyImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: ImageBitmapRenderingContext;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('bitmaprenderer')!;
  }

  
  async processImage(
    imageBuffer: ArrayBuffer,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      type?: string;
    } = {}
  ): Promise<Blob> {
    const { width, height, quality = 0.9, type = 'image/jpeg' } = options;

    const imageBitmap = await createImageBitmap(blob);

    this.canvas.width = width || imageBitmap.width;
    this.canvas.height = height || imageBitmap.height;


    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        type,
        quality
      );
    });
  }

  
  async createThumbnail(
    imageBuffer: ArrayBuffer,
    maxSize: number = 200
  ): Promise<Blob> {
    const blob = new Blob([imageBuffer]);
    const imageBitmap = await createImageBitmap(blob);

    const { width, height } = imageBitmap;
    const ratio = Math.min(maxSize / width, maxSize / height);

    return this.processImage(imageBuffer, {
      width: Math.floor(width * ratio),
      height: Math.floor(height * ratio),
      quality: 0.8,
      type: 'image/jpeg',
    });
  }
}


export function useOffscreenCanvas() {
  let offscreenCanvas: OffscreenCanvas | null = null;
  let worker: Worker | null = null;

  const init = (width: number, height: number) => {
    offscreenCanvas = new OffscreenCanvas(width, height);
    
    worker = new Worker(
      URL.createObjectURL(
        new Blob(
          [`
            self.onmessage = function(e) {
              const { canvas, data } = e.data;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = data.color;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              self.postMessage({ done: true }, [canvas]);
            };
          `],
          { type: 'application/javascript' }
        )
      )
    );

    return offscreenCanvas;
  };

  const render = (data: unknown) => {
    if (!offscreenCanvas || !worker) return;

    worker.postMessage(
      { canvas: offscreenCanvas, data },
      [offscreenCanvas]
    );
  };

  const destroy = () => {
    worker?.terminate();
    worker = null;
    offscreenCanvas = null;
  };

  return { init, render, destroy };
}


export function checkZeroCopySupport() {
  return {
    transferableObjects: typeof structuredClone === 'function',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    imageBitmap: typeof ImageBitmap !== 'undefined',
    arrayBufferTransfer: true, 
  };
}

export default {
  createTransferableBuffer,
  stringToBuffer,
  bufferToString,
  createSharedBuffer,
  ZeroCopyMessageQueue,
  ZeroCopyFileReader,
  ZeroCopyImageProcessor,
  checkZeroCopySupport,
};

