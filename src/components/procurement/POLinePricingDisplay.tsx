"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils/currency";

export interface PricingSegment {
  from: string;
  to: string;
  unitPrice: string;
  revision: number;
}

interface POLinePricingDisplayProps {
  unitPrice: string | number;
  currency: string;
  pricingSegments?: PricingSegment[] | null;
  className?: string;
}

export function POLinePricingDisplay({
  unitPrice,
  currency,
  pricingSegments,
  className = "",
}: POLinePricingDisplayProps) {
  if (!pricingSegments || pricingSegments.length === 0) {
    return (
      <span className={`text-[#0b100e] font-medium ${className}`}>
        {formatCurrency(unitPrice, currency)}
      </span>
    );
  }

  // If there's only one segment and it matches the single unitPrice
  if (pricingSegments.length === 1) {
    const seg = pricingSegments[0];
    return (
      <div className={`space-y-0.5 text-right ${className}`}>
        <div className="font-medium text-[#0b100e]">
          {formatCurrency(seg.unitPrice, currency)}
        </div>
        {seg.revision > 1 && (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#e7f6f2] text-[#087f70] border border-[#c8ece4]">
            Revision {seg.revision}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 text-right ${className}`}>
      {pricingSegments.map((segment, index) => {
        const qty = Math.max(0, Number(segment.to) - Number(segment.from));
        return (
          <div
            key={index}
            className="flex items-center justify-end gap-1.5 text-xs text-[#4b5563]"
          >
            <span className="font-medium text-[#0b100e]">
              {qty} × {formatCurrency(segment.unitPrice, currency)}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#e7f6f2] text-[#087f70] border border-[#c8ece4]">
              Rev {segment.revision}
            </span>
          </div>
        );
      })}
    </div>
  );
}
