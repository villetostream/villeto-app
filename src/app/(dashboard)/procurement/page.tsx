import { redirect } from "next/navigation";

/**
 * The /procurement root URL has no sidebar entry and is never linked to from the UI.
 * All procurement navigation goes directly to sub-pages (purchase-request, purchase-order,
 * confirmation, categories). Redirect to the most natural entry point.
 */
export default function ProcurementPage() {
  redirect("/procurement/purchase-request");
}