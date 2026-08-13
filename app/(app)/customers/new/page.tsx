import { requireRole } from "@/lib/auth";
import { CustomerForm } from "@/components/customer-form";

export default async function NewCustomerPage() {
  await requireRole("owner", "employee");
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Add Customer</h1>
      <CustomerForm />
    </div>
  );
}
