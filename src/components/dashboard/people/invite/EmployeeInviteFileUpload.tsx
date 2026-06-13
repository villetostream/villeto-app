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
        noClick: true // We'll handle click with a button
    });

    return (
        <div className="w-full">
            <div className="mb-4 border-b border-gray-200 pb-3">
                <h1 className="text-2xl font-bold text-gray-900">Upload Your Organization Directory</h1>
                <p className="text-gray-500 mt-1">
                    Add your team members to your organization before sending invitations. This separate directory <br /> setup from account activation.
                </p>
            </div>
                        
            <div className="flex justify-end mb-2">
                <a
                    href="/Template.csv"
                    download="Template.csv"
                    data-tour="download-template-link"
                    className="inline-flex items-center gap-1.5 text-sm text-[#00BFA5] hover:underline font-medium py-2"
                >
                    <Download className="h-4 w-4" /> Download a Template
                </a>
            </div>
            <div
                {...getRootProps()}
                data-tour="csv-upload-zone"
                className={`
                    border-2 border-dashed rounded-lg py-6 px-6 text-center transition-all duration-200 ease-in-out
                    flex flex-col items-center justify-center gap-3
                    ${isDragActive ? "border-primary bg-primary/10" : "border-primary/40 bg-white"}
                `}
            >
                <input {...getInputProps()} />
                
                <div className="bg-gray-100 p-3 rounded-full">
                    <UploadCloud className="w-7 h-7 text-gray-500" />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900">Upload CSV or Excel File</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                    Upload a file with user information to invite multiple users at once
                </p>
                
                <Button 
                    variant="outline" 
                    className="mt-4 border-primary text-primary hover:bg-primary/10 min-w-[140px]"
                    onClick={open}
                >
                    Browse File
                </Button>

                {error && (
                    <p className="text-sm text-red-500 mt-2">{error}</p>
                )}
            </div>
            
          
        </div>
    );
}