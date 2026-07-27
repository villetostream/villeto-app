"use client";

import Link from "next/link";
import { ArrowLeft, FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotFoundContentProps {
  /** When true, uses compact layout suitable for dashboard content area */
  embedded?: boolean;
}

export function NotFoundContent({ embedded = false }: NotFoundContentProps) {
  return (
    <div
      className={
        embedded
          ? "flex flex-1 items-center justify-center min-h-[55vh] py-24"
          : "flex min-h-[60vh] items-center justify-center py-24 bg-dashboard-bg"
      }
    >
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <p className="font-semibold text-sm text-primary">404</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-foreground">Page not found</h1>
        <p className="max-w-[48ch] text-[15px] text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="pt-2">
          <Button asChild className="rounded-xl px-6 h-11">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
