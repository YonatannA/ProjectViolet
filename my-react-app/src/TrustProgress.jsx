import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function TrustProgress({
  value,                 // 0-100
  status = "neutral",    
  size = 130,
  strokeWidth = 10,
}) {
  const v = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;

  const color =
    status === "safe"
      ? "#00ffc2"
      : status === "danger"
      ? "#ff4d6d"
      : status === "warning"
      ? "#ffd166"
      : "#7a7a7a";

  const text = typeof value === "number" ? `${v}%` : "--";

  return (
    <div style={{ width: size, height: size }}>
      <CircularProgressbar
        value={v}
        text={text}
        strokeWidth={strokeWidth}
        styles={buildStyles({
          pathColor: color,
          textColor: "rgba(255,255,255,0.92)",
          trailColor: "rgba(255,255,255,0.12)",
          pathTransitionDuration: 0.5,
        })}
      />
    </div>
  );
}
