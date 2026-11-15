"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function InvoicePdfPreview({ url }: { url: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(400);
  const [pageCount, setPageCount] = useState(0);

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
      className="h-full w-full overflow-auto rounded-lg border border-[#dce7e1] bg-[#e9efeb] p-3"
    >
      <Document
        key={url}
        file={url}
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
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
        {Array.from({ length: pageCount }, (_, index) => (
          <Page
            key={index}
            pageNumber={index + 1}
            width={pageWidth}
            className="mx-auto mb-3 w-fit shadow-sm last:mb-0"
          />
        ))}
      </Document>
    </div>
  );
}
