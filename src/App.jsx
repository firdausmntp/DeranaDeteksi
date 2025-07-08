import React from "react";
import Navbar from "./components/Navbar";
import DeranaDeteksi from "./components/DeranaDeteksi/DeranaDeteksi";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <DeranaDeteksi />
    </div>
  );
}

export default App;
