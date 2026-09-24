/**
 * Turns a video (or photos) chosen by the user into a few small JPEG frames,
 * entirely in the browser: nothing but these images is uploaded. The AI then
 * reads the text shown on screen and recognises the places filmed.
 */
const MAX_WIDTH = 768;
const QUALITY = 0.72;

function drawToJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_WIDTH / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", QUALITY);
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("seek timeout")), 8000);
    video.onseeked = () => {
      clearTimeout(timer);
      resolve();
    };
    video.currentTime = time;
  });
}

export async function extractVideoFrames(file: File, count = 10): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video unreadable"));
    });
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      // Spread over the video, skipping the very first/last instants.
      await seek(video, Math.min(duration - 0.1, ((i + 0.5) / count) * duration));
      frames.push(drawToJpeg(video, video.videoWidth, video.videoHeight));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imageToFrame(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    return drawToJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

/** Videos give ~10 frames; photos / screenshots are used as they are (max 10). */
export async function filesToFrames(files: File[]): Promise<string[]> {
  const frames: string[] = [];
  for (const file of files) {
    if (frames.length >= 10) break;
    if (file.type.startsWith("video/")) frames.push(...(await extractVideoFrames(file, 10 - frames.length)));
    else if (file.type.startsWith("image/")) frames.push(await imageToFrame(file));
  }
  return frames.slice(0, 10);
}
