import { supabase } from "./supabase";
import type { Prepared } from "./image";

export const IMAGE_BUCKET = "buydigital-product-images";
const publicBase = () => `${(import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ""}/storage/v1/object/public/${IMAGE_BUCKET}/`;
export const urlToPath = (url: string) => url.startsWith(publicBase()) ? url.slice(publicBase().length) : null;

// Uploads a prepared image to the public image bucket and returns its storage path.
export async function uploadImage(folder: string, p: Prepared): Promise<string> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${p.ext}`;
  const { error } = await supabase!.storage.from(IMAGE_BUCKET).upload(path, p.blob, { contentType: p.type, cacheControl: "31536000" });
  if (error) throw new Error("Upload failed. Please try again.");
  return path;
}
export const removeImageFile = (path: string | null) => path ? supabase!.storage.from(IMAGE_BUCKET).remove([path]) : Promise.resolve();
