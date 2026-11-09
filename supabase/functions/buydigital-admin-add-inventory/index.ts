// Admin-only bulk upload of codes for a variant. Plaintext never touches the database.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { requireAdmin, audit } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";
import { encryptCode, hashCode } from "../_shared/crypto.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const me = await requireAdmin(req);
  const body = await readJson<{ variant_id?: string; codes?: string[] }>(req, 500_000);
  if (!UUID.test(String(body.variant_id))) throw new HttpError(400, "invalid_variant");
  const codes = [...new Set((body.codes ?? []).map((c) => String(c).trim()).filter(Boolean))];
  if (!codes.length || codes.length > 500 || codes.some((c) => c.length > 500)) throw new HttpError(400, "invalid_codes");

  const { data: v } = await db.from("product_variants").select("id,products!inner(delivery_method)").eq("id", body.variant_id).maybeSingle();
  if (!v || (v as any).products.delivery_method !== "license_key") throw new HttpError(422, "variant_not_license_key");

  const rows = await Promise.all(codes.map(async (c) => ({ variant_id: body.variant_id, code_encrypted: await encryptCode(c), code_hash: await hashCode(c) })));
  const { data, error } = await db.from("inventory_items").upsert(rows, { onConflict: "code_hash", ignoreDuplicates: true }).select("id");
  if (error) throw error;
  const added = data?.length ?? 0;
  await audit(me.uid, "add_inventory", "variant", body.variant_id!, { submitted: codes.length, added });
  return { submitted: codes.length, added, duplicates: codes.length - added };
});
