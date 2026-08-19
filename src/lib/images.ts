import imageCompression from "browser-image-compression";

export interface PreparedImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1600;
const MAX_SIZE_MB = 1.2;

/**
 * Shrinks a photo in the browser before it is uploaded. Field conditions mean a
 * slow connection, and a 6 MB phone photo is not worth sending as-is.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: MAX_DIMENSION,
    maxSizeMB: MAX_SIZE_MB,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.82,
  });

  const previewUrl = URL.createObjectURL(compressed);
  const { width, height } = await readDimensions(previewUrl);

  return { file: compressed, previewUrl, width, height };
}

function readDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    // A failed probe should not block the upload; fall back to unknown size.
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = url;
  });
}
