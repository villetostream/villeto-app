"use client";

import { ChevronDown } from "lucide-react";

export function Pagination({
  total, page, perPage, onPage, onPerPage, totalPages,
}: {
  total: number; page: number; perPage: number;
  onPage: (p: number) => void; onPerPage: (n: number) => void; totalPages?: number;
}) {
  const actualTotalPages = totalPages ?? Math.ceil(total / perPage);
  const start = total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total);
  const end   = Math.min(page * perPage, total);
  const maxVisible = 7;
  const pages: (number | "...")[] = [];

  if (actualTotalPages <= maxVisible) {
    for (let i = 1; i <= actualTotalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(actualTotalPages - 1, page + 1); i++) pages.push(i);
    if (page < actualTotalPages - 2) pages.push("...");
    pages.push(actualTotalPages);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Showing {start}–{end} of {total}</span>
        <div className="relative">
          <select value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
            className="appearance-none pl-2 pr-6 py-1 rounded border border-border text-sm bg-white cursor-pointer focus:outline-none">
            {[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 h-8 rounded border border-border bg-white hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
          Previous
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-muted-foreground">…</span>
          ) : (
            <button key={p} onClick={() => onPage(p as number)}
              className={`w-8 h-8 rounded border text-sm font-medium transition-colors ${p === page ? "bg-primary text-white border-primary" : "border-border bg-white hover:bg-muted/40"}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= actualTotalPages}
          className="px-3 h-8 rounded border border-border bg-white hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
          Next
        </button>
      </div>
    </div>
  );
}
