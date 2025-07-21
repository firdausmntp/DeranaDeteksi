import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Square,
  FileText,
  Clock,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";
import styles from "./PageSelector.module.css";

const PageSelector = ({
  file,
  onSelectionChange,
  onExtractAll,
  onExtractSelected,
  isLoading = false,
  getPDFPagePreviews,
}) => {
  const [previews, setPreviews] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [showPreviews, setShowPreviews] = useState(true);

  useEffect(() => {
    if (file && getPDFPagePreviews) {
      loadPreviews();
    }
  }, [file]);

  const loadPreviews = async () => {
    setPreviewsLoading(true);
    try {
      const result = await getPDFPagePreviews(file, { maxPages: 20 });
      setPreviews(result.previews);
      setTotalPages(result.totalPages);

      // Auto select all pages by default (including those without preview)
      const allPageNumbers = Array.from(
        { length: result.totalPages },
        (_, i) => i + 1
      );
      setSelectedPages(allPageNumbers);
      onSelectionChange?.(allPageNumbers);
    } catch (error) {
      console.error("Error loading page previews:", error);
    } finally {
      setPreviewsLoading(false);
    }
  };
  const handlePageToggle = (pageNumber) => {
    const newSelection = selectedPages.includes(pageNumber)
      ? selectedPages.filter((p) => p !== pageNumber)
      : [...selectedPages, pageNumber].sort((a, b) => a - b);

    setSelectedPages(newSelection);
    setSelectAll(newSelection.length === previews.length);
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPages([]);
      onSelectionChange?.([]);
    } else {
      // Select all pages (including those without preview)
      const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
      setSelectedPages(allPages);
      onSelectionChange?.(allPages);
    }
    setSelectAll(!selectAll);
  };

  const handleExtractAll = () => {
    setSelectAll(true);
    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(allPages);
    onExtractAll?.();
  };

  if (previewsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Memuat preview halaman...</span>
      </div>
    );
  }

  if (previews.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={20} />
          Pilih Halaman untuk Ekstraksi
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreviews(!showPreviews)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            {showPreviews ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreviews ? "Sembunyikan Preview" : "Tampilkan Preview"}
          </button>
          <span className="text-sm text-gray-500">
            {totalPages} halaman total
            {previews.length < totalPages && (
              <span className="text-orange-600 ml-1">
                (menampilkan {previews.length} preview)
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
        >
          {selectAll ? <CheckSquare size={16} /> : <Square size={16} />}
          {selectAll ? "Batalkan Semua" : "Pilih Semua"}
        </button>

        <button
          onClick={handleExtractAll}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <FileText size={16} />
          Ekstrak Semua Halaman
        </button>

        {selectedPages.length > 0 && (
          <button
            onClick={() => onExtractSelected?.(selectedPages)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            Ekstrak {selectedPages.length} Halaman Terpilih
          </button>
        )}

        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">
            {selectedPages.length} halaman dipilih
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {previews.map((preview) => (
          <motion.div
            key={preview.pageNumber}
            whileHover={{ scale: 1.02 }}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedPages.includes(preview.pageNumber)
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handlePageToggle(preview.pageNumber)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {selectedPages.includes(preview.pageNumber) ? (
                  <CheckSquare size={18} className="text-blue-600" />
                ) : (
                  <Square size={18} className="text-gray-400" />
                )}
                <span className="font-medium text-gray-900">
                  Halaman {preview.pageNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock size={12} />
                {preview.wordCount} kata
              </div>
            </div>

            {showPreviews && (
              <div className="space-y-2">
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    preview.hasText
                      ? "bg-green-100 text-green-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {preview.hasText ? "Berisi teks" : "Tidak ada teks"}
                </div>

                <p className="text-sm text-gray-600 line-clamp-3">
                  {preview.textPreview}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {totalPages > previews.length && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Catatan:</strong> Ada {totalPages - previews.length} halaman
            tambahan yang tidak ditampilkan preview. Anda tetap bisa memilih
            untuk mengekstrak semua halaman atau halaman tertentu.
          </p>
        </div>
      )}

      {selectedPages.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Halaman yang dipilih:</strong> {selectedPages.join(", ")}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default PageSelector;
