import React from "react";
import { motion } from "framer-motion";
import { Send, Zap } from "lucide-react";
import Loading from "../common/Loading";

const ProcessButton = ({
  disabled,
  loading,
  onProcess,
  hasInput,
  inputType,
  progressMessage,
}) => {
  const getButtonText = () => {
    if (loading) return "Memproses...";
    if (inputType === "upload") return "Deteksi AI dalam Dokumen";
    return "Deteksi AI dalam Teks";
  };

  const getButtonIcon = () => {
    if (loading) return null;
    return inputType === "upload" ? Send : Zap;
  };

  const ButtonIcon = getButtonIcon();

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Info Card */}
      {hasInput && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-start gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-blue-900 mb-1 text-sm md:text-base">
                Siap untuk Analisis
              </h4>
              <p className="text-xs md:text-sm text-blue-700">
                {inputType === "upload"
                  ? "Dokumen PDF akan dianalisis untuk mendeteksi konten yang ditulis AI"
                  : "Teks akan dianalisis untuk mendeteksi konten yang ditulis AI"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Progress Message */}
      {loading && progressMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 md:p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg"
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className="animate-spin">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-amber-800 font-medium">
                {progressMessage}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Process Button */}
      <motion.button
        whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
        onClick={onProcess}
        disabled={disabled || loading || !hasInput}
        className={`
          w-full py-3 md:py-4 px-4 md:px-6 rounded-xl font-semibold text-white transition-all duration-200
          flex items-center justify-center gap-2 md:gap-3 shadow-lg text-sm md:text-base
          ${
            disabled || !hasInput || loading
              ? "bg-gray-300 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200"
          }
        `}
      >
        {loading ? (
          <Loading message="" size="small" />
        ) : (
          ButtonIcon && <ButtonIcon className="w-4 h-4 md:w-5 md:h-5" />
        )}
        <span>{getButtonText()}</span>
      </motion.button>

      {/* Help Text */}
      {!hasInput && (
        <p className="text-center text-xs md:text-sm text-gray-500 px-2">
          {inputType === "upload"
            ? "Upload file PDF untuk memulai AI detection"
            : "Masukkan teks untuk memulai AI detection"}
        </p>
      )}
    </div>
  );
};

export default ProcessButton;
