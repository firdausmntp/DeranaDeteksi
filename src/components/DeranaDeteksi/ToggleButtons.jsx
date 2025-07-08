import React from "react";
import { motion } from "framer-motion";
import { Upload, Type } from "lucide-react";

const ToggleButtons = ({ activeMode, onModeChange }) => {
  const modes = [
    {
      id: "upload",
      label: "Upload Document",
      icon: Upload,
      description: "Upload file PDF untuk AI detection",
    },
    {
      id: "text",
      label: "Paste Text",
      icon: Type,
      description: "Paste teks langsung untuk AI detection",
    },
  ];

  return (
    <div className="mb-6 md:mb-8">
      <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4 px-1">
        Pilih Mode Input
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;

          return (
            <motion.button
              key={mode.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onModeChange(mode.id)}
              className={`
                relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200 text-left
                ${
                  isActive
                    ? "border-blue-500 bg-blue-50 shadow-lg"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                }
              `}
            >
              <div className="flex items-center gap-3 md:gap-4">
                <div
                  className={`
                  p-2 md:p-3 rounded-lg flex-shrink-0
                  ${
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  }
                `}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4
                    className={`font-semibold text-sm md:text-base ${
                      isActive ? "text-blue-900" : "text-gray-900"
                    }`}
                  >
                    {mode.label}
                  </h4>
                  <p
                    className={`text-xs md:text-sm mt-1 ${
                      isActive ? "text-blue-700" : "text-gray-600"
                    }`}
                  >
                    {mode.description}
                  </p>
                </div>
              </div>

              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 md:top-3 right-2 md:right-3 w-2 h-2 md:w-3 md:h-3 bg-blue-500 rounded-full"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ToggleButtons;
