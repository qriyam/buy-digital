// Prepares a photo picked from the phone/computer gallery: validates it, shrinks it, and re-encodes it (WebP when the browser can,
// otherwise JPEG, or PNG when transparency must be kept). Keeps uploads fast and well under the storage size limit.
export type Prepared = { blob: Blob; ext: string; type: string; preview: string };
type Opts = { maxDim?: number; maxBytes?: number; keepAlpha?: boolean };

export async function prepareImage(file: File, { maxDim = 1600, maxBytes = 1_800_000, keepAlpha = false }: Opts = {}): Promise<Prepared> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") throw new Error("Please choose a photo (JPG, PNG or WebP).");
  if (file.size > 25_000_000) throw new Error("That image is too large (max 25 MB).");
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("This image format can't be read. Try a JPG, PNG or WebP photo."); }
  const canvas = document.createElement("canvas");
  const encode = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  const draw = (scale: number) => {
    canvas.width = Math.max(1, Math.round(bmp.width * scale)); canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext("2d")!; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  };
  let scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  draw(scale);
  let type = "image/webp", blob = await encode(type, 0.85);
  if (!blob || blob.type !== "image/webp") { type = keepAlpha ? "image/png" : "image/jpeg"; blob = await encode(type, 0.85); }
  let q = 0.85;
  while (blob && blob.size > maxBytes && (q > 0.45 || type === "image/png")) {
    if (type === "image/png") { scale *= 0.8; draw(scale); } else { q -= 0.15; }
    blob = await encode(type, q);
  }
  bmp.close();
  if (!blob || blob.size > maxBytes * 1.5) throw new Error("Could not shrink that image enough. Try a smaller photo.");
  return { blob, type, ext: type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg", preview: URL.createObjectURL(blob) };
}
