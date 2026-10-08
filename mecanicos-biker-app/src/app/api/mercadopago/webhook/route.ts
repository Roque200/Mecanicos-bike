import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mercadoPagoEnabled } from "@/lib/mercadopago";
import { confirmMercadoPagoPayment } from "@/lib/payments";

/**
 * Mercado Pago calls this URL after a payment event (Checkout Pro webhook).
 * It sends either `?type=payment&data.id=<id>` as query params or the same
 * shape in the JSON body, depending on the notification version — we accept both.
 */
export async function POST(request: NextRequest) {
  if (!mercadoPagoEnabled()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");

  if (!paymentId) {
    try {
      const body = await request.json();
      paymentId = body?.data?.id ?? body?.id ?? null;
    } catch {
      /* no JSON body */
    }
  }

  if ((topic && topic !== "payment") || !paymentId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const result = await confirmMercadoPagoPayment(String(paymentId));
    if (result === "paid") {
      revalidatePath("/admin/pedidos");
      revalidatePath("/admin/dashboard");
      revalidatePath("/tienda");
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    // Mercado Pago solo reintenta el aviso si NO recibe un 2xx. Antes aquí se
    // contestaba 200 aunque no se hubiera podido consultar el pago, así que
    // un pago aprobado podía quedarse para siempre como pedido pendiente.
    console.error("mercadopago webhook error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
