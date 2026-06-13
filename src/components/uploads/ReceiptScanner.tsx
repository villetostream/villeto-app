"use client"

// External libraries
import { Receipt, Upload, X } from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';

// UI components
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

import { logger } from '@/lib/logger';

// Internal components
import ProcessingOptions from './ProcessingOption';
import ScanResults from './ScanResult';
import ReceiptDataExtractor from './ReceiptExtractor';

// Types
import { FileWithPreview, ScanResult, ProcessingOptions as ProcessingOptionsType } from '@/lib/types/receipt';

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Invalid file type. Only images are supported.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const img = new Image();
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 1000;

          let { width, height } = img;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Image compression failed'));
            }
          }, 'image/jpeg', 0.8);
        } catch (error) {
          reject(new Error(`Image processing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

const ReceiptScanner = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [options, setOptions] = useState<ProcessingOptionsType>({
    languages: ['eng'],
    compressImage: true,
    autoDetectFields: true
  });

  // Track when files are added to prevent infinite processing loops
  const [shouldProcess, setShouldProcess] = useState<boolean>(false);

  // Ref to track the number of processed files
  const lastProcessedCountRef = useRef<number>(0);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      logger.warn('Rejected files:', rejectedFiles);
      // Could add toast notification here
    }

    const filesWithPreview = acceptedFiles.map(file =>
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      }) as FileWithPreview
    );

    // Append new files to existing ones instead of replacing
    setFiles(prevFiles => [...prevFiles, ...filesWithPreview]);
    // Trigger processing for new files
    setShouldProcess(true);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp']
    },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024, // 10MB limit
    multiple: true
  });

  const processImages = useCallback(async (): Promise<void> => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    setProgress(0);

    try {
      // Process images in parallel for better performance
      const processPromises = files.map(async (file, index) => {
        try {
          // Compress image if option is enabled
          let processedImage: File = file;
          if (options.compressImage) {
            processedImage = await compressImage(file);
          }

          // Perform OCR with progress tracking
          const { data } = await Tesseract.recognize(
            processedImage,
            options.languages.join('+'),
            {
              logger: (m: Tesseract.LoggerMessage) => {
                if (m.status === 'recognizing text') {
                  // Update progress incrementally
                  setProgress(prev => Math.max(prev, Math.round((index + m.progress) / files.length * 100)));
                }
              }
            }
          );

          // Extract receipt data
          const extractedData = ReceiptDataExtractor(data.text);
          return {
            id: index,
            fileName: file.name,
            text: data.text,
            extractedData,
            image: file.preview
          } as ScanResult;
        } catch (error) {
          logger.error(`Error processing ${file.name}:`, error);
          return {
            id: index,
            fileName: file.name,
            text: '',
            extractedData: {
              total: null,
              date: null,
              merchant: null,
              items: [],
              tax: null
            },
            image: file.preview,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          } as ScanResult;
        }
      });

      const newResults = await Promise.all(processPromises);
      setResults(newResults);
      // Update the ref to track processed files
      lastProcessedCountRef.current = files.length;
    } catch (error) {
      logger.error('Error processing images:', error);
      // Handle overall processing error
      setResults([]);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, [files, options]);

  // Automatically process files when they are added
  useEffect(() => {
    if (shouldProcess && files.length > 0 && !isProcessing) {
      const timeoutId = window.setTimeout(() => {
        setShouldProcess(false);
        processImages();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldProcess, files.length, processImages, isProcessing]);

  // Memoize file size calculations for performance
  const fileSizes = useMemo(() =>
    files.map(file => (file.size / 1024).toFixed(1)),
    [files]
  );

  const clearFiles = (): void => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setResults([]);
    // Reset processing flags when files are cleared
    setShouldProcess(false);
  };
  function removeFile(index: number): void {
    // Revoke the object URL for the removed file
    URL.revokeObjectURL(files[index].preview);
    // Remove the file from the files array
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    // Optionally remove the corresponding result if it exists
    setResults(prevResults => prevResults.filter(result => result.id !== index));
  }

  return (
    <div className="space-y-4">
      <ProcessingOptions
        options={options}
        setOptions={setOptions}
      />
      <h3 className="text-lg font-medium text-dashboard-text-primary flex items-center gap-2">
        <Upload className="w-5 h-5 text-dashboard-accent" />
        Receipt & Documents
      </h3>

      <div className="border-2 border-dashed border-dashboard-border rounded-lg p-6">
        {files.length === 0 && (<div {...getRootProps()} className="text-center cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-dashboard-text-secondary" />
          <div className="mt-4">
            <span className="mt-2 block text-sm font-medium text-dashboard-text-primary">
              {isDragActive ? 'Drop files here...' : 'Upload receipt or document'}
            </span>
            <span className="mt-1 block text-sm text-dashboard-text-secondary">
              PNG, JPG, PDF up to 10MB - Drag & drop or click to select
            </span>
          </div>
          <input {...getInputProps()} />
        </div>
        )}
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-dashboard-text-primary">
            Uploaded Files ({files.length})
          </p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-dashboard-hover rounded-md">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-dashboard-accent" />
                  <span className="text-sm text-dashboard-text-primary">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {fileSizes[index]} KB
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex justify-end">
              <Button
                onClick={clearFiles}
                variant="outline"
                disabled={isProcessing}
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Processing</span>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Scan Results</h2>
          <ScanResults results={results} />
        </div>
      )}
    </div>
  )
}

export default ReceiptScanner

