// components/ScanResults.tsx
import { useState } from 'react';
import { ScanResult } from '@/lib/types/receipt';
import { Button } from '../ui/button';
import { useAuthStore } from '@/stores/auth-stores';

interface ScanResultsProps {
    results: ScanResult[];
}

const ScanResults = ({ results }: ScanResultsProps) => {
    const [activeTab, setActiveTab] = useState<number>(0);
    const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
    const currencySymbol = getCurrencySymbol();

    return (
        <div>
            {/* Tabs for multiple results */}
            {results.length > 1 && (
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {results.map((result, index) => (
                            <Button
                                type="button"
                                variant={"ghost"}
                                key={index}
                                onClick={() => setActiveTab(index)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium !rounded-none text-sm ${activeTab === index
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {result.fileName}
                            </Button>
                        ))}
                    </nav>
                </div>
            )}

            {/* Result content */}
            {results.map((result, index) => (
                <div
                    key={index}
                    className={`mt-4 ${activeTab === index ? 'block' : 'hidden'}`}
                >
                    {result.error ? (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">
                                        Error processing {result.fileName}: {result.error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Extracted Information</h4>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        {result.extractedData.merchant && (
                                            <div className="mb-3">
                                                <span className="block text-sm font-medium text-gray-500">Merchant</span>
                                                <span className="text-gray-900">{result.extractedData.merchant}</span>
                                            </div>
                                        )}

                                        {result.extractedData.date && (
                                            <div className="mb-3">
                                                <span className="block text-sm font-medium text-gray-500">Date</span>
                                                <span className="text-gray-900">{result.extractedData.date}</span>
                                            </div>
                                        )}

                                        {result.extractedData.total !== null && (
                                            <div className="mb-3">
                                                <span className="block text-sm font-medium text-gray-500">Total</span>
                                                <span className="text-xl font-bold text-gray-900">
                                                    {currencySymbol}{result.extractedData.total.toFixed(2)}
                                                </span>
                                            </div>
                                        )}

                                        {result.extractedData.tax !== null && (
                                            <div className="mb-3">
                                                <span className="block text-sm font-medium text-gray-500">Tax</span>
                                                <span className="text-gray-900">
                                                    {currencySymbol}{result.extractedData.tax.toFixed(2)}
                                                </span>
                                            </div>
                                        )}

                                        {result.extractedData.items.length > 0 && (
                                            <div>
                                                <span className="block text-sm font-medium text-gray-500 mb-2">Items</span>
                                                <ul className="space-y-1">
                                                    {result.extractedData.items.slice(0, 5).map((item, idx) => (
                                                        <li key={idx} className="flex justify-between text-sm">
                                                            <span className="text-gray-700 truncate max-w-xs">{item.description}</span>
                                                            <span className="text-gray-900">{currencySymbol}{item.amount.toFixed(2)}</span>
                                                        </li>
                                                    ))}
                                                    {result.extractedData.items.length > 5 && (
                                                        <li className="text-xs text-gray-500">
                                                            +{result.extractedData.items.length - 5} more items
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Raw Text</h4>
                                    <div className="bg-gray-800 rounded-lg p-4 overflow-auto max-h-96">
                                        <pre className="text-sm text-gray-200 whitespace-pre-wrap">
                                            {result.text}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* <div className="mt-6 flex space-x-3">
                                <Button type={""} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Download Data
                                </Button>
                                <Button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Save to Database
                                </Button>
                            </div> */}
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ScanResults;