"use client";

import { UploadCloud, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import React, { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface EmployeeInviteFileUploadProps {
    onFileSelect: (file: File) => void;
    accept?: Record<string, string[]>;
    maxSize?: number; // in bytes
    /** Called when user wants to download template. Pass a fn that receives "csv" | "xlsx". If not provided, falls back to a static file link. */
    onDownloadTemplate?: (format: "csv" | "xlsx", mode: "blank" | "current_directory") => void;
}

export default function EmployeeInviteFileUpload({
    onFileSelect,
    accept = {
        "text/csv": [".csv"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        "application/vnd.ms-excel": [".xls"],
    },
    maxSize = 60 * 1024 * 1024, // 60MB
    onDownloadTemplate,
}: EmployeeInviteFileUploadProps) {
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const onDrop = useCallback(
        (acceptedFiles: File[], fileRejections: FileRejection[]) => {
            setError(null);
            setSelectedFile(null);

            if (fileRejections.length > 0) {
                const rejection = fileRejections[0];
                if (rejection.errors[0]?.code === "file-too-large") {
                    setError(`File too large. Maximum ${Math.round(maxSize / 1024 / 1024)} MB.`);
                } else {
                    setError("File type not supported. Please upload CSV or Excel (.xlsx / .xls).");
                }
                return;
            }

            if (acceptedFiles.length > 0) {
                setSelectedFile(acceptedFiles[0]);
                onFileSelect(acceptedFiles[0]);
            }
        },
        [maxSize, onFileSelect]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept,
        maxSize,
        multiple: false,
        noClick: true,
    });

    /** Handle download template — either call the prop or fall back to static file */
    const handleDownload = (format: "csv" | "xlsx", mode: "blank" | "current_directory") => {
        if (onDownloadTemplate) {
            onDownloadTemplate(format, mode);
            return;
        }
        // Fallback: link to static files in /public
        const href = format === "xlsx" ? "/employee-import-template.xlsx" : "/Template.csv";
        const a = document.createElement("a");
        a.href = href;
        a.download = format === "xlsx" ? "employee-import-template.xlsx" : "employee-import-template.csv";
        a.click();
    };

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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            data-tour="download-template-link"
                            className="inline-flex items-center gap-1.5 text-[13px] text-[#087f70] hover:text-[#065f55] font-semibold transition-colors py-1 outline-none"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" />
                            </svg>
                            Download Template
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[200px] rounded-[10px] p-1 shadow-lg border border-black/[0.08]">
                        <DropdownMenuLabel className="text-xs font-semibold text-gray-500 px-2 py-1.5">Blank Template</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => handleDownload("xlsx", "blank")}
                            className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] cursor-pointer hover:bg-[#f0faf8]"
                        >
                            <FileSpreadsheet className="size-4 text-[#217346] shrink-0" />
                            <span className="font-medium text-[#0b100e]">Excel (.xlsx)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDownload("csv", "blank")}
                            className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] cursor-pointer hover:bg-[#f0faf8]"
                        >
                            <FileText className="size-4 text-[#087f70] shrink-0" />
                            <span className="font-medium text-[#0b100e]">CSV (.csv)</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-semibold text-gray-500 px-2 py-1.5">Current Directory</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => handleDownload("xlsx", "current_directory")}
                            className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] cursor-pointer hover:bg-[#f0faf8]"
                        >
                            <FileSpreadsheet className="size-4 text-[#217346] shrink-0" />
                            <span className="font-medium text-[#0b100e]">Excel (.xlsx)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDownload("csv", "current_directory")}
                            className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] cursor-pointer hover:bg-[#f0faf8]"
                        >
                            <FileText className="size-4 text-[#087f70] shrink-0" />
                            <span className="font-medium text-[#0b100e]">CSV (.csv)</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                data-tour="csv-upload-zone"
                className={`
                    border-2 border-dashed rounded-[14px] py-10 px-6 text-center transition-all duration-200 ease-in-out
                    flex flex-col items-center justify-center gap-4
                    ${
                        isDragActive
                            ? "border-[#0ea894] bg-[#e7f6f2]/60 shadow-[inset_0_0_0_1px_rgba(14,168,148,0.2)]"
                            : selectedFile
                            ? "border-[#0ea894]/60 bg-[#e7f6f2]/20"
                            : "border-[#0ea894]/25 bg-[#f9faf9] hover:border-[#0ea894]/50 hover:bg-[#e7f6f2]/20"
                    }
                `}
            >
                <input {...getInputProps()} />

                <div
                    className={`w-14 h-14 rounded-[14px] flex items-center justify-center transition-colors ${
                        isDragActive || selectedFile
                            ? "bg-[#e7f6f2]"
                            : "bg-white border border-black/[0.08]"
                    }`}
                >
                    <UploadCloud
                        className={`w-6 h-6 transition-colors ${
                            isDragActive || selectedFile ? "text-[#0ea894]" : "text-[#84908a]"
                        }`}
                        strokeWidth={1.7}
                    />
                </div>

                <div className="space-y-1">
                    {selectedFile ? (
                        <>
                            <h3 className="text-[15px] font-semibold text-[#0b100e]">
                                {selectedFile.name}
                            </h3>
                            <p className="text-[13px] text-[#087f70]">
                                {(selectedFile.size / 1024).toFixed(1)} KB — file loaded, parsing…
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-[15px] font-semibold text-[#0b100e]">
                                {isDragActive ? "Drop your file here" : "Upload CSV or Excel File"}
                            </h3>
                            <p className="text-[13px] text-[#66706b] max-w-xs">
                                Drag and drop your file, or click Browse to select it from your computer
                            </p>
                        </>
                    )}
                </div>

                {!selectedFile && (
                    <Button
                        variant="outline"
                        className="h-[42px] rounded-[10px] border-[#0ea894]/40 text-[#087f70] hover:bg-[#e7f6f2] hover:border-[#0ea894]/60 text-[13px] font-semibold px-6 transition-all"
                        onClick={open}
                    >
                        Browse File
                    </Button>
                )}

                <p className="text-[11px] text-[#84908a]">
                    CSV, XLS, XLSX · up to {Math.round(maxSize / 1024 / 1024)} MB
                </p>

                {error && (
                    <p className="text-[12px] text-red-500 flex items-center gap-1.5 bg-red-50 rounded-[8px] px-3 py-2 border border-red-200/60">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}