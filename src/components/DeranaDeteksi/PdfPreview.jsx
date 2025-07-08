import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Download,
} from "lucide-react";
import Loading from "../common/Loading";

const PdfPreview = ({ file }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (file) {
      setLoading(true);
      setError(null);

      try {
        // Create object URL for PDF preview
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        setLoading(false);

        // Cleanup function
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error("Error creating PDF preview:", err);
        setError("Gagal memuat PDF. Pastikan file tidak rusak.");
        setLoading(false);
      }
    }
  }, [file]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!file) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 text-sm md:text-base">
            Preview PDF
          </h4>

          {/* Controls */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* File Info */}
            <div className="flex items-center gap-2 text-gray-600 text-xs md:text-sm">
              <FileText className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline truncate max-w-32">
                {file.name}
              </span>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="p-1.5 md:p-2 hover:bg-gray-100 transition-colors rounded-lg"
              title="Download PDF"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="relative h-64 md:h-96 bg-gray-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loading message="Memuat PDF..." />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center text-red-600">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && pdfUrl && (
          <div className="w-full h-full">
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
              style={{ minHeight: "100%" }}
            />
          </div>
        )}

        {!loading && !error && !pdfUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">PDF tidak dapat ditampilkan</p>
              <button
                onClick={handleDownload}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
              >
                Download untuk melihat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Details */}
      <div className="px-3 md:px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Ukuran: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
          <span>Format: PDF</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PdfPreview;
