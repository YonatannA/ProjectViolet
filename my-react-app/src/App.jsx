import React, { useEffect, useRef, useState } from 'react';
import "./App.css"; 

export default function App() {
  const videoRef = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Manual trigger for screen capture to avoid browser security blocks
  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: "always" },
        audio: false 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error starting screen capture:", err);
    }
  };

  // Auto-scan every 10 seconds ONLY if video is active
  useEffect(() => {
  const interval = setInterval(() => {
    if (!loading) runScan(); 
  }, 20000); 
  return () => clearInterval(interval);
}, [loading]);

  const runScan = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    setLoading(true);
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.8));

    if (!blob) {
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", blob, "frame.jpg");
    formData.append("transcript", "Live identity verification scan.");

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", { 
        method: "POST", 
        body: formData 
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Connection to backend failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: 'black', color: '#00ff00', minHeight: '100vh', fontFamily: 'monospace' }}>
      <header className="header" style={{ borderBottom: '1px solid #004400', padding: '20px', textAlign: 'center' }}>
        <h1>🛡️ SENTINEL AI</h1>
      </header>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
        <button onClick={startCapture} style={{ marginBottom: '20px', padding: '10px', cursor: 'pointer' }}>
          ACTIVATE CALLER TRACKER
        </button>
        
        <div className="video-viewport" style={{ position: 'relative', marginBottom: '20px' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '640px', border: '2px solid #00ff00', borderRadius: '8px' }} />
        </div>

        {result && (
          <div className="results-hud" style={{ border: '1px solid #00ff00', padding: '20px', width: '100%', maxWidth: '640px' }}>
            <h3 style={{ color: result.trust_score < 50 ? 'red' : '#00ff00' }}>
              TRUST SCORE: {result.trust_score}%
            </h3>
            <p>{result.reason}</p>
          </div>
        )}
      </main>
    </div>
  );
}