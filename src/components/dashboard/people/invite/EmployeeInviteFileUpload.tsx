"use client";

import { UploadCloud, Download } from "lucide-react";
import React, { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";

interface EmployeeInviteFileUploadProps {
    onFileSelect: (file: File) => void;
    accept?: Record<string, string[]>;
    maxSize?: number; // in bytes
}

export default function EmployeeInviteFileUpload({
    onFileSelect,
    accept = {
        "text/csv": [".csv"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        "application/vnd.ms-excel": [".xls"]
    },
    maxSize = 5 * 1024 * 1024 // 5MB default
}: EmployeeInviteFileUploadProps) {
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
        setError(null);

        if (fileRejections.length > 0) {
            const rejection = fileRejections[0];
            if (rejection.errors[0]?.code === "file-too-large") {
                setError(`File too large. Maximum ${Math.round(maxSize / 1024 / 1024)} MB.`);
            } else {
                setError("File type not supported. Please upload CSV or Excel.");
            }
            return;
        }

        if (acceptedFiles.length > 0) {
            onFileSelect(acceptedFiles[0]);
        }
    }, [maxSize, onFileSelect]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept,
        maxSize,
        multiple: false,
        noClick: true
    });

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-5 border-b border-black/[0.06] pb-4">
                <h1 className="text-[20px] font-semibold text-[#0b100e] leading-tight tracking-[-0.02em]">
                    Upload Your Organisation Directory
                </h1>
                <p className="text-[13px] text-[#66706b] mt-1.5 leading-relaxed">
                    Add your team members to your organisation before sending invitations. Directory setup is separate from account activation.
                </p>
            </div>

            {/* Download template */}
            <div className="flex justify-end mb-3">
                <a
                    href="/Template.csv"
                    download="Template.csv"
                    data-tour="download-template-link"
                    className="inline-flex items-center gap-1.5 text-[13px] text-[#087f70] hover:text-[#065f55] font-semibold transition-colors py-1"
                >
                    <Download className="h-3.5 w-3.5" />
                    Download Template
                </a>
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                data-tour="csv-upload-zone"
                className={`
                    border-2 border-dashed rounded-[14px] py-10 px-6 text-center transition-all duration-200 ease-in-out
                    flex flex-col items-center justify-center gap-4
                    ${isDragActive
                        ? "border-[#0ea894] bg-[#e7f6f2]/60 shadow-[inset_0_0_0_1px_rgba(14,168,148,0.2)]"
                        : "border-[#0ea894]/25 bg-[#f9faf9] hover:border-[#0ea894]/50 hover:bg-[#e7f6f2]/20"
                    }
                `}
            >
                <input {...getInputProps()} />

                <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center transition-colors ${isDragActive ? "bg-[#e7f6f2]" : "bg-white border border-black/[0.08]"}`}>
                    <UploadCloud className={`w-6 h-6 transition-colors ${isDragActive ? "text-[#0ea894]" : "text-[#84908a]"}`} strokeWidth={1.7} />
                </div>

                <div className="space-y-1">
                    <h3 className="text-[15px] font-semibold text-[#0b100e]">
                        {isDragActive ? "Drop your file here" : "Upload CSV or Excel File"}
                    </h3>
                    <p className="text-[13px] text-[#66706b] max-w-xs">
                        Drag and drop your file, or click Browse to select it from your computer
                    </p>
                </div>

                <Button
                    variant="outline"
                    className="h-[42px] rounded-[10px] border-[#0ea894]/40 text-[#087f70] hover:bg-[#e7f6f2] hover:border-[#0ea894]/60 text-[13px] font-semibold px-6 transition-all"
                    onClick={open}
                >
                    Browse File
                </Button>

                <p className="text-[11px] text-[#84908a]">CSV, XLS, XLSX up to {Math.round(maxSize / 1024 / 1024)} MB</p>

                {error && (
                    <p className="text-[12px] text-red-500 flex items-center gap-1.5 bg-red-50 rounded-[8px] px-3 py-2 border border-red-200/60">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}