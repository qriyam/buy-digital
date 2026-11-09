// Inventory codes are stored AES-256-GCM encrypted. A keyed hash (HMAC) detects duplicates without storing plaintext.
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (u: ArrayBuffer) => [...new Uint8Array(u)].map((x) => x.toString(16).padStart(2, "0")).join("");

let aes: CryptoKey | undefined, mac: CryptoKey | undefined;
async function aesKey() {
  if (!aes) {
    const raw = unb64(Deno.env.get("BUYDIGITAL_INVENTORY_ENC_KEY") ?? "");
    if (raw.length !== 32) throw new Error("BUYDIGITAL_INVENTORY_ENC_KEY must be 32 bytes, base64");
    aes = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  return aes;
}
async function macKey() {
  if (!mac) {
    const k = Deno.env.get("BUYDIGITAL_INVENTORY_HASH_KEY");
    if (!k || k.length < 32) throw new Error("BUYDIGITAL_INVENTORY_HASH_KEY too short");
    mac = await crypto.subtle.importKey("raw", new TextEncoder().encode(k), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  }
  return mac;
}
export async function encryptCode(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(plain)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64(out);
}
export async function decryptCode(enc: string): Promise<string> {
  const buf = unb64(enc);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, await aesKey(), buf.slice(12));
  return new TextDecoder().decode(pt);
}
export async function hashCode(plain: string): Promise<string> {
  return hex(await crypto.subtle.sign("HMAC", await macKey(), new TextEncoder().encode(plain)));
}
