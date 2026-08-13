import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { CustomerForm } from "@/components/customer-form";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("owner", "employee");
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!customer) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Edit Customer</h1>
      <CustomerForm customer={customer} />
    </div>
  );
}
