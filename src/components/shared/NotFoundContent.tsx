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
          ? "flex flex-1 items-center justify-center min-h-[55vh] p-6"
          : "flex min-h-screen items-center justify-center bg-dashboard-bg p-6"
      }
    >
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-border bg-white shadow-sm p-8 sm:p-10 text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
            <FileQuestion className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Page not found</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The page you&apos;re looking for doesn&apos;t exist, may have been moved, or you may not have access to it.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => window.history.back()} className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" />
              Go back
            </Button>
            <Button asChild className="gap-2 w-full sm:w-auto">
              <Link href="/dashboard">
                <Home className="w-4 h-4" />
                Go to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
