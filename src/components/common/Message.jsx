import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const Message = ({ type = "info", message, onClose, autoClose = true }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoClose && type !== "error") {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [autoClose, type, onClose]);

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      iconColor: "text-green-600",
    },
    error: {
      icon: XCircle,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      iconColor: "text-red-600",
    },
    warning: {
      icon: AlertCircle,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-600",
    },
    info: {
      icon: AlertCircle,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      iconColor: "text-blue-600",
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`
            ${config.bgColor} ${config.borderColor} ${config.textColor}
            border rounded-lg p-3 md:p-4 mb-3 md:mb-4 flex items-start gap-2 md:gap-3 shadow-sm
          `}
        >
          <Icon
            className={`${config.iconColor} w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0`}
          />
          <div className="flex-1 min-w-0">
            {Array.isArray(message) ? (
              <ul className="space-y-1">
                {message.map((msg, index) => (
                  <li key={index} className="text-xs md:text-sm">
                    • {msg}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs md:text-sm">{message}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
            >
              <X className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Message;
