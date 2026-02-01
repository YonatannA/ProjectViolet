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

      // 1️⃣ DETECT PERIMETER BLURRING (Face/Hair Boundaries)
      // We check points at the very edge of the face (e.g., forehead 10, jawline 152)
      // MediaPipe landmark 'visibility' drops when the model cannot find a sharp edge.
      const perimeterPoints = [10, 152, 234, 454]; 
      const avgVisibility = perimeterPoints.reduce((sum, id) => sum + (pts[id].visibility || 0), 0) / 4;
      const isBlurryBoundary = avgVisibility < 0.82; // Blurring causes low-confidence edge detection

      // 2️⃣ DETECT SQUINTING & GLASSY EYES
      // Measure Eye Aspect Ratio (EAR) for both eyes
      const leftEAR = Math.abs(pts[159].y - pts[145].y);
      const rightEAR = Math.abs(pts[386].y - pts[374].y);
      
      const isSquinting = (leftEAR < 0.018 || rightEAR < 0.018); // Narrowed eyes
      
      // 'Glassy' eyes often present as perfectly static pupils.
      // We check for 'Zero-Jitter' in the iris center (points 468-473)
      const irisX = pts[468].x;
      const isUnnaturallyStatic = Math.abs(irisX - (pts[468].lastX || irisX)) < 0.0001;
      pts[468].lastX = irisX;

      // 3️⃣ DEPTH & PROFILE (Existing Z-Delta Logic)
      const noseTip = pts[1];
      const zDelta = Math.abs(noseTip.z - (pts[234].z + pts[454].z) / 2);
      const isFlat = zDelta < 0.035;

      // 🚨 AGGREGATED LIVENESS SCORE
      if (isFlat || isBlurryBoundary) {
        failureBuffer.current += 3; // High weight for physical edge failure
      } else if (isSquinting || isUnnaturallyStatic) {
        failureBuffer.current += 1.5; // Weight for biological/behavioral red flags
      } else {
        failureBuffer.current = Math.max(0, failureBuffer.current - 5);
      }

      const isFailed = failureBuffer.current > 20;
      setAdhesionFailure(isFailed);
      
      // Detailed status mapping for the UI
      if (isFailed) return isBlurryBoundary ? "PHYSICAL_FAIL_BLUR" : "PHYSICAL_FAIL_Z_DEPTH";
      if (isSquinting) return "BEHAVIORAL_SQUINT";
      if (isUnnaturallyStatic) return "BEHAVIORAL_STATIC_EYE";
      
      return "Normal";
    }
    return "Normal";
  };

  return { adhesionFailure, calculateAdhesion, isReady: !!landmarker };
};