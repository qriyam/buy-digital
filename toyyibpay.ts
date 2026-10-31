// ToyyibPay adapter. VERIFY field names against https://toyyibpay.com/apireference/ in the sandbox first.
// Sandbox: https://dev.toyyibpay.com   Live: https://toyyibpay.com
const host = () => Deno.env.get("TOYYIBPAY_SANDBOX") === "true" ? "https://dev.toyyibpay.com" : "https://toyyibpay.com";

export type Tx = {
  billpaymentStatus: string | number;     // 1 = success, 2/4 = pending, 3 = failed
  billpaymentAmount?: string | number;    // assumed RM (e.g. "26.90"); confirm in sandbox
  billExternalReferenceNo?: string;
  billpaymentInvoiceNo?: string;
};

export async function createBill(p: {
  name: string; email: string; phone: string; amountSen: number; description: string;
  reference: string; callbackUrl: string; returnUrl: string;
}): Promise<{ billCode: string; url: string }> {
  const body = new URLSearchParams({
    userSecretKey: Deno.env.get("TOYYIBPAY_SECRET_KEY")!,
    categoryCode: Deno.env.get("TOYYIBPAY_CATEGORY_CODE")!,
    billName: "BuyDigital order",                         // max 30 chars
    billDescription: p.description.slice(0, 100),
    billPriceSetting: "1",                                // fixed amount
    billPayorInfo: "0",                                   // we already know the customer
    billAmount: String(p.amountSen),                      // ToyyibPay amounts are in sen
    billReturnUrl: p.returnUrl,
    billCallbackUrl: p.callbackUrl,
    billExternalReferenceNo: p.reference,
    billTo: p.name, billEmail: p.email, billPhone: p.phone,
    billPaymentChannel: Deno.env.get("TOYYIBPAY_PAYMENT_CHANNEL") ?? "0",  // 0 = FPX, 1 = card, 2 = both
  });
  const r = await fetch(`${host()}/index.php/api/createBill`, { method: "POST", body });
  const j = await r.json().catch(() => null);
  const code = Array.isArray(j) ? j[0]?.BillCode : undefined;
  if (!r.ok || !code) throw new Error(`toyyibpay createBill failed: ${JSON.stringify(j)}`);
  return { billCode: code, url: `${host()}/${code}` };
}

// Returns the successful transaction for a bill, or null. This is the ONLY thing we trust,
// because ToyyibPay callbacks are not signed.
export async function getPaidTransaction(billCode: string): Promise<Tx | null> {
  const body = new URLSearchParams({ billCode, billpaymentStatus: "1" });
  const r = await fetch(`${host()}/index.php/api/getBillTransactions`, { method: "POST", body });
  if (!r.ok) throw new Error(`toyyibpay getBillTransactions ${r.status}`);
  const j = await r.json().catch(() => null);
  if (!Array.isArray(j)) return null;
  return (j as Tx[]).find((t) => String(t.billpaymentStatus) === "1") ?? null;
}
