import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-slate-200/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <img
                src="/derana.png"
                alt="Logo"
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-xl font-bold text-gray-900">
                Derana Deteksi
              </span>
            </motion.div>
          </Link>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 ">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg font-medium hidden sm:inline transition-colors ${
                  isHomePage
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                }`}
              >
                Dashboard
              </Link>
            </div>

            <div className="flex items-center gap-2 text-gray-900 border-l pl-6">
              <Clock size={16} className="hidden sm:inline" />
              <span className="text-sm hidden sm:inline">
                Update:{" "}
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
