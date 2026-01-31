import React from "react";
import "./App.css";

function App() {
  const handleScanClick = () => {
    console.log("Scan button clicked!");
    alert("Scanning your desktop... (logic coming soon)");
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>AI Scamm Video Checkerr</h1>
        <p>Deetect potential scam videos on your system instantly.</p>
      </header>

      <main className="main-content">
        <div className="hero">
          <p className="hero-text">
            click the buton below to start scanning your desktop
          </p>
          <button className="scan-button" onClick={handleScanClick}>
            Scan My Desktop
          </button>
        </div>
      </main>

      <footer className="footer">
        <p>© 2026 AI Scam Checker</p>
      </footer>
    </div>
  );
}

export default App;
