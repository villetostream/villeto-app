import React from "react";
import { ShieldAlert } from "lucide-react";

interface PermissionDeniedFallbackProps {
    resource?: string;
    compact?: boolean;
    className?: string;
}

export function PermissionDeniedFallback({
    resource,
    compact = false,
    className = "",
}: PermissionDeniedFallbackProps) {
    const resourceName = resource ? ` ${resource}` : "";

    if (compact) {
        return (
            <div className={`flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 ${className}`}>
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Unable to load{resourceName} — insufficient permissions.</span>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg border border-gray-100 ${className}`}>
            <div className="w-12 h-12 mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
                Access Denied
            </h3>
            <p className="text-sm text-gray-500 max-w-sm">
                You don't have permission to view{resourceName}. Please contact your workspace administrator to request access.
            </p>
        </div>
    );
}
