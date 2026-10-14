import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AnalysisProgress from "../components/AnalysisProgress";
import CameraCapture from "../components/CameraCapture";
import ChipInput from "../components/ChipInput";
import StepIndicator from "../components/StepIndicator";
import { AlertIcon, ArrowRightIcon, CameraIcon, UploadIcon } from "../components/Icons";
import { predictFromImage, predictManual, uploadPhoto } from "../api/client";
import { useAnalysis } from "../context/AnalysisContext";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SKIN_TYPE_OPTIONS = [
  { value: "oily", label: "Oily", hint: "Shiny by midday, visible pores" },
  { value: "dry", label: "Dry", hint: "Tight, flaky in places" },
  { value: "normal", label: "Normal", hint: "Balanced, few concerns" },
];

const SEVERITY_OPTIONS = [
  { value: "mild", label: "Mild", hint: "A few spots here and there" },
  { value: "moderate", label: "Moderate", hint: "Regular, visible breakouts" },
  { value: "severe", label: "Severe", hint: "Widespread or persistent" },
];

function OptionCards({ options, value, onChange, name }) {
  return (
    <div className="quiz-grid" role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`quiz-option ${value === option.value ? "is-selected" : ""}`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          <span className="quiz-option-label">{option.label}</span>
          <span className="quiz-option-hint">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

export default function Analyze() {
  const navigate = useNavigate();
  const { setPrediction, setPreviewUrl, previewUrl, profile, setProfile, reset } = useAnalysis();

  const inputRef = useRef(null);
  const [mode, setMode] = useState("photo");
  const [photoSource, setPhotoSource] = useState("upload");

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [rejections, setRejections] = useState([]);

  const [skinType, setSkinType] = useState(profile.lastSkinType || "oily");
  const [severity, setSeverity] = useState(profile.lastSeverity || "mild");
  const [avoidList, setAvoidList] = useState(profile.avoidIngredients || []);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearPhoto() {
    setFile(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function selectFile(nextFile) {
    setError(null);
    setRejections([]);
    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/")) {
      setError("That file isn't an image. Upload a JPG or PNG photo.");
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      setError("That image is larger than 10 MB. Try a smaller photo.");
      return;
    }

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(nextFile);
    });
    setFile(nextFile);
  }

  function switchPhotoSource(next) {
    setPhotoSource(next);
    clearPhoto();
  }

    async function handleAnalysePhoto() {
    if (!file) return;
    setBusy("photo");
    setError(null);
    setRejections([]);

    try {
      const upload = await uploadPhoto(file);

      if (upload.validation && upload.validation.ok === false) {
        setRejections(upload.validation.reasons || ["The photo couldn't be used."]);
        return;
      }

      const result = await predictFromImage(upload.image_id, skinType);
      setPrediction(result);
      setProfile((prev) => ({
        ...prev,
        avoidIngredients: avoidList,
        lastSkinType: skinType,
        lastSeverity: result.acne_severity,
      }));
      navigate("/report");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleManual() {
    setBusy("manual");
    setError(null);
    try {
      const result = await predictManual(skinType, severity);
      setPrediction(result);
      setProfile((prev) => ({
        ...prev,
        avoidIngredients: avoidList,
        lastSkinType: skinType,
        lastSeverity: severity,
      }));
      navigate("/report");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <StepIndicator current={1} />

      <header className="page-header enter">
        <h1>Analyse your skin</h1>
        <p>
          Scan a photo for your acne assessment, or skip straight to the database with a
          manual entry. Either way, you'll get a routine built from products that match.
        </p>
      </header>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon"><AlertIcon /></span>
          <div className="alert-body">
            <span className="alert-title">Something went wrong</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {rejections.length > 0 && (
        <div className="alert alert-warning" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon"><AlertIcon /></span>
          <div className="alert-body">
            <span className="alert-title">This photo can't be analysed</span>
            <ul>
              {rejections.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <span className="text-sm muted">Retake the photo, or switch to manual entry below.</span>
          </div>
        </div>
      )}

      <div className="segmented" style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          className={`segmented-btn ${mode === "photo" ? "is-active" : ""}`}
          onClick={() => setMode("photo")}
        >
          Scan a photo
        </button>
        <button
          type="button"
          className={`segmented-btn ${mode === "manual" ? "is-active" : ""}`}
          onClick={() => setMode("manual")}
        >
          Enter manually
        </button>
      </div>

      {mode === "photo" ? (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Your photo</h2>
              <p className="text-sm muted" style={{ marginTop: "0.25rem" }}>
                Face the camera in even lighting, no filters.
              </p>
            </div>
            <div className="segmented segmented-sm">
              <button
                type="button"
                className={`segmented-btn ${photoSource === "upload" ? "is-active" : ""}`}
                onClick={() => switchPhotoSource("upload")}
              >
                <UploadIcon size={14} />
                Upload
              </button>
              <button
                type="button"
                className={`segmented-btn ${photoSource === "camera" ? "is-active" : ""}`}
                onClick={() => switchPhotoSource("camera")}
              >
                <CameraIcon size={14} />
                Camera
              </button>
            </div>
          </div>

          <div className="card-body stack-lg">
            {previewUrl ? (
              <>
                <div className="preview">
                  <img src={previewUrl} alt="Selected face photo preview" />
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => (photoSource === "upload" ? inputRef.current?.click() : clearPhoto())}
                    disabled={busy !== null}
                  >
                    {photoSource === "upload" ? "Choose a different photo" : "Retake photo"}
                  </button>
                  {file?.name && <span className="text-sm muted">{file.name}</span>}
                </div>
              </>
            ) : photoSource === "upload" ? (
              <div
                className={`dropzone ${dragging ? "is-dragging" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  selectFile(event.dataTransfer.files?.[0]);
                }}
              >
                <span className="dropzone-icon"><UploadIcon /></span>
                <div className="stack" style={{ gap: "0.25rem" }}>
                  <strong>Drag a photo here</strong>
                  <span className="text-sm muted">JPG or PNG, up to 10 MB</span>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}>
                  Browse files
                </button>
              </div>
            ) : (
              <CameraCapture onCapture={selectFile} onCancel={() => switchPhotoSource("upload")} />
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />

            <div className="field">
              <label className="label">What's your skin type?</label>
              <OptionCards options={SKIN_TYPE_OPTIONS} value={skinType} onChange={setSkinType} name="Skin type" />
            </div>

            <div className="field">
              <label className="label" htmlFor="avoid-photo">Anything you'd rather skip? (optional)</label>
              <ChipInput
                id="avoid-photo"
                value={avoidList}
                onChange={setAvoidList}
                placeholder="fragrance, retinol, a brand name…"
              />
              <span className="hint">Press Enter after each one. We'll leave these out of your recommendations.</span>
            </div>

            <AnalysisProgress active={busy === "photo"} />

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={handleAnalysePhoto}
              disabled={!file || busy !== null}
            >
              {busy === "photo" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Analysing…
                </>
              ) : (
                <>
                  Analyse my skin
                  <ArrowRightIcon />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Tell us directly</h2>
              <p className="text-sm muted" style={{ marginTop: "0.25rem" }}>
                No photo needed — we'll match products straight from the database.
              </p>
            </div>
          </div>

          <div className="card-body stack-lg">
            <div className="field">
              <label className="label">Skin type</label>
              <OptionCards options={SKIN_TYPE_OPTIONS} value={skinType} onChange={setSkinType} name="Skin type" />
            </div>

            <div className="field">
              <label className="label">Acne severity</label>
              <OptionCards options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} name="Acne severity" />
            </div>

            <div className="field">
              <label className="label" htmlFor="avoid-manual">Anything you'd rather skip? (optional)</label>
              <ChipInput
                id="avoid-manual"
                value={avoidList}
                onChange={setAvoidList}
                placeholder="fragrance, retinol, a brand name…"
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={handleManual}
              disabled={busy !== null}
            >
              {busy === "manual" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Working…
                </>
              ) : (
                <>
                  Continue without a photo
                  <ArrowRightIcon />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}