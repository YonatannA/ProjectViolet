import React, { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [result, setResult] = useState(null);
  const [capturing, setCapturing] = useState(false);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });

      streamRef.current = stream;
      setCapturing(true);

      // If user stops sharing, reset
      stream.getTracks().forEach((track) => {
        track.onended = () => stopCapture();
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Run one scan shortly after capture begins
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
      runScan();
    }, 20000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing]);

  const runScan = async () => {
    const stream = streamRef.current || videoRef.current?.srcObject;
    const track = stream?.getVideoTracks?.()[0];

    if (!capturing || !track || track.readyState !== "live") return;
    if (!videoRef.current || videoRef.current.videoWidth === 0) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      );
      if (!blob) return;

      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");
      formData.append("transcript", "Live identity verification scan.");

      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Scan failed:", error);
    }
  };

  const trustScore =
    typeof result?.trust_score === "number" ? result.trust_score : null;

  const statusClass =
    trustScore == null
      ? "neutral"
      : trustScore >= 70
      ? "safe"
      : trustScore < 50
      ? "danger"
      : "warning";

  return (
    <div className="app-container">
      <header className="header">
        <h1>🛡️ SENTINEL AI</h1>
        <p>Real-time call video call scam detection, right on your device.</p>
      </header>

      <main className="main-content">
        {!capturing ? (
          <button className="scan-button" onClick={startCapture}>
            START CAPTURE
          </button>
        ) : (
          <button className="scan-button" onClick={stopCapture}>
            STOP CAPTURE
          </button>
        )}

        <div className={`video-viewport ${statusClass}`}>
          <video ref={videoRef} autoPlay playsInline className="video-feed" />
          <div className="hud-corners" aria-hidden="true" />
        </div>

        <div className="results-hud">
          <div className="hud-row">
            <span className="hud-label">STATUS</span>
            <span className={`hud-pill ${statusClass}`}>
              {statusClass.toUpperCase()}
            </span>
          </div>

          <div className="hud-row">
            <span className="hud-label">TRUST SCORE</span>
            <span className={`hud-score ${statusClass}`}>
              {trustScore == null ? "--" : `${trustScore}%`}
            </span>
          </div>

          <div className="hud-reason">
            {result?.reason ? result.reason : "Waiting for first scan..."}
          </div>
        </div>
      </main>
    </div>
  );
}
