import "server-only";
import fs from "fs";
import path from "path";

const NAVY = "#0B1D33";
const NAVY2 = "#16324F";
const MUTED = "#5A6B7A";
const ORANGE = "#F25C05";
const LINE = "#EDF1F5";

export interface InvoicePdfData {
  settings: {
    company_name: string;
    company_address: string;
    company_phone: string;
    company_email: string;
    currency: string;
  };
  invoice: {
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    status: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    grand_total: number;
    amount_paid: number;
    balance_due: number;
  };
  customer: { first_name: string; last_name: string; phone: string | null; email: string | null };
  vehicle: { year: number | null; make: string; model: string; license_plate: string | null } | null;
  items: { item_type: string; description: string; quantity: number; unit_price: number; line_total: number }[];
  payments: { payment_date: string; amount: number; method: string }[];
}

function money(n: number | string, currency: string) {
  const symbol = currency === "USD" ? "US$" : currency === "CAD" ? "CA$" : "A$";
  return `${symbol}${Number(n).toFixed(2)}`;
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");
  const { settings, invoice, customer, vehicle, items, payments } = data;
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const W = doc.page.width;
  const M = 46;

  // ---- Header band ----
  doc.rect(0, 0, W, 118).fill(NAVY2);
  try {
    const logoPath = path.join(process.cwd(), "public", "branding", "logo-transparent.png");
    if (fs.existsSync(logoPath)) doc.image(logoPath, M, 16, { width: 86 });
  } catch {
    /* logo optional */
  }
  doc.fillColor("#B8C4CE").fontSize(8.5).font("Helvetica");
  doc.text(settings.company_address, M + 100, 34);
  doc.text(settings.company_phone, M + 100, 46);
  doc.text(settings.company_email, M + 100, 58);

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(15);
  doc.text(invoice.invoice_number, 0, 34, { align: "right", width: W - M });
  doc.fillColor("#B8C4CE").font("Helvetica").fontSize(9);
  doc.text(
    `${fmtDate(invoice.invoice_date)}${invoice.due_date ? "  ·  Due " + fmtDate(invoice.due_date) : ""}`,
    0, 56, { align: "right", width: W - M }
  );
  doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(9);
  doc.text(invoice.status.replace("_", " ").toUpperCase(), 0, 72, { align: "right", width: W - M });

  // ---- Billed to / vehicle ----
  let y = 148;
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(7.5).text("BILLED TO", M, y, { characterSpacing: 1 });
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text(`${customer.first_name} ${customer.last_name}`, M, y + 12);
  doc.fillColor(MUTED).font("Helvetica").fontSize(9);
  if (customer.phone) doc.text(customer.phone, M, y + 27);
  if (customer.email) doc.text(customer.email, M, y + 39);

  if (vehicle) {
    const vx = 300;
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(7.5).text("VEHICLE", vx, y, { characterSpacing: 1 });
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11)
      .text(`${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}`.trim(), vx, y + 12);
    if (vehicle.license_plate)
      doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(`Plate ${vehicle.license_plate}`, vx, y + 27);
  }

  // ---- Items table ----
  y = 218;
  const col = { desc: M, qty: 350, price: 420, amount: 490 };
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(7.5);
  doc.text("DESCRIPTION", col.desc, y, { characterSpacing: 1 });
  doc.text("QTY", col.qty, y, { width: 50, align: "right" });
  doc.text("PRICE", col.price, y, { width: 55, align: "right" });
  doc.text("AMOUNT", col.amount, y, { width: W - M - col.amount, align: "right" });
  y += 13;
  doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1.5).strokeColor(NAVY2).stroke();
  y += 6;

  const groups: [string, typeof items][] = [
    ["LABOUR", items.filter((i) => i.item_type === "labour")],
    ["PARTS", items.filter((i) => i.item_type !== "labour")],
  ];

  for (const [label, group] of groups) {
    if (!group.length) continue;
    y += 8;
    doc.fillColor(ORANGE).font("Helvetica-Bold").fontSize(8).text(label, col.desc, y, { characterSpacing: 1.2 });
    y += 14;
    for (const item of group) {
      if (y > 700) {
        doc.addPage({ size: "A4", margin: 0 });
        y = 50;
      }
      doc.fillColor(NAVY).font("Helvetica").fontSize(9.5);
      doc.text(item.description, col.desc, y, { width: col.qty - col.desc - 12 });
      const rowH = Math.max(doc.heightOfString(item.description, { width: col.qty - col.desc - 12 }), 11);
      doc.text(String(Number(item.quantity)), col.qty, y, { width: 50, align: "right" });
      doc.text(money(item.unit_price, settings.currency), col.price, y, { width: 55, align: "right" });
      doc.font("Helvetica-Bold").text(money(item.line_total, settings.currency), col.amount, y, {
        width: W - M - col.amount, align: "right",
      });
      y += rowH + 4;
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(LINE).stroke();
      y += 5;
    }
  }

  // ---- Totals ----
  y += 14;
  const tx = 360;
  const tw = W - M - tx;
  function totalRow(label: string, value: string, opts?: { bold?: boolean; color?: string }) {
    doc.fillColor(opts?.color ?? MUTED).font(opts?.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5);
    doc.text(label, tx, y);
    doc.text(value, tx, y, { width: tw, align: "right" });
    y += 16;
  }
  totalRow("Subtotal", money(invoice.subtotal, settings.currency));
  totalRow(`Tax (${Number(invoice.tax_rate)}%)`, money(invoice.tax_amount, settings.currency));
  doc.roundedRect(tx - 10, y - 3, tw + 20, 24, 5).fill(NAVY);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11);
  doc.text("Total Due", tx, y + 2);
  doc.text(money(invoice.grand_total, settings.currency), tx, y + 2, { width: tw, align: "right" });
  y += 30;
  if (Number(invoice.amount_paid) > 0) {
    totalRow("Paid", `-${money(invoice.amount_paid, settings.currency)}`);
    totalRow("Balance", money(invoice.balance_due, settings.currency), { bold: true, color: "#C2410C" });
  }

  // ---- Payments ----
  if (payments.length) {
    y += 8;
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(7.5).text("PAYMENTS RECEIVED", M, y, { characterSpacing: 1 });
    y += 13;
    doc.font("Helvetica").fontSize(9).fillColor(NAVY);
    for (const p of payments) {
      doc.text(`${fmtDate(p.payment_date)}  ·  ${p.method.replace("_", " ")}  ·  ${money(p.amount, settings.currency)}`, M, y);
      y += 13;
    }
  }

  // ---- Footer ----
  doc.fillColor(MUTED).font("Helvetica").fontSize(8);
  doc.text(
    `Thank you for your business  ·  ${settings.company_name}  ·  ${settings.company_address}  ·  ${settings.company_phone}`,
    M, 790, { width: W - M * 2, align: "center" }
  );

  doc.end();
  return done;
}
