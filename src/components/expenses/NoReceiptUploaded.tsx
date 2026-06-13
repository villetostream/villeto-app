import { AlertCircle } from "lucide-react";

interface NoReceiptUploadedProps {
  onUploadClick?: () => void;
}

export function NoReceiptUploaded({ onUploadClick: _onUploadClick }: NoReceiptUploadedProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px] bg-amber-50 rounded-lg border border-amber-200 p-8">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-amber-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-amber-900 mb-2">
          No Receipt Uploaded
        </h3>

        {/* Description */}
        <p className="text-sm text-amber-700 mb-6">
          A receipt is required to process this reimbursement. Please upload a
          receipt to proceed with the reimbursement request.
        </p>

        {/* Upload Button */}
        {/* <Button
          onClick={onUploadClick}
          className="bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Receipt
        </Button> */}
      </div>
    </div>
  );
}
