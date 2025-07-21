import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Menu, X, Wifi, WifiOff } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    isOnline: false,
    lastChecked: null,
    isChecking: false,
  });

  // Update waktu setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Fungsi untuk check API status
  const checkApiStatus = async () => {
    setApiStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      // Ganti dengan URL API Anda
      const response = await fetch(
        "https://semenjana.biz.id/allin/api/v1/health",
        {
          method: "GET",
          timeout: 5000, // 5 detik timeout
        }
      );

      if (response.ok && response.status === 200) {
        setApiStatus({
          isOnline: true,
          lastChecked: new Date(),
          isChecking: false,
        });
      } else {
        setApiStatus({
          isOnline: false,
          lastChecked: new Date(),
          isChecking: false,
        });
      }
    } catch (error) {
      console.error("API Check failed:", error);
      setApiStatus({
        isOnline: false,
        lastChecked: new Date(),
        isChecking: false,
      });
    }
  };

  // Check API status setiap 30 detik
  useEffect(() => {
    // Check immediately on mount
    checkApiStatus();

    // Then check every 30 seconds
    const apiTimer = setInterval(checkApiStatus, 30000);

    return () => clearInterval(apiTimer);
  }, []);

  const formatDateTime = (date) => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusDisplay = () => {
    if (apiStatus.isChecking) {
      return {
        text: "CHECKING...",
        icon: Clock,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      };
    }

    if (apiStatus.isOnline) {
      return {
        text: "ONLINE",
        icon: Wifi,
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    }

    return {
      text: "OFFLINE",
      icon: WifiOff,
      color: "text-red-600",
      bgColor: "bg-red-100",
    };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-slate-200/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 sm:gap-3"
            >
              <img
                src={import.meta.env.BASE_URL + "derana.png"}
                alt="Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
              />
              <span className="text-lg sm:text-xl font-bold text-gray-900">
                <span className="hidden sm:inline">Derana Deteksi</span>
                <span className="sm:hidden">Derana</span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isHomePage
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                }`}
              >
                Dashboard
              </Link>
            </div>

            {/* API Status */}
            <div className="flex items-center gap-4 border-l pl-6">
              <motion.div
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bgColor} ${status.color}`}
                whileHover={{ scale: 1.02 }}
                title={`Last checked: ${
                  apiStatus.lastChecked
                    ? formatDateTime(apiStatus.lastChecked)
                    : "Never"
                }`}
              >
                <StatusIcon size={14} />
                <span className="text-xs font-medium">{status.text}</span>
              </motion.div>

              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={14} />
                <span className="text-xs">{formatDateTime(currentTime)}</span>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 pt-4 border-t border-gray-300"
          >
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isHomePage
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>

              {/* Mobile API Status */}
              <div className="px-4 py-2 space-y-2">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${status.bgColor} ${status.color}`}
                >
                  <StatusIcon size={16} />
                  <span className="text-sm font-medium">API {status.text}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} />
                  <span className="text-sm">{formatDateTime(currentTime)}</span>
                </div>

                {apiStatus.lastChecked && (
                  <div className="text-xs text-gray-500">
                    Last checked: {formatDateTime(apiStatus.lastChecked)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
