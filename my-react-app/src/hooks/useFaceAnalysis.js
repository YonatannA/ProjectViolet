import { useEffect, useState, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export const useFaceAnalysis = () => {
  const [landmarker, setLandmarker] = useState(null);
  const [adhesionFailure, setAdhesionFailure] = useState(false);
  const failureBuffer = useRef(0); 

  useEffect(() => {
    async function init() {
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const instance = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1
      });
      setLandmarker(instance);
    }
    init();
  }, []);

  const calculateAdhesion = (videoElement, isActive) => {
    if (!landmarker || !videoElement || !isActive) {
      setAdhesionFailure(false);
      return "Normal";
    }

    const results = landmarker.detectForVideo(videoElement, Date.now());
    if (results.faceLandmarks?.[0]) {
      const pts = results.faceLandmarks[0];

      // FEATURE: Z-AXIS DELTA (Anti-2D Spoofing)
      // Tip of nose vs. Average of both ears
      const noseTip = pts[1];
      const leftEar = pts[234];
      const rightEar = pts[454];
      const zDelta = Math.abs(noseTip.z - (leftEar.z + rightEar.z) / 2);
      const isFlat = zDelta < 0.035; // Screens have near-zero depth

      // 2FEATURE: PROFILE CHALLENGE (Yaw Tracking)
      // Measure rotation: Difference in X-span of nose to each ear
      const leftSpan = Math.abs(noseTip.x - leftEar.x);
      const rightSpan = Math.abs(noseTip.x - rightEar.x);
      const yawRatio = leftSpan / (rightSpan || 0.001);
      const isExtremeProfile = yawRatio < 0.3 || yawRatio > 3.0; // Subject turned 90 deg

      // FEATURE: BLINK DETECTION (Biological Tells)
      // Eye Aspect Ratio (EAR) for the left eye
      // Points 159 & 145 (upper/lower lid) and 133 & 33 (corners)
      const eyeTop = pts[159];
      const eyeBottom = pts[145];
      const eyeDistance = Math.sqrt(Math.pow(eyeTop.x - eyeBottom.x, 2) + Math.pow(eyeTop.y - eyeBottom.y, 2));
      const isBlinking = eyeDistance < 0.015; // Lids are nearly touching

      // AGGREGATED LIVENESS LOGIC
      // If flat, or if profile check "glitches" landmarks, increment failure
      if (isFlat || (isExtremeProfile && isFlat)) {
        failureBuffer.current += 1;
      } else {
        failureBuffer.current = Math.max(0, failureBuffer.current - 5);
      }

      const isFailed = failureBuffer.current > 20;
      setAdhesionFailure(isFailed);
      
      return isFailed ? "PHYSICAL_LIVENESS_FAIL" : (isBlinking ? "BLINK_DETECTED" : "Normal");
    }
    return "Normal";
  };

  return { adhesionFailure, calculateAdhesion, isReady: !!landmarker };
};