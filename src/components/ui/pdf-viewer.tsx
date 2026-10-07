"use client";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);

  return (
    <div className="w-full h-full overflow-y-auto bg-[#f5f7f6] p-4">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<p className="text-[13px] text-[#84908a] text-center mt-4">Loading document…</p>}
        error={<p className="text-[13px] text-[#d33d44] font-medium text-center mt-4">Couldn't load the document. Use the open link instead.</p>}
      >
        {numPages && Array.from({ length: numPages }, (_, i) => (
          <Page key={i} pageNumber={i + 1} width={800} className="mx-auto mb-4 shadow-sm" />
        ))}
      </Document>
    </div>
  );
}
