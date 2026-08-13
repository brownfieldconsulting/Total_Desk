import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { buildInvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!["owner", "employee"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { type: string; invoiceId?: string };
  if (!body.invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: invoice }, { data: settings }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(first_name, last_name, phone, email), vehicles(year, make, model, license_plate)")
      .eq("id", body.invoiceId)
      .single(),
    supabase.from("settings").select("*").eq("id", 1).single(),
  ]);
  if (!invoice || !settings) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const customer = invoice.customers as { first_name: string; last_name: string; email: string | null; phone: string | null };
  if (!customer.email) return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", body.invoiceId).order("sort_order"),
    supabase.from("payments").select("*").eq("invoice_id", body.invoiceId).order("payment_date"),
  ]);

  const isReminder = body.type === "payment_reminder";
  const subject = isReminder
    ? `Payment reminder — Invoice ${invoice.invoice_number}`
    : `Invoice ${invoice.invoice_number} — ${settings.company_name}`;

  const balance = Number(invoice.balance_due).toFixed(2);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#152435">
      <div style="background:#16324F;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h2 style="color:#fff;margin:0">${settings.company_name}</h2>
        <p style="color:#B8C4CE;margin:6px 0 0;font-size:13px">${settings.company_address} · ${settings.company_phone}</p>
      </div>
      <div style="border:1px solid #E3E9EF;border-top:0;padding:24px;border-radius:0 0 12px 12px">
        <p>Hi ${customer.first_name},</p>
        <p>${
          isReminder
            ? `This is a friendly reminder that invoice <b>${invoice.invoice_number}</b> has an outstanding balance of <b>${settings.currency} ${balance}</b>.`
            : `Please find attached invoice <b>${invoice.invoice_number}</b> for <b>${settings.currency} ${Number(invoice.grand_total).toFixed(2)}</b>.`
        }</p>
        <p>If you have any questions, reply to this email or call us on ${settings.company_phone}.</p>
        <p style="margin-top:20px">Thank you,<br><b>${settings.company_name}</b></p>
      </div>
    </div>`;

  const pdf = await buildInvoicePdf({
    settings,
    invoice,
    customer,
    vehicle: invoice.vehicles as never,
    items: items ?? [],
    payments: payments ?? [],
  });

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const emailType = isReminder ? "payment_reminder" : "invoice";
  try {
    const { data, error } = await resend.emails.send({
      from: `${settings.company_name} <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`,
      to: customer.email,
      replyTo: settings.company_email,
      subject,
      html,
      attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdf }],
    });
    await supabase.from("email_logs").insert({
      recipient: customer.email,
      subject,
      email_type: emailType,
      invoice_id: invoice.id,
      status: error ? "failed" : "sent",
      provider_id: data?.id ?? null,
      error: error?.message ?? null,
      sent_by: profile.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed";
    await supabase.from("email_logs").insert({
      recipient: customer.email,
      subject,
      email_type: emailType,
      invoice_id: invoice.id,
      status: "failed",
      error: message,
      sent_by: profile.id,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
