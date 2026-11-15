"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function InvoicePdfPreview({ url }: { url: string }) {
  const container = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(400);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const changePage = (offset: number) => {
    setPageNumber((page) => page + offset);
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
  };

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(Math.max(240, Math.floor(entry.contentRect.width - 24)));
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={container}
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-[#dce7e1] bg-[#e9efeb]"
    >
      <div ref={scrollArea} className="min-h-0 flex-1 overflow-auto p-3">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => {
            setPageCount(numPages);
            setPageNumber(1);
          }}
          loading={
            <p className="py-8 text-center text-xs text-[#68726d]">
              Loading PDF…
            </p>
          }
          error={
            <p className="py-8 text-center text-xs text-[#68726d]">
              Could not preview this PDF. Use Open to view the file.
            </p>
          }
        >
          {pageCount > 0 && (
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              className="mx-auto w-fit shadow-sm"
            />
          )}
        </Document>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-[#dce7e1] bg-white px-3 py-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pageNumber === 1}
            onClick={() => changePage(-1)}
          >
            <ChevronLeft aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
            Previous
          </Button>
          <span className="text-xs font-medium text-[#68726d]">
            Page {pageNumber} of {pageCount}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pageNumber === pageCount}
            onClick={() => changePage(1)}
          >
            Next
            <ChevronRight aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
