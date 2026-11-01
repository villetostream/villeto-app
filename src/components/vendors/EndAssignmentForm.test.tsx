import { renderToStaticMarkup } from "react-dom/server";
import { Dialog } from "@/components/ui/dialog";
import { describe, expect, it } from "vitest";
import { EndAssignmentForm } from "./EndAssignmentForm";
import type {
  EndingRelationship,
  EndingSiteAssignment,
} from "./end-site-assignment";

const assignment: EndingSiteAssignment = {
  vendorEntitySiteAssignmentId: "ending",
  purpose: "purchasing",
  status: "active",
  effectiveFrom: null,
  effectiveTo: null,
  site: { status: "active", name: "Lagos" },
};
const relationship: EndingRelationship = {
  purchasingEnabled: true,
  status: "approved",
  legalEntity: { displayName: "Acme", legalName: "Acme Ltd" },
  siteAssignments: [assignment],
};
function render(value: EndingRelationship) {
  return renderToStaticMarkup(
    <Dialog open>
      <EndAssignmentForm
        state={{ relationship: value, assignment }}
        submitting={false}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    </Dialog>,
  );
}

describe("EndAssignmentForm", () => {
  it("explains the hold and names the combined action before submission", () => {
    const html = render(relationship);
    expect(html).toContain("End the last purchasing assignment?");
    expect(html).toContain("last purchasing assignment for Acme");
    expect(html).toContain("The vendor relationship will remain approved.");
    expect(html).toContain(
      "Invoicing, payment settings, and historical transactions will stay unchanged.",
    );
    expect(html).toContain("End assignment and put purchasing on hold");
    expect(html).toContain('disabled=""');
  });
  it("retains the ordinary end action when a hold is unnecessary", () => {
    const html = render({ ...relationship, purchasingEnabled: false });
    expect(html).toContain("End site assignment");
    expect(html).not.toContain("End assignment and put purchasing on hold");
  });
  it("does not promise approval for a suspended relationship", () => {
    const html = render({ ...relationship, status: "suspended" });
    expect(html).toContain(
      "The vendor relationship status will stay unchanged.",
    );
    expect(html).not.toContain("will remain approved");
  });
});
