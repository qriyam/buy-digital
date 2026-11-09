// ToyyibPay server callback. It is UNSIGNED, so the callback body is treated as a hint only:
// we look up our own payment record, then ask ToyyibPay's API whether that bill was really paid.
import { serve, HttpError } from "../_shared/http.ts";
import { db } from "../_shared/db.ts";
import { getPaidTransaction } from "../_shared/toyyibpay.ts";
import { fulfilOrder } from "../_shared/fulfil.ts";

const audit = (action: string, id: string, details: unknown) =>
  db.from("admin_audit_logs").insert({ action, entity: "order", entity_id: id, details });

serve(async (req) => {
  let f: Record<string, string> = {};
  const raw = await req.text();
  try {
    f = (req.headers.get("content-type") ?? "").includes("json")
      ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
  } catch { throw new HttpError(400, "bad_payload"); }
  const billCode = String(f.billcode ?? f.billCode ?? "");
  if (!/^[A-Za-z0-9]{3,40}$/.test(billCode)) throw new HttpError(400, "bad_payload");

  // Log it (signature_valid stays false: there is no signature to check)
  await db.rpc("claim_payment_event", {
    p_provider: "toyyibpay", p_event: `${billCode}:${f.status ?? ""}:${f.transaction_time ?? f.refno ?? ""}`,
    p_payload: f, p_sig_ok: false,
  });

  // Only bills WE created. Unknown codes never trigger an outbound API call.
  const { data: payment } = await db.from("payments")
    .select("id,order_id,amount,currency").eq("provider", "toyyibpay").eq("provider_ref", billCode).maybeSingle();
  if (!payment) return { ok: true, ignored: "unknown_bill" };
  const { data: order } = await db.from("orders").select("id,order_number,status,total").eq("id", payment.order_id).single();
  if (!order) return { ok: true, ignored: "unknown_order" };

  const tx = await getPaidTransaction(billCode);
  if (!tx) return { ok: true, status: "not_paid_yet" };   // failed/pending: customer can retry on the same bill

  // Amount, currency and reference must match what we stored at checkout
  const expectedSen = Math.round(Number(payment.amount) * 100);
  const paidSen = Math.round(parseFloat(String(tx.billpaymentAmount ?? "")) * 100);
  if (paidSen !== expectedSen || expectedSen !== Math.round(Number(order.total) * 100) || payment.currency !== "MYR"
      || (tx.billExternalReferenceNo && tx.billExternalReferenceNo !== order.order_number)) {
    await audit("payment_mismatch", order.id, { reported: tx.billpaymentAmount, expected_sen: expectedSen });
    return { ok: false, reason: "mismatch" };
  }

  await db.from("payments").update({
    status: "succeeded", verified_at: new Date().toISOString(),
  }).eq("id", payment.id).neq("status", "succeeded");

  if (["cancelled", "failed", "refunded"].includes(order.status)) {   // paid after we gave up: human decision
    await audit("paid_after_cancel", order.id, { bill: billCode });
    return { ok: true, flagged: true };
  }

  const { data: moved } = await db.from("orders").update({ status: "paid" })
    .eq("id", order.id).in("status", ["pending_payment", "payment_processing"]).select("id");
  if (moved?.length) await db.from("order_events").insert({ order_id: order.id, status: "paid", message: "Payment verified." });

  await fulfilOrder(order.id);   // idempotent
  return { ok: true };
});
