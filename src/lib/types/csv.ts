export interface ProcessingOptions {
    hasHeaders: boolean;
    delimiter: string;
    skipEmptyLines: boolean;
}

export interface CSVFileData {
    id: string;
    fileName: string;
    headers: string[];
    rows: unknown[];
    rowCount: number;
    processedAt: Date;
}