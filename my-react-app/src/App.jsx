import React, { useEffect, useRef, useState } from 'react';
import "./App.css"; 
import { useFaceAnalysis } from './hooks/useFaceAnalysis';
import TrustProgress from "./TrustProgress"; 

export default function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null); 
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  
  // Layer 1: MediaPipe 3D Landmark Analysis
  const { adhesionFailure, calculateAdhesion, isReady } = useFaceAnalysis();
  const [isChallengeActive, setIsChallengeActive] = useState(false);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: "always" },
        audio: false 
      });
      streamRef.current = stream;
      setCapturing(true);

      // Handle user stopping share via browser UI
      stream.getTracks().forEach((track) => {
        track.onended = () => stopCapture();
      });

      if (videoRef.current) videoRef.current.srcObject = stream;
      
      // Initial scan trigger
      setTimeout(runScan, 600);
    } catch (err) {
      console.error("Error starting screen capture:", err);
    }
  };

  const stopCapture = () => {
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCapturing(false);
    setResult(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (!capturing) return;

    const interval = setInterval(() => {
      if (!loading) runScan(); 
    }, 5000); 
    
    return () => clearInterval(interval);
  }, [capturing, loading, isChallengeActive]);

  const runScan = async () => {
    const stream = streamRef.current || videoRef.current?.srcObject;
    if (!capturing || !videoRef.current || videoRef.current.readyState !== 4) return;
    
    // Local 3D Physical check
    const profileStatus = calculateAdhesion(videoRef.current, isChallengeActive);
    
    setLoading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.8));
      if (!blob) return;

      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");
      formData.append("transcript", `Liveness Status: ${profileStatus}. Challenge Active: ${isChallengeActive}`);

      const res = await fetch("http://127.0.0.1:8000/analyze", { 
        method: "POST", 
        body: formData 
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper values for the UI
  const trustScore = result?.gemini_report?.forensic_analysis?.true_trust_score || 0;
  const statusClass = trustScore >= 70 ? "safe" : trustScore < 50 ? "danger" : "warning";

  return (
    <div className={`app-container ${statusClass}`} style={{ backgroundColor: 'black', color: '#00ff00', minHeight: '100vh', fontFamily: 'monospace' }}>
      <header className="header" style={{ borderBottom: '1px solid #004400', padding: '20px', textAlign: 'center' }}>
        <h1>🛡️ SENTINEL AI / CallGuard</h1>
        <p style={{ color: '#888' }}>Real-time deepfake & behavioral detection.</p>
      </header>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
        
        {/* Unified Control Buttons */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          {!capturing ? (
            <button onClick={startCapture} className="hud-button" style={{ padding: '12px 24px', cursor: 'pointer' }}>
              ACTIVATE TRACKER
            </button>
          ) : (
            <button onClick={stopCapture} className="hud-button" style={{ padding: '12px 24px', cursor: 'pointer', backgroundColor: '#440000' }}>
              STOP CAPTURE
            </button>
          )}
          
          <button 
            onClick={() => setIsChallengeActive(!isChallengeActive)}
            className="hud-button"
            style={{ 
              padding: '12px 24px', 
              cursor: 'pointer',
              backgroundColor: isChallengeActive ? '#004400' : '#111',
              color: 'white',
              border: '1px solid #00ff00'
            }}
          >
            {isChallengeActive ? "3D SCAN: ON" : "3D SCAN: OFF"}
          </button>
        </div>

        {/* Top Status Bar */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', color: capturing ? '#00ff00' : '#555' }}>
            {capturing ? "SYSTEM LIVE: Scanning stream..." : "Awaiting tracker activation..."}
          </div>
        </div>
        
        <div className="video-viewport-container" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '30px' }}>
          <div className="video-viewport" style={{ position: 'relative' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '640px', border: '2px solid #00ff00', borderRadius: '8px' }} />
            
            {loading && <div className="scan-line-animation" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: '#00ff00', boxShadow: '0 0 15px #00ff00', zIndex: 5, animation: 'scanline 2s linear infinite' }} />}

            {adhesionFailure && isChallengeActive && (
              <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'red', color: 'white', padding: '10px 20px', fontWeight: 'bold', borderRadius: '4px', zIndex: 10, border: '2px solid white', animation: 'blink 1s infinite' }}>
                ⚠️ PHYSICAL ADHESION FAILURE ⚠️
              </div>
            )}
          </div>

          {/* Integration of the TrustMeter Panel */}
          {result && (
            <div className={`trust-meter-panel ${statusClass}`} style={{ textAlign: 'center', padding: '20px', border: '1px solid #333', borderRadius: '8px' }}>
              <TrustProgress value={trustScore} status={statusClass} size={150} />
              <div style={{ marginTop: '10px', fontWeight: 'bold' }}>GLOBAL TRUST</div>
            </div>
          )}
        </div>

        {/* Combined Forensic HUD */}
        <div style={{ width: '100%', maxWidth: '1100px' }}>
          {result && result.gemini_report && (
            <div style={{ display: 'flex', gap: '20px' }}>
              
              {/* Forensic Score Box */}
              <div style={{ border: '2px solid #00ff00', padding: '15px', flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.8rem' }}>FORENSIC PIXEL SCORE</h3>
                <h2 style={{ fontSize: '2.2rem', margin: '5px 0', color: result.gemini_report.forensic_analysis.true_trust_score < 50 ? 'red' : '#00ff00' }}>
                  {result.gemini_report.forensic_analysis.true_trust_score}%
                </h2>
                <p style={{ fontSize: '11px', textAlign: 'left', whiteSpace: 'pre-wrap', color: '#00ff00', borderTop: '1px solid #004400', paddingTop: '10px' }}>
                  {result.gemini_report.forensic_analysis.details}
                </p>
              </div>

              {/* Behavioral Score Box */}
              <div style={{ border: '2px solid #00aaff', padding: '15px', flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#00aaff' }}>BEHAVIORAL TRUE SCORE</h3>
                <h2 style={{ fontSize: '2.2rem', margin: '5px 0', color: result.gemini_report.behavioral_analysis.behavioral_trust_score < 50 ? 'red' : '#00aaff' }}>
                  {result.gemini_report.behavioral_analysis.behavioral_trust_score}%
                </h2>
                <p style={{ fontSize: '11px', textAlign: 'left', whiteSpace: 'pre-wrap', color: '#00aaff', borderTop: '1px solid #003366', paddingTop: '10px' }}>
                  {result.gemini_report.behavioral_analysis.details}
                </p>
              </div>

              {/* 3D Physical Scan Box */}
              <div style={{ border: `2px solid ${result.mediaPipe_raw === 'FAIL' ? 'red' : '#00ff00'}`, padding: '15px', flex: 1 }}>
                <h3 style={{ fontSize: '0.8rem' }}>3D PHYSICAL SCAN</h3>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  STATUS: {result.mediaPipe_raw === 'FAIL' ? '🔴 FAIL' : '🟢 PASS'}
                </p>
                <p style={{ fontSize: '10px', marginTop: '10px', color: '#aaa' }}>
                  {result.physical_explanation}
                </p>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}