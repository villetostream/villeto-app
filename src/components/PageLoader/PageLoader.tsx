
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

interface PageLoaderProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function PageLoader({ children, fallback }: PageLoaderProps) {
    return (
        <Suspense
            fallback={
                fallback ?? <DefaultSkeleton />
            }
        >
            {children}
        </Suspense>
    );
}

function DefaultSkeleton() {
    return (
        <div className="flex items-center justify-center h-full min-h-[50vh] space-y-4">
            <div className="bg-white px-6 py-8 rounded-[14px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#087f70]" />
                <p className="text-[13px] font-semibold text-[#0b100e]">Please wait...</p>
            </div>
        </div>
    );
}
