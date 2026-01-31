import React, { useEffect, useRef, useState } from 'react';
import "./App.css"; 

export default function App() {
  const videoRef = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { 
        if (videoRef.current) videoRef.current.srcObject = stream; 
      });
  }, []);

  const runScan = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
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
    }, "image/jpeg");
  };

  return (
    <div className="app-container" style={{ backgroundColor: 'black', color: '#00ff00', minHeight: '100vh', fontFamily: 'monospace' }}>
      <header className="header" style={{ borderBottom: '1px solid #004400', padding: '20px', textAlign: 'center' }}>
        <h1>🛡️ SENTINEL AI</h1>
        <p>Forensic Deepfake Detection Active</p>
      </header>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
        <div className="video-viewport" style={{ position: 'relative', marginBottom: '20px' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '640px', border: '2px solid #00ff00', borderRadius: '8px' }} />
          {/* Using their button class but your function */}
          <button className="scan-button" onClick={runScan} disabled={loading} style={{ 
            display: 'block', margin: '20px auto', padding: '15px 30px', 
            background: '#00ff00', color: 'black', fontWeight: 'bold', cursor: 'pointer' 
          }}>
            {loading ? "ANALYZING..." : "RUN IDENTITY SCAN"}
          </button>
        </div>

        {result && (
          <div className="results-hud" style={{ border: '1px solid #00ff00', padding: '20px', width: '100%', maxWidth: '640px', textAlign: 'left' }}>
            <h3 style={{ color: result.trust_score < 50 ? 'red' : '#00ff00' }}>
              TRUST SCORE: {result.trust_score}%
            </h3>
            <div className="meters">
              <p>Visual Adhesion: {result.visual_score}%</p>
              <p>Context Logic: {result.logic_score}%</p>
            </div>
            <p style={{ marginTop: '10px', color: '#888' }}>{result.reason}</p>
          </div>
        )}
      </main>

      <footer className="footer" style={{ textAlign: 'center', padding: '20px', fontSize: '0.8rem', opacity: 0.6 }}>
        <p>© 2026 SENTINEL // ProjectViolet</p>
      </footer>
    </div>
  );
}