import React, { useState } from "react";
import { motion } from "framer-motion";
import { Type, AlertCircle } from "lucide-react";

const TextInput = ({ disabled, onTextChange }) => {
  const [text, setText] = useState("");
  const [stats, setStats] = useState({
    wordCount: 0,
    charCount: 0,
    charCountNoSpaces: 0,
    sentenceCount: 0,
    paragraphCount: 0,
    readingTime: 0,
  });

  const calculateStats = (text) => {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const charCountNoSpaces = text.replace(/\s/g, "").length;
    const readingTime = Math.ceil(words.length / 200); // Average 200 words per minute

    return {
      wordCount: words.length,
      charCount: text.length,
      charCountNoSpaces,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      readingTime: readingTime || 0,
    };
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    const newStats = calculateStats(newText);
    setStats(newStats);

    onTextChange(newText);
  };

  const handleClear = () => {
    setText("");
    setStats({
      wordCount: 0,
      charCount: 0,
      charCountNoSpaces: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      readingTime: 0,
    });
    onTextChange("");
  };

  if (disabled) {
    return (
      <div className="p-6 md:p-8 border-2 border-gray-200 border-dashed rounded-xl bg-gray-50">
        <div className="text-center text-gray-400">
          <AlertCircle className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4" />
          <p className="text-sm md:text-base">Mode text input tidak aktif</p>
          <p className="text-xs md:text-sm mt-1">
            Pilih "Paste Text" untuk menggunakan fitur ini
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 md:space-y-4"
    >
      <div className="relative">
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <Type className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-700 text-sm md:text-base">
            Input Teks
          </h4>
        </div>

        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Paste atau ketik teks yang ingin dideteksi AI-nya di sini..."
          className="
            w-full h-48 md:h-64 p-3 md:p-4 border-2 border-gray-300 rounded-xl resize-none text-sm md:text-base
            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none
            transition-all duration-200 bg-white
          "
        />

        {/* Statistics Bar */}
        <div className="mt-2 md:mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 text-center">
            <div>
              <div className="text-sm md:text-base font-semibold text-blue-600">
                {stats.wordCount}
              </div>
              <div className="text-xs text-gray-600">Words</div>
            </div>
            <div>
              <div className="text-sm md:text-base font-semibold text-green-600">
                {stats.charCount}
              </div>
              <div className="text-xs text-gray-600">Characters</div>
            </div>
            <div>
              <div className="text-sm md:text-base font-semibold text-purple-600">
                {stats.charCountNoSpaces}
              </div>
              <div className="text-xs text-gray-600">No Spaces</div>
            </div>
            <div>
              <div className="text-sm md:text-base font-semibold text-orange-600">
                {stats.sentenceCount}
              </div>
              <div className="text-xs text-gray-600">Sentences</div>
            </div>
            <div>
              <div className="text-sm md:text-base font-semibold text-pink-600">
                {stats.paragraphCount}
              </div>
              <div className="text-xs text-gray-600">Paragraphs</div>
            </div>
            <div>
              <div className="text-sm md:text-base font-semibold text-indigo-600">
                {stats.readingTime} min
              </div>
              <div className="text-xs text-gray-600">Reading</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2">
          <div className="text-xs md:text-sm text-gray-500">
            {stats.wordCount > 0 && (
              <span>
                Total: {stats.wordCount} kata • {stats.charCount} karakter
              </span>
            )}
          </div>

          {text && (
            <button
              onClick={handleClear}
              className="
                px-2 md:px-3 py-1 text-xs md:text-sm text-red-600 hover:text-red-700 
                hover:bg-red-50 rounded-lg transition-colors
              "
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {text.trim().length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs md:text-sm font-medium text-blue-800">
              Teks siap untuk AI detection
            </span>
          </div>
        </motion.div>
      )}

      {/* Info about HTML cleaning */}
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 <strong>Tips:</strong> Teks akan otomatis dibersihkan dari tag HTML
          seperti &lt;br&gt;, &lt;p&gt;, &lt;div&gt; dan diformat dengan benar.
        </p>
      </div>
    </motion.div>
  );
};

export default TextInput;
