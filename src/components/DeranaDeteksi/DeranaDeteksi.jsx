import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import ToggleButtons from "./ToggleButtons";
import FileUpload from "./FileUpload";
import TextInput from "./TextInput";
import PdfPreview from "./PdfPreview";
import ProcessButton from "./ProcessButton";
import Message from "../common/Message";
import {
  detectAIContent,
  validateTextForAnalysis,
  API_CONFIG,
  cleanTextFromHTML,
} from "../../utils/aiDetectionApi";
import {
  extractTextFromPDF,
  isValidPDF,
  estimateExtractionTime,
  getPDFInfo,
} from "../../utils/pdfTextExtractor";
import {
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  Brain,
  Zap,
  BarChart3,
} from "lucide-react";

const DeranaDeteksi = () => {
  // State management
  const [inputMode, setInputMode] = useState("upload"); // 'upload' atau 'text'
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progressMessage, setProgressMessage] = useState("");
  const [useRealAPI, setUseRealAPI] = useState(true); // Toggle between real API and demo

  // PDF related states
  const [extractedText, setExtractedText] = useState("");
  const [pdfInfo, setPdfInfo] = useState(null);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);

  // Handle mode change
  const handleModeChange = useCallback((mode) => {
    setInputMode(mode);
    setSelectedFile(null);
    setInputText("");
    setResults(null);
    setError(null);
    setSuccess(null);
    // Clear PDF related states
    setExtractedText("");
    setPdfInfo(null);
    setIsExtractingPDF(false);
  }, []);

  // Handle file change with automatic PDF text extraction
  const handleFileChange = useCallback(async (file) => {
    setSelectedFile(file);
    setError(null);
    setExtractedText("");
    setPdfInfo(null);
    setIsExtractingPDF(false);

    if (!file) return;

    // Validate PDF file
    if (!isValidPDF(file)) {
      setError(
        "File tidak valid. Silakan pilih file PDF yang valid (maksimal 50MB)."
      );
      setSelectedFile(null);
      return;
    }

    try {
      // Get PDF info first
      setProgressMessage("Memuat informasi PDF...");
      const info = await getPDFInfo(file);
      setPdfInfo(info);

      // Start text extraction automatically
      setIsExtractingPDF(true);
      setProgressMessage("Memulai ekstraksi teks dari PDF...");

      const extractedPdfText = await extractTextFromPDF(file, (progress) => {
        setProgressMessage(progress.message);
      });

      setExtractedText(extractedPdfText);
      setProgressMessage("");

      // Show success message
      setSuccess(
        `Berhasil mengekstrak teks dari PDF (${extractedPdfText.length} karakter, ${info.numPages} halaman)`
      );
    } catch (err) {
      console.error("PDF extraction error:", err);
      setError(
        err.message ||
          "Gagal mengekstrak teks dari PDF. Silakan coba file PDF lain."
      );
      setSelectedFile(null);
    } finally {
      setIsExtractingPDF(false);
      setProgressMessage("");
    }
  }, []);

  // Handle text change
  const handleTextChange = useCallback((text) => {
    // Clean HTML tags from pasted text
    const cleanedText = cleanTextFromHTML(text);
    setInputText(cleanedText);
    setError(null);
  }, []);

  // Check if we have valid input
  const hasValidInput = () => {
    if (inputMode === "upload") {
      return selectedFile !== null && extractedText.trim().length > 0;
    }
    return inputText.trim().length > 0;
  };

  // Handle form submission
  const handleProcess = async () => {
    if (!hasValidInput()) {
      setError("Mohon masukkan data yang akan dianalisis");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setProgressMessage("");

    try {
      let textToAnalyze = "";

      // Get text content based on input mode
      if (inputMode === "upload" && selectedFile) {
        // Use extracted text from PDF
        if (selectedFile.type === "application/pdf") {
          if (!extractedText || extractedText.trim().length === 0) {
            setError(
              "Teks belum diekstrak dari PDF atau PDF tidak mengandung teks. Silakan pilih file PDF lain atau gunakan mode 'Paste Text'."
            );
            return;
          }
          textToAnalyze = extractedText;
        } else {
          // For other file types, try to read as text
          const reader = new FileReader();
          textToAnalyze = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error("Failed to read file"));
            reader.readAsText(selectedFile);
          });
        }
      } else {
        textToAnalyze = inputText;
      }

      // Use the improved validation function
      const validation = validateTextForAnalysis(textToAnalyze);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }

      // Use the validated text
      textToAnalyze = validation.text;

      let analysisResults;

      if (useRealAPI) {
        // Use real API
        analysisResults = await detectAIContent(textToAnalyze, (progress) => {
          setProgressMessage(progress.message);
        });
      } else {
        // Use demo/mock data
        setProgressMessage("Simulasi analisis...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const mockResults = {
          ai_probability: Math.floor(Math.random() * 60) + 30, // 30-90% AI probability
          human_probability: 100 - (Math.floor(Math.random() * 60) + 30), // Remaining percentage for human
          confidence_score: Math.floor(Math.random() * 25) + 75, // 75-99%
          word_count: textToAnalyze
            .split(/\s+/)
            .filter((word) => word.length > 0).length,
          character_count: textToAnalyze.length,
          sentence_count: textToAnalyze
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0).length,
          reading_time: Math.ceil(
            textToAnalyze.split(/\s+/).filter((word) => word.length > 0)
              .length / 200
          ),
          detected_models: ["GPT-4", "Claude", "ChatGPT"].slice(
            0,
            Math.floor(Math.random() * 2) + 1
          ),
          complexity_score: Math.floor(Math.random() * 40) + 60, // 60-100%
          message: "Analisis AI detection berhasil diselesaikan (Mode Demo).",
        };

        analysisResults = mockResults;
      }

      setResults(analysisResults);
      setSuccess(
        inputMode === "upload"
          ? "Dokumen berhasil dianalisis!"
          : "Teks berhasil dianalisis!"
      );
    } catch (err) {
      console.error("Analysis error:", err);

      // Improved error handling with more specific messages
      let errorMessage =
        "Terjadi kesalahan saat menganalisis. Mohon coba lagi.";

      if (
        err.message.includes("Timeout") ||
        err.message.includes("waktu terlalu lama")
      ) {
        errorMessage =
          "Analisis memakan waktu terlalu lama. Silakan coba lagi dengan teks yang lebih pendek.";
      } else if (err.message.includes("Terlalu banyak permintaan")) {
        errorMessage =
          "Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.";
      } else if (err.message.includes("Akses ditolak")) {
        errorMessage = "Akses ditolak. Silakan refresh halaman dan coba lagi.";
      } else if (
        err.message.includes("CORS") ||
        err.message.includes("kebijakan CORS") ||
        err.message.includes("browser karena")
      ) {
        // Special handling for CORS errors with detailed explanation
        errorMessage = err.message;
      } else if (
        err.message.includes("Koneksi gagal") ||
        err.message.includes("Network")
      ) {
        errorMessage =
          "Koneksi internet bermasalah. Periksa koneksi Anda dan coba lagi.";
      } else if (err.message.includes("Server sedang mengalami")) {
        errorMessage =
          "Server sedang mengalami masalah. Silakan coba lagi dalam beberapa menit.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      setProgressMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 md:mb-4 px-2">
            Derana <span className="text-blue-600">AI Detector</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Sistem deteksi konten AI yang canggih untuk menganalisis dokumen dan
            teks apakah ditulis oleh AI atau manusia dengan akurasi tinggi
          </p>
        </motion.div>

        {/* API Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6 md:mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 md:p-4 shadow-sm border border-white/20">
            <div className="flex items-center gap-3 md:gap-4">
              <label className="text-sm md:text-base text-gray-700 font-medium">
                Mode API:
              </label>
              <button
                onClick={() => setUseRealAPI(!useRealAPI)}
                className={`
                  relative inline-flex h-6 w-11 md:h-7 md:w-12 items-center rounded-full transition-colors
                  ${useRealAPI ? "bg-blue-600" : "bg-gray-200"}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 md:h-5 md:w-5 transform rounded-full bg-white transition-transform
                    ${
                      useRealAPI
                        ? "translate-x-6 md:translate-x-7"
                        : "translate-x-1"
                    }
                  `}
                />
              </button>
              <span className="text-xs md:text-sm text-gray-600">
                {useRealAPI ? "Real API" : "Demo Mode"}
              </span>
            </div>
            {useRealAPI && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>CORS Notice:</strong> Real API calls may be blocked
                  by browser security. See CORS_SOLUTIONS.md for workarounds or
                  use Demo mode.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 px-4"
        >
          <div className="bg-white/70 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/20 shadow-sm hover:shadow-md transition-shadow">
            <Shield className="w-6 h-6 md:w-8 md:h-8 text-blue-600 mb-2 md:mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">
              Deteksi AI Akurat
            </h3>
            <p className="text-xs md:text-sm text-gray-600">
              Identifikasi konten yang ditulis AI dengan akurasi hingga 98%
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/20 shadow-sm hover:shadow-md transition-shadow">
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-600 mb-2 md:mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">
              Analisis Detail
            </h3>
            <p className="text-xs md:text-sm text-gray-600">
              Laporan lengkap dengan skor probabilitas dan statistik teks
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/20 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <Clock className="w-6 h-6 md:w-8 md:h-8 text-purple-600 mb-2 md:mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">
              Multi-Model Support
            </h3>
            <p className="text-xs md:text-sm text-gray-600">
              Deteksi konten dari ChatGPT, GPT-4, Claude, Bard, dan AI lainnya
            </p>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 md:p-8"
          >
            {/* Messages */}
            {error && (
              <Message
                type="error"
                message={error}
                onClose={() => setError(null)}
              />
            )}

            {success && (
              <Message
                type="success"
                message={success}
                onClose={() => setSuccess(null)}
              />
            )}

            {/* Toggle Buttons */}
            <ToggleButtons
              activeMode={inputMode}
              onModeChange={handleModeChange}
            />

            {/* Input Sections */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
              {/* Left Column - Input */}
              <div className="space-y-4 md:space-y-6">
                <FileUpload
                  disabled={inputMode !== "upload"}
                  onFileChange={handleFileChange}
                />

                <TextInput
                  disabled={inputMode !== "text"}
                  onTextChange={handleTextChange}
                />
              </div>

              {/* Right Column - Preview */}
              <div className="space-y-4 md:space-y-6">
                {inputMode === "upload" && selectedFile && (
                  <div className="space-y-4">
                    <PdfPreview file={selectedFile} />

                    {/* PDF Info */}
                    {pdfInfo && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-200 rounded-xl p-4 md:p-6"
                      >
                        <h4 className="font-semibold text-gray-800 mb-3 md:mb-4 text-sm md:text-base">
                          Informasi PDF
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                          <div>
                            <span className="text-gray-600">Nama File:</span>
                            <p className="font-medium text-gray-800 truncate">
                              {pdfInfo.fileName}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Halaman:</span>
                            <p className="font-medium text-gray-800">
                              {pdfInfo.numPages}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Ukuran:</span>
                            <p className="font-medium text-gray-800">
                              {(pdfInfo.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <p className="font-medium text-green-600">
                              {extractedText
                                ? "Teks Terekstrak"
                                : "Memproses..."}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Extracted Text Preview */}
                    {extractedText && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-200 rounded-xl p-4 md:p-6"
                      >
                        <h4 className="font-semibold text-gray-800 mb-3 md:mb-4 text-sm md:text-base">
                          Teks yang Diekstrak
                        </h4>
                        <div className="text-xs md:text-sm text-gray-600 mb-2">
                          {extractedText.length} karakter,{" "}
                          {
                            extractedText
                              .split(/\s+/)
                              .filter((word) => word.length > 0).length
                          }{" "}
                          kata
                        </div>
                        <div className="max-h-48 md:max-h-64 overflow-y-auto p-3 md:p-4 bg-gray-50 rounded-lg custom-scrollbar">
                          <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap">
                            {extractedText}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Extraction Progress */}
                    {isExtractingPDF && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-amber-200 rounded-xl p-4 md:p-6"
                      >
                        <h4 className="font-semibold text-amber-800 mb-3 md:mb-4 text-sm md:text-base">
                          Mengekstrak Teks PDF...
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                          <p className="text-xs md:text-sm text-amber-700">
                            {progressMessage || "Memproses..."}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {inputMode === "text" && inputText.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-200 rounded-xl p-4 md:p-6"
                  >
                    <h4 className="font-semibold text-gray-800 mb-3 md:mb-4 text-sm md:text-base">
                      Preview Teks
                    </h4>
                    <div className="max-h-48 md:max-h-64 overflow-y-auto p-3 md:p-4 bg-gray-50 rounded-lg custom-scrollbar">
                      <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap">
                        {inputText}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Process Button */}
            <ProcessButton
              disabled={false}
              loading={loading}
              onProcess={handleProcess}
              hasInput={hasValidInput()}
              inputType={inputMode}
              progressMessage={progressMessage}
            />

            {/* Results Section */}
            {results && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 md:mt-8 space-y-4 md:space-y-6"
              >
                {/* Main Results Card */}
                <div className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3 md:mb-4">
                    <Brain className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    <h3 className="text-base md:text-lg font-semibold text-blue-900">
                      Hasil AI Detection
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <div className="text-center p-3 md:p-4 bg-white rounded-lg">
                      <div
                        className={`text-xl md:text-2xl font-bold ${
                          results.ai_probability > 70
                            ? "text-red-600"
                            : results.ai_probability > 40
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {results.ai_probability || "0"}%
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        AI Generated
                      </div>
                    </div>
                    <div className="text-center p-3 md:p-4 bg-white rounded-lg">
                      <div
                        className={`text-xl md:text-2xl font-bold ${
                          results.human_probability > 70
                            ? "text-green-600"
                            : results.human_probability > 40
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {results.human_probability || "0"}%
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        Human Written
                      </div>
                    </div>
                    <div className="text-center p-3 md:p-4 bg-white rounded-lg sm:col-span-2 lg:col-span-1">
                      <div className="text-xl md:text-2xl font-bold text-purple-600">
                        {results.confidence_score || "0"}%
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        Confidence
                      </div>
                    </div>
                  </div>

                  {results.message && (
                    <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white rounded-lg">
                      <p className="text-sm md:text-base text-gray-700">
                        {results.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Text Statistics */}
                <div className="p-4 md:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <h4 className="text-base md:text-lg font-semibold text-green-900">
                      Statistik Teks
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg md:text-xl font-bold text-blue-600">
                        {results.word_count || "0"}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        Words
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg md:text-xl font-bold text-green-600">
                        {results.character_count || "0"}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        Characters
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg md:text-xl font-bold text-purple-600">
                        {results.sentence_count || "0"}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        Sentences
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg md:text-xl font-bold text-orange-600">
                        {results.reading_time || "0"} min
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        Reading Time
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Detected Models */}
                  {results.detected_models &&
                    results.detected_models.length > 0 && (
                      <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
                        <h4 className="text-base font-semibold text-yellow-900 mb-3">
                          Possible AI Models
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {results.detected_models.map((model, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-white rounded-full text-xs font-medium text-yellow-800"
                            >
                              {model}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Complexity Score */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                    <h4 className="text-base font-semibold text-purple-900 mb-3">
                      Text Complexity
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-white rounded-full h-3">
                        <div
                          className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${results.complexity_score || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-purple-800">
                        {results.complexity_score || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* API Details (hanya jika menggunakan real API) */}
                {useRealAPI && results.result_details && (
                  <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white rounded-lg">
                    <h5 className="text-sm md:text-base font-semibold text-gray-800 mb-2">
                      Detailed Analysis (by undetectable.ai)
                    </h5>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      {Object.entries(results.result_details).map(
                        ([key, value]) => (
                          <div key={key} className="bg-gray-50 p-2 rounded">
                            <div className="font-medium text-gray-600 capitalize">
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())}
                            </div>
                            <div className="text-gray-800 font-semibold">
                              {typeof value === "number" ? `${value}%` : value}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DeranaDeteksi;
