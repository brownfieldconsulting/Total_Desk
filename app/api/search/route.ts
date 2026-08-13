import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);
  const like = `%${q}%`;

  const [customers, vehicles, repairs, invoices, parts] = await Promise.all([
    supabase
      .from("customers")
      .select("id, first_name, last_name, phone")
      .or(`first_name.ilike.${like},last_name.ilike.${like},phone.ilike.${like}`)
      .eq("is_archived", false)
      .limit(5),
    supabase
      .from("vehicles")
      .select("id, make, model, year, license_plate, vin")
      .or(`make.ilike.${like},model.ilike.${like},license_plate.ilike.${like},vin.ilike.${like}`)
      .limit(5),
    supabase
      .from("repair_orders")
      .select("id, ro_number, customer_concern, customers(first_name, last_name)")
      .ilike("customer_concern", like)
      .limit(5),
    supabase
      .from("invoices")
      .select("id, invoice_number, grand_total")
      .ilike("invoice_number", like)
      .limit(5),
    supabase
      .from("inventory")
      .select("id, part_number, description, quantity")
      .or(`part_number.ilike.${like},description.ilike.${like}`)
      .limit(5),
  ]);

  const results = [
    ...(customers.data ?? []).map((c) => ({
      group: "Customers", id: c.id,
      title: `${c.first_name} ${c.last_name}`, subtitle: c.phone ?? "",
      href: `/customers/${c.id}`,
    })),
    ...(vehicles.data ?? []).map((v) => ({
      group: "Vehicles", id: v.id,
      title: `${v.year ?? ""} ${v.make} ${v.model}`.trim(), subtitle: v.license_plate ?? v.vin ?? "",
      href: `/vehicles/${v.id}`,
    })),
    ...(repairs.data ?? []).map((r) => {
      const c = r.customers as { first_name?: string; last_name?: string } | null;
      return {
        group: "Repair Orders", id: r.id,
        title: `RO #${r.ro_number}`, subtitle: `${c?.first_name ?? ""} ${c?.last_name ?? ""} · ${r.customer_concern ?? ""}`.trim(),
        href: `/repairs/${r.id}`,
      };
    }),
    ...(invoices.data ?? []).map((i) => ({
      group: "Invoices", id: i.id,
      title: i.invoice_number, subtitle: `Total ${Number(i.grand_total).toFixed(2)}`,
      href: `/invoices/${i.id}`,
    })),
    ...(parts.data ?? []).map((p) => ({
      group: "Parts", id: p.id,
      title: `${p.part_number} · ${p.description}`, subtitle: `${Number(p.quantity)} in stock`,
      href: `/inventory`,
    })),
  ];

  return NextResponse.json(results);
}
