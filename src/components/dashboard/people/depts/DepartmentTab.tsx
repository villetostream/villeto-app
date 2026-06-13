import DepartmentTable from "./DeptartmentTable";

const _departments = [
    { name: "Finance", code: "FIN", description: "Manages budgets, invoices, and reimbursements.", head: "Finance Manager", reportsTo: "CO", dateCreated: "15 Sept 2025" },
    { name: "Marketing", code: "MKT", description: "Oversees campaigns, branding, and promotions.", head: "Marketing Lead", reportsTo: "Dept. Manager", dateCreated: "15 Sept 2025" },
    { name: "Engineering", code: "ENG", description: "Develops and maintains technical systems.", head: "Tech Lead", reportsTo: "CO", dateCreated: "12 Oct 2025" },
    { name: "Human Resources", code: "HR", description: "Recruitment, onboarding, and employee relations.", head: "HR Manager", reportsTo: "CO", dateCreated: "15 Sept 2025" },
    { name: "Procurement", code: "FIN", description: "Manages budgets, invoices, and reimbursements.", head: "Procurement Officer", reportsTo: "CO", dateCreated: "15 Sept 2025" },
    { name: "Operations", code: "OPS", description: "Logistics, processes, and facility management.", head: "Operations Lead", reportsTo: "Fin. Manager", dateCreated: "15 Sept 2025" },
    { name: "Compliance", code: "CMP", description: "Ensures adherence to company & financial policies.", head: "Compliance Officer", reportsTo: "CO", dateCreated: "15 Sept 2025" },
    { name: "Customer Support", code: "SUP", description: "Manages client inquiries and resolutions.", head: "Support Lead", reportsTo: "Operations Lead", dateCreated: "15 Sept 2025" },
];

export const DepartmentsTab = () => {
    return (
        <div className="space-y-4">
            <DepartmentTable />
        </div>
    );
};