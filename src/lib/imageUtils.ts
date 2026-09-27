/**
 * Browser-native replacements for the p5.js image calls the original
 * implementation used (loadImage, img.get(), img.loadPixels()).
 */

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Slices a source image into tilePixelSize x tilePixelSize squares.
 * Returns a 2D array (row-major) of small canvases, one per grid cell.
 */
export function sliceImageIntoTiles(
  img: HTMLImageElement,
  tilePixelSize: number
): HTMLCanvasElement[][] {
  const cols = Math.floor(img.width / tilePixelSize);
  const rows = Math.floor(img.height / tilePixelSize);

  const grid: HTMLCanvasElement[][] = [];

  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < cols; col++) {
      const canvas = document.createElement('canvas');
      canvas.width = tilePixelSize;
      canvas.height = tilePixelSize;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        img,
        col * tilePixelSize,
        row * tilePixelSize,
        tilePixelSize,
        tilePixelSize,
        0,
        0,
        tilePixelSize,
        tilePixelSize
      );
      grid[row][col] = canvas;
    }
  }

  return grid;
}

/**
 * Same rolling-hash approach as the original Tile.createHash(), just fed
 * from a canvas's ImageData instead of a p5.Image's .pixels array.
 */
export function hashCanvas(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixelDataString = Array.from(data).join(',');

  let hash = 0;
  for (let i = 0; i < pixelDataString.length; i++) {
    const char = pixelDataString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // force 32-bit int
  }
  return hash;
}

export function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/** Composites a grid of tile data URLs into one final output image and returns a data URL */
export async function composeOutputImage(
  tileImages: (string | null)[][],
  tilePixelSize: number
): Promise<string> {
  const rows = tileImages.length;
  const cols = tileImages[0]?.length ?? 0;

  const canvas = document.createElement('canvas');
  canvas.width = cols * tilePixelSize;
  canvas.height = rows * tilePixelSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const loaded = await Promise.all(
    tileImages.flatMap((row, y) =>
      row.map(
        (src, x) =>
          new Promise<void>((resolve) => {
            if (!src) return resolve();
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, x * tilePixelSize, y * tilePixelSize, tilePixelSize, tilePixelSize);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = src;
          })
      )
    )
  );
  void loaded;

  return canvas.toDataURL('image/png');
}

export function downloadDataURL(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadJSON(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
