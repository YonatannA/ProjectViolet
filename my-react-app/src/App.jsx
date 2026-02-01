import React, { useEffect, useRef, useState } from 'react';
import "./App.css"; 
import { useFaceAnalysis } from './hooks/useFaceAnalysis';

export default function App() {
  const videoRef = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 🛡️ Layer 1: MediaPipe 3D Landmark Analysis
  const { adhesionFailure, calculateAdhesion, isReady } = useFaceAnalysis();
  const [isChallengeActive, setIsChallengeActive] = useState(false);

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

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && videoRef.current?.srcObject) runScan(); 
    }, 20000); 
    return () => clearInterval(interval);
  }, [loading, isChallengeActive]);

  const runScan = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    
    const profileStatus = calculateAdhesion(videoRef.current, isChallengeActive);
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
    formData.append("transcript", `Liveness Status: ${profileStatus}. Challenge Active: ${isChallengeActive}`);

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
        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
          <button onClick={startCapture} className="hud-button" style={{ padding: '10px', cursor: 'pointer' }}>
            ACTIVATE TRACKER
          </button>
          
          <button 
            onClick={() => setIsChallengeActive(!isChallengeActive)}
            className="hud-button"
            style={{ 
              padding: '10px', 
              cursor: 'pointer',
              backgroundColor: isChallengeActive ? '#440000' : '#111',
              color: 'white',
              border: '1px solid #00ff00'
            }}
          >
            {isChallengeActive ? "STOP 3D SCAN" : "RUN SCAN"}
          </button>
        </div>

        {/* 🛠️ Top Status Bar & Description Logic */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', color: videoRef.current?.srcObject ? '#00ff00' : '#555' }}>
            {videoRef.current?.srcObject ? "Real-Time Tracker has begun scanning." : "Awaiting tracker activation..."}
          </div>
          {videoRef.current?.srcObject && (
            <div style={{ fontSize: '11px', color: '#888', marginTop: '5px', maxWidth: '400px' }}>
              Maps 468 3D facial landmarks to detect flat screen overlays or 2D masks.
            </div>
          )}
        </div>
        
        <div className="video-viewport" style={{ position: 'relative', marginBottom: '20px' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '640px', border: '2px solid #00ff00', borderRadius: '8px' }} />
          
          {loading && (
            <div className="scan-line-animation" style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
              background: '#00ff00', boxShadow: '0 0 15px #00ff00', zIndex: 5,
              animation: 'scanline 2s linear infinite'
            }} />
          )}

          {adhesionFailure && isChallengeActive && (
            <div style={{ 
              position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
              backgroundColor: 'red', color: 'white', padding: '10px 20px', fontWeight: 'bold',
              borderRadius: '4px', zIndex: 10, border: '2px solid white', animation: 'blink 1s infinite'
            }}>
              ⚠️ PHYSICAL ADHESION FAILURE ⚠️
            </div>
          )}
        </div>

      {/* 🛠️ Forensic Output Boxes (Three Columns) */}
      <div style={{ width: '100%', maxWidth: '1100px' }}>
        {result && result.gemini_report && (
          <div style={{ display: 'flex', gap: '20px' }}>
            
            {/* Pillar 1: Forensic Score (Pixels & Edges) */}
            <div style={{ border: '2px solid #00ff00', padding: '15px', flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.8rem' }}>FORENSIC PIXEL SCORE</h3>
              <h2 style={{ 
                fontSize: '2.2rem', 
                margin: '5px 0', 
                color: result.gemini_report.forensic_analysis.true_trust_score < 50 ? 'red' : '#00ff00' 
              }}>
                {result.gemini_report.forensic_analysis.true_trust_score}%
              </h2>
              <p style={{ fontSize: '11px', textAlign: 'left', whiteSpace: 'pre-wrap', color: '#00ff00', borderTop: '1px solid #004400', paddingTop: '10px' }}>
                {result.gemini_report.forensic_analysis.details}
              </p>
            </div>

            {/* Pillar 2: Behavioral Score (Human Tells) */}
            <div style={{ border: '2px solid #00aaff', padding: '15px', flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#00aaff' }}>BEHAVIORAL TRUE SCORE</h3>
              <h2 style={{ 
                fontSize: '2.2rem', 
                margin: '5px 0', 
                color: result.gemini_report.behavioral_analysis.behavioral_trust_score < 50 ? 'red' : '#00aaff' 
              }}>
                {result.gemini_report.behavioral_analysis.behavioral_trust_score}%
              </h2>
              <p style={{ fontSize: '11px', textAlign: 'left', whiteSpace: 'pre-wrap', color: '#00aaff', borderTop: '1px solid #003366', paddingTop: '10px' }}>
                {result.gemini_report.behavioral_analysis.details}
              </p>
            </div>

            {/* Pillar 3: Physical Scan (3D Liveness) */}
            <div style={{ border: `2px solid ${result.mediaPipe_raw === 'FAIL' ? 'red' : '#00ff00'}`, padding: '20px', flex: 1 }}>
              <h3 style={{ fontSize: '0.8rem' }}>3D PHYSICAL SCAN</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                STATUS: {result.mediaPipe_raw === 'FAIL' ? '🔴 FAIL' : '🟢 PASS'}
              </p>
              <p style={{ fontSize: '10px', marginTop: '10px', color: '#aaa' }}>
                {result.physical_explanation} {/* 🛠️ Uses the new detailed explanation from main.py */}
              </p>
            </div>

          </div>
        )}
      </div>
      </main>
    </div>
  );
}