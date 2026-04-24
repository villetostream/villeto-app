"use client"

// External libraries
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'; // Added useRef
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

// UI components
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
//table 
import { ColumnDef } from '@tanstack/react-table';

import { logger } from '@/lib/logger';

// Types
import { ProcessingOptions as ProcessingOptionsType } from '@/lib/types/csv';
import { DataTable } from '../datatable';
import { useDataTable } from '../datatable/useDataTable';
import { useCompanyBulkImportApi } from '@/actions/companies/company-bulk-import.action';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const CSVProcessor = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [columns, setColumns] = useState<ColumnDef<any>[]>([]);
    const [options, setOptions] = useState<ProcessingOptionsType>({
        hasHeaders: true,
        delimiter: ',',
        skipEmptyLines: true,
    });
    const [globalSearch, setGlobalSearch] = useState("")

    // Add state for tracking empty columns
    const [emptyColumns, setEmptyColumns] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [hasProcessed, setHasProcessed] = useState<boolean>(false);

    const uploadFileMutation = useCompanyBulkImportApi()
    const loading = uploadFileMutation.isPending;
    const router = useRouter()

    // Create a ref for the error container
    const errorRef = useRef<HTMLDivElement>(null);

    // Scroll to error when error state changes
    useEffect(() => {
        if (error && errorRef.current) {
            // Add a small delay to ensure the error is rendered
            setTimeout(() => {
                errorRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center', // Center the error in viewport
                });

                // Also focus for accessibility
                errorRef.current?.focus();
            }, 100);
        }
    }, [error]);

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        // Clear previous error
        setError(null);

        // BUG FIX 2: Accept only a single CSV file
        if (acceptedFiles.length > 1) {
            setError('Please upload only one CSV file at a time.');
            return;
        }

        // Filter for CSV files only
        const csvFiles = acceptedFiles.filter(file =>
            file.type === 'text/csv' ||
            file.name.toLowerCase().endsWith('.csv')
        );

        if (csvFiles.length === 0) {
            setError('Please upload a valid CSV file.');
            return;
        }

        // If a file is already uploaded, replace it
        setFiles(csvFiles);
        setHasProcessed(false);
        setCsvData([]);
        setColumns([]);
        setEmptyColumns([]);

    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
        },
        maxFiles: 1, // BUG FIX 2: Only allow single file
        maxSize: 10 * 1024 * 1024, // 10MB limit
        multiple: false // BUG FIX 2: Don't allow multiple files
    });

    const processCSV = useCallback(async (): Promise<void> => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setError(null);
        setEmptyColumns([]);
        setCsvData([]);
        setColumns([]);

        try {
            const file = files[0]; // Since we only allow one file

            const result = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
                Papa.parse(file, {
                    header: options.hasHeaders,
                    delimiter: options.delimiter,
                    skipEmptyLines: options.skipEmptyLines,
                    complete: (results) => {
                        resolve(results);
                    },
                    error: (error) => {
                        reject(error);
                    },
                    // Keep original values including empty strings
                    transform: (value: string) => {
                        // Return empty string as is, don't trim or modify
                        if (value === '') return '';
                        // Only trim if it's not an empty string
                        return value ? value.trim() : value;
                    }
                });
            });

            // Check if CSV is empty
            if (!result.data || result.data.length === 0) {
                setError('CSV file appears to be empty or contains no data.');
                setIsProcessing(false);
                return;
            }

            logger.log('Parsed Result:', { result });

            // Use the raw data from PapaParse without filtering
            const rawData = result.data;

            // Create data rows with row number and source file
            const processedData = rawData.map((row: any, index: number) => {
                const dataRow: any = {
                    _rowNumber: index + 1,
                };

                // Preserve ALL columns exactly as they appear in the CSV
                if (options.hasHeaders && result.meta.fields) {
                    // Use the exact field names from meta.fields
                    result.meta.fields.forEach((fieldName: string, fieldIndex: number) => {
                        // For empty headers, use the same unique ID we'll use for the column
                        const accessorKey = fieldName.trim() === '' ?
                            `empty_col_${fieldIndex}` :
                            fieldName;

                        // Preserve empty values as empty strings
                        dataRow[accessorKey] = row[fieldName] !== undefined ? String(row[fieldName]) : '';
                    });
                } else {
                    // For files without headers, use column indices
                    Object.keys(row).forEach((key, colIndex) => {
                        dataRow[`Column ${colIndex + 1}`] = String(row[key] || '');
                    });
                }

                return dataRow;
            });

            logger.log('Processed Data:', processedData);

            // Generate columns - ALWAYS use meta.fields if available
            const generatedColumns: ColumnDef<any>[] = [];
            const detectedEmptyColumns: string[] = [];

            // Add row number column
            generatedColumns.push({
                accessorKey: '_rowNumber',
                header: 'Row #',
                cell: ({ row }) => (
                    <div className="font-mono text-sm">{row.getValue('_rowNumber')}</div>
                ),
            });

            // Get ALL field names including empty ones
            let fieldNames: string[] = [];

            if (options.hasHeaders && result.meta.fields) {
                // Use ALL fields from meta.fields including empty ones
                fieldNames = result.meta.fields;
            } else if (processedData.length > 0) {
                // Generate column names if no headers
                const firstRow = processedData[0];
                fieldNames = Object.keys(firstRow)
                    .filter(key => key !== '_rowNumber' && key !== '_sourceFile')
                    .map((_, index) => `Column ${index + 1}`);
            }

            // Add data columns for ALL fields
            fieldNames.forEach((field: string) => {
                // Determine if this column is completely empty (all values are empty)
                const isColumnEmpty = processedData.every((row: any) => {
                    const value = row[field];
                    return value === '' || value === null || value === undefined || String(value).trim() === '';
                });

                if (isColumnEmpty) {
                    detectedEmptyColumns.push(field);
                }

                // Create header display - show empty headers as "(Empty Header)"
                const headerDisplay = field.trim() === '' ? '(Empty Header)' : field;

                // FIX: Create a unique, non-empty column ID for empty headers
                const columnId = field.trim() === '' ? `empty_col_${fieldNames.indexOf(field)}` : field;

                // FIX: Also use the columnId as accessorKey for empty headers
                const accessorKey = field.trim() === '' ? columnId : field;

                generatedColumns.push({
                    accessorKey: accessorKey,  // Use the new accessorKey
                    id: columnId,
                    header: () => (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium" title={headerDisplay}>
                                    {headerDisplay}
                                </span>
                                {field.trim() === '' && (
                                    <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                        Empty Header
                                    </Badge>
                                )}
                                {isColumnEmpty && field.trim() !== '' && (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                        Empty Column
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ),
                    cell: ({ row }) => {
                        // FIX: Use the correct accessorKey to get the value
                        const value = row.getValue(accessorKey);
                        const isEmpty = value === '' || value === null || value === undefined || String(value).trim() === '';

                        // Display empty values with styling
                        if (isEmpty) {
                            return (
                                <div className="text-gray-400 italic" title="Empty value">
                                    (empty)
                                </div>
                            );
                        }

                        return (
                            <div className="text-gray-800 truncate max-w-[200px]" title={String(value)}>
                                {String(value)}
                            </div>
                        );
                    },
                    size: 150,
                });
            });
            logger.log({ generatedColumns })

            // Set the data and columns
            setCsvData(processedData);
            setColumns(generatedColumns);
            setEmptyColumns(detectedEmptyColumns);
            setHasProcessed(true);

            // Show summary of findings
            const emptyHeaderCount = fieldNames.filter(field => field.trim() === '').length;
            const emptyColumnCount = detectedEmptyColumns.length;

            let summaryMessage = `Processed ${processedData.length} rows with ${fieldNames.length} columns.`;

            if (emptyHeaderCount > 0 || emptyColumnCount > 0) {
                summaryMessage += ' Found:';
                if (emptyHeaderCount > 0) {
                    summaryMessage += ` ${emptyHeaderCount} empty header(s)`;
                }
                if (emptyColumnCount > 0) {
                    if (emptyHeaderCount > 0) summaryMessage += ',';
                    summaryMessage += ` ${emptyColumnCount} completely empty column(s)`;
                }
                summaryMessage += '.';
            }

            setError(summaryMessage);

        } catch (error) {
            logger.error('Error processing CSV:', error);
            setError('Failed to process CSV file. Please check the file format and try again.');
        } finally {
            setIsProcessing(false);
        }
    }, [files, options]);

    useEffect(() => {
        if (files.length > 0) {
            processCSV()
        }
    }, [files])

    const tableProps = useDataTable({
        initialPage: 1,
        initialPageSize: 10,

        manualSorting: false,
        manualFiltering: false,
        manualPagination: false,
    });

    // Memoize file size calculations for performance
    const fileSizes = useMemo(() =>
        files.map(file => (file.size / 1024).toFixed(1)),
        [files]
    );

    const clearFiles = (): void => {
        setFiles([]);
        setCsvData([]);
        setColumns([]);
        setEmptyColumns([]);
        setError(null);
        setHasProcessed(false);
    };

    const removeFile = (index: number): void => {
        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
        setCsvData([]);
        setColumns([]);
        setEmptyColumns([]);
        setError(null);
        setHasProcessed(false);
    };

    const uploadFileToBackend = async () => {
        try {
            if (files.length <= 0) return;
            const formData = new FormData()


            formData.append("file", files[0]);
            await uploadFileMutation.mutateAsync(formData)
            setError(null)
            toast.success("Upload Success, We will send an update once the integration is complete!");
            router.push("/settings/data-integration")
        } catch (error: any) {
            setError(error.response?.data?.message || "Failed to upload file. Please try again.");
        }
    }

    return (
        <div className="space-y-4">
            {/* Error/Info Display with ref */}
            {error && (
                <div
                    ref={errorRef} // Add ref here
                    tabIndex={-1} // Make it focusable
                    className={`p-4 rounded-md ${error.startsWith('Processed') ? 'bg-blue-50 border border-blue-200 text-blue-800' : error.includes('Warning') ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-red-50 border border-red-200 text-red-800'}`}
                >
                    <div className="flex items-center">
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                </div>
            )}

            <div className="border-2 border-dashed border-dashboard-border my-auto rounded-lg p-4">
                {files.length === 0 ? (
                    <div {...getRootProps()} className="text-center cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-dashboard-text-secondary" />
                        <div className="mt-4">
                            <span className="mt-2 block text-sm font-medium text-dashboard-text-primary">
                                {isDragActive ? 'Drop CSV file here...' : 'Upload CSV File'}
                            </span>
                            <span className="mt-1 block text-sm text-dashboard-text-secondary">
                                Upload a single CSV file (up to 10MB)
                            </span>
                        </div>
                        <input {...getInputProps()} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-dashboard-text-primary">
                            Uploaded CSV File
                        </p>
                        <div className="space-y-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-dashboard-hover rounded-md">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-dashboard-accent" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-dashboard-text-primary">{file.name}</span>
                                            <span className="text-xs text-dashboard-text-secondary">
                                                {fileSizes[index]} KB • {file.type || 'CSV'}
                                            </span>
                                            {hasProcessed && (
                                                <span className="text-xs text-paid mt-1">
                                                    ✓ Processed {csvData.length} rows
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(index)}
                                            disabled={isProcessing}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                onClick={clearFiles}
                                variant="outline"
                                disabled={isProcessing}
                            >
                                Clear File
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {isProcessing && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Processing CSV File</span>
                        <span className="text-sm text-gray-500">Please wait...</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300 animate-pulse"
                        ></div>
                    </div>
                </div>
            )}

            {csvData.length > 0 && (
                <div className="mt-4 space-y-4">
                    <DataTable
                        data={csvData}
                        isLoading={isProcessing}
                        columns={columns}
                        paginationProps={{ ...tableProps.paginationProps, total: csvData.length }}
                        enableRowSelection={false}
                        enableColumnVisibility={true}
                        selectedDataIds={tableProps.selectedDataIds}
                        setSelectedDataIds={tableProps.setSelectedDataIds}
                        tableHeader={{
                            actionButton: <></>,
                            isSearchable: false,
                            isExportable: false,
                            isFilter: false,
                            enableColumnVisibility: true,
                            search: globalSearch,
                            searchQuery: setGlobalSearch,
                            filterProps: {
                                title: "Processed Data",
                                filterData: [],
                                onFilter: (filters) => { },
                            },
                            bulkActions: [],
                        }}
                    />
                    <div className='flex justify-end mt-4'>
                        <Button size={"md"} onClick={uploadFileToBackend} disabled={loading} className='px-10 disabled:px-10'>
                            {loading ? "Uploading" : "Upload"}
                            {loading && <Loader2 className='size-4 animate-spin' />}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CSVProcessor;
