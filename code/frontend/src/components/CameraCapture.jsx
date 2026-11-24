import { useEffect, useRef, useState } from "react";

/**
 * Live front-camera view. The viewfinder uses the stream's own aspect ratio
 * and is never cropped, so the captured photo matches what the user framed.
 * The preview is mirrored like a mirror; the saved photo is mirrored the
 * same way so it looks identical to what was on screen.
 */
export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [ratio, setRatio] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera here. Camera access needs HTTPS or localhost. Upload a photo instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch {
        if (!cancelled) setError("Camera access was blocked or no camera was found. Allow access in your browser, or upload a photo instead.");
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function handleMetadata() {
    const video = videoRef.current;
    if (video?.videoWidth && video?.videoHeight) setRatio(video.videoWidth / video.videoHeight);
  }

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("The photo couldn't be captured. Try again or upload a photo instead.");
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  if (error) {
    return (
      <div className="camera-message" role="alert">
        <p>{error}</p>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onCancel}>
          Upload a photo instead
        </button>
      </div>
    );
  }

  return (
    <div className="camera">
      <div className="camera-frame" style={ratio ? { aspectRatio: String(ratio) } : undefined}>
        <video ref={videoRef} className="camera-video" playsInline muted onLoadedMetadata={handleMetadata} />
        {!ratio && <p className="camera-waiting">Starting camera…</p>}
        <div className="camera-guide" aria-hidden="true" />
      </div>
      <div className="camera-controls">
        <button type="button" className="btn btn-quiet btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="shutter" onClick={capture} disabled={!ratio} aria-label="Take photo">
          <span />
        </button>
        <span className="camera-tip">Face the light, look straight ahead</span>
      </div>
    </div>
  );
}
