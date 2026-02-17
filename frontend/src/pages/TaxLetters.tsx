import { FileText } from "lucide-react";

export default function TaxLetters() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tax Letters</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Tax Letter Generation
        </h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Generate IRS-compliant year-end donation receipts for your donors.
          This feature will be available in the next update.
        </p>
        <p className="text-sm text-gray-400 mt-4">Coming in Phase 4</p>
      </div>
    </div>
  );
}
