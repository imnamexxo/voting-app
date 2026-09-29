import { redirect } from "next/navigation";

// The Operator's page moved to /admin; keep old links working.
export default function OperatorPage() {
  redirect("/admin");
}
