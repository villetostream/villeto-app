"use client"

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import FormSectionHeader from "@/components/dashboard/people/FormSectionHeader";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight } from "iconsax-reactjs";
import { logger } from "@/lib/logger";
import withPermissions from "@/components/permissions/permission-protected-routes";

function BulkInvite() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        // Handle bulk invite
        logger.log("File:", file);
        router.push("/people");
    };

    const requiredFields = [
        { name: "Email Address", description: "User's corporate email address" },
        { name: "First Name", description: "User's first name" },
        { name: "Last Name", description: "User's last name" },
        { name: "Department", description: "User's department" },
        { name: "Location", description: "User's official location" },
        { name: "Role", description: "User's role in the company" },
        { name: "Manager", description: "User's assigned manager/team lead" },
        { name: "Phone Number", description: "User's phone number (optional)" },
    ];

    return (
        <div className="flex min-h-screen flex-col">


            <main className="flex-1 p-8">
                <div className=" space-y-10">
                    <div className="flex items-center gap-4">
                        <FormSectionHeader title="Bulk Invite Users" description="Choose an option to invite multiple users to Villeto" />
                    </div>

                    <div className="space-y-6">
                        <div className="">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-base font-medium">Bulk User Import</h3>
                                <Button variant="ghost" className="gap-2 text-primary p-0 hover:bg-transparent">
                                    <Download className="h-4 w-4" />
                                    Download a Template
                                </Button>
                            </div>

                            <div className="rounded-lg border-2 border-dashed bg-muted/50 p-12 text-center">
                                <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                                    <HugeiconsIcon icon={CloudUploadIcon} className="size-10 text-muted-foreground" />

                                    <div className="space-y-2">
                                        <h4 className="font-medium font-sm leading-[125%]">Upload CSV or Excel File</h4>
                                        <p className="text-xs leading-[125%] text-muted-foreground">
                                            Upload a file with user information to invite multiple users at once
                                        </p>
                                    </div>
                                    <Button variant={"ghost"} className="border-muted-foreground border mt-6" onClick={() => document.getElementById("file-upload")?.click()}>
                                        Browse File
                                    </Button>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    {file && (
                                        <p className="text-sm text-muted-foreground">
                                            Selected: {file.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border p-6">
                            <h3 className="mb-4 text-lg font-semibold">Required Fields</h3>
                            <div className="grid gap-6 md:grid-cols-4">
                                {requiredFields.map((field) => (
                                    <div key={field.name}>
                                        <div className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground" />
                                            <div className="space-y-0.5">
                                                <p className="font-medium text-xs">{field.name}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {field.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <h3 className="text-base font-medium">Upload File to Send Invites</h3>

                        <div className="rounded-lg border-2 border-dashed p-8 text-center">
                            <p className="text-muted-foreground">
                                Upload a file to see the preview of users to be invited
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="link" onClick={() => router.push("/people")}>
                                Cancel
                            </Button>
                            <Button
                                size={"md"}
                                onClick={handleSubmit}
                                disabled={!file}
                                className="!px-12"
                            >
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default withPermissions(BulkInvite, [
  { resource: "user", action: "manage" },
]);