import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { useFileUpload } from "../../hooks/useFileUpload";
import { formatFileSize } from "../../utils/fileUtils";
import Message from "../common/Message";

const FileUpload = ({ disabled, onFileChange }) => {
  const fileInputRef = useRef(null);
  const {
    selectedFile,
    dragOver,
    errors,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    clearFile,
  } = useFileUpload();

  React.useEffect(() => {
    onFileChange(selectedFile);
  }, [selectedFile, onFileChange]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    clearFile();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (disabled) {
    return (
      <div className="p-6 md:p-8 border-2 border-gray-200 border-dashed rounded-xl bg-gray-50">
        <div className="text-center text-gray-400">
          <AlertCircle className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4" />
          <p className="text-sm md:text-base">Mode upload tidak aktif</p>
          <p className="text-xs md:text-sm mt-1">
            Pilih "Upload Document" untuk menggunakan fitur AI detection
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <Message type="error" message={errors} onClose={() => {}} />
      )}

      <AnimatePresence>
        {!selectedFile ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative p-6 md:p-8 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
              ${
                dragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
              }
            `}
            onClick={handleBrowseClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="text-center">
              <Upload
                className={`w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 ${
                  dragOver ? "text-blue-500" : "text-gray-400"
                }`}
              />
              <h4 className="text-base md:text-lg font-semibold text-gray-700 mb-2">
                {dragOver ? "Lepas file di sini" : "Upload file PDF"}
              </h4>
              <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 px-2">
                Drag & drop file PDF atau{" "}
                <span className="text-blue-600 font-medium hover:underline">
                  browse
                </span>
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                Maksimal 10MB • Hanya file PDF
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 md:p-6 border-2 border-green-200 bg-green-50 rounded-xl"
          >
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-green-900 truncate text-sm md:text-base">
                  {selectedFile.name}
                </h4>
                <p className="text-xs md:text-sm text-green-700">
                  {formatFileSize(selectedFile.size)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  File siap untuk AI detection
                </p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 text-green-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
