import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const Loading = ({ message = "Loading...", size = "default" }) => {
  const sizeClasses = {
    small: "w-3 h-3 md:w-4 md:h-4",
    default: "w-5 h-5 md:w-6 md:h-6",
    large: "w-6 h-6 md:w-8 md:h-8",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center gap-2 md:gap-3"
    >
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && (
        <span className="text-gray-600 text-xs md:text-sm">{message}</span>
      )}
    </motion.div>
  );
};

export default Loading;
