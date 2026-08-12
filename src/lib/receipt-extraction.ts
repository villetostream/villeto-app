import type { AxiosInstance } from "axios";

export type ReceiptExtractionStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "accepted";

export interface ReceiptExtraction {
  expenseReceiptExtractionId: string;
  status: ReceiptExtractionStatus;
  filename: string;
  mimeType: string;
  receiptUrl: string;
  extractedValues: {
    merchantName?: string | null;
    transactionDate?: string | null;
    amount?: string | number | null;
  } | null;
  acceptedValues: Record<string, unknown> | null;
  fieldConfidence: Record<string, number> | null;
  overallConfidence: number | null;
  errors: Array<{ code?: string; message?: string }>;
  processedAt: string | null;
}

const TERMINAL_STATUSES = new Set<ReceiptExtractionStatus>([
  "completed",
  "failed",
  "accepted",
]);

function unwrap<T>(payload: unknown): T {
  const value = payload as { data?: unknown } | undefined;
  const first = value?.data;
  if (first && typeof first === "object" && "data" in first) {
    return (first as { data: T }).data;
  }
  return (first ?? payload) as T;
}

function extractionError(extraction: ReceiptExtraction): Error {
  const message = extraction.errors
    ?.map((error) => error.message)
    .filter(Boolean)
    .join("; ");
  return new Error(message || "We could not read this receipt. You can enter it manually.");
}

export async function getReceiptExtraction(
  axios: AxiosInstance,
  extractionId: string,
): Promise<ReceiptExtraction> {
  const response = await axios.get(
    `expense-receipt-extractions/${extractionId}`,
  );
  return unwrap<ReceiptExtraction>(response.data);
}

export async function uploadReceipt(
  axios: AxiosInstance,
  file: File,
): Promise<ReceiptExtraction> {
  const formData = new FormData();
  formData.append("receipt", file);
  const response = await axios.post("expense-receipt-extractions", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap<ReceiptExtraction>(response.data);
}

export async function waitForReceiptExtraction(
  axios: AxiosInstance,
  extractionId: string,
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    signal?: AbortSignal;
    onStatus?: (status: ReceiptExtractionStatus) => void;
  } = {},
): Promise<ReceiptExtraction> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const extraction = await getReceiptExtraction(axios, extractionId);
    options.onStatus?.(extraction.status);
    if (TERMINAL_STATUSES.has(extraction.status)) {
      if (extraction.status === "failed") throw extractionError(extraction);
      return extraction;
    }
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, pollIntervalMs);
      options.signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timeout);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }

  throw new Error("Receipt processing is taking longer than expected. Try again shortly.");
}

export async function uploadAndExtractReceipt(
  axios: AxiosInstance,
  file: File,
  options?: Parameters<typeof waitForReceiptExtraction>[2],
): Promise<ReceiptExtraction> {
  const queued = await uploadReceipt(axios, file);
  return waitForReceiptExtraction(
    axios,
    queued.expenseReceiptExtractionId,
    options,
  );
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [metadata, encoded] = dataUrl.split(",", 2);
  if (!metadata || !encoded) throw new Error("Invalid receipt image");
  const mimeType = metadata.match(/^data:([^;]+);base64$/)?.[1] ?? "image/jpeg";
  const bytes = window.atob(encoded);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }
  return new File([buffer], filename, { type: mimeType });
}

export function extractedReceiptValues(extraction: ReceiptExtraction) {
  const values = extraction.extractedValues ?? {};
  const amount = Number(values.amount);
  const date = values.transactionDate ? new Date(values.transactionDate) : null;
  return {
    merchantName: values.merchantName?.trim() || "",
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    transactionDate:
      date && !Number.isNaN(date.getTime()) ? date : new Date(),
  };
}
