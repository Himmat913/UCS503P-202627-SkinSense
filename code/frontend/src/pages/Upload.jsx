import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AnalysisProgress from "../components/AnalysisProgress";
import ModuleBadge from "../components/ModuleBadge";
import StepIndicator from "../components/StepIndicator";
import { AlertIcon, ArrowRightIcon, InfoIcon, UploadIcon } from "../components/Icons";
import { predictFromImage, predictManual, uploadPhoto } from "../api/client";
import { useAnalysis } from "../context/AnalysisContext";

const SKIN_TYPES = ["oily", "dry", "normal"];
const SEVERITIES = ["mild", "moderate", "severe"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export default function Upload() {
  const navigate = useNavigate();
  const { setPrediction, setPreviewUrl, previewUrl, profile, reset } = useAnalysis();

  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(null); // "photo" | "manual" | null
  const [error, setError] = useState(null);
  const [rejections, setRejections] = useState([]);

  const [manualSkinType, setManualSkinType] = useState("oily");
  const [manualSeverity, setManualSeverity] = useState("mild");

  useEffect(() => {
    reset();
  }, [reset]);

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

    // Revoke the previous object URL before replacing it, or every reselect
    // leaks a blob for the lifetime of the tab.
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(nextFile);
    });
    setFile(nextFile);
  }

  async function handleAnalyse() {
    if (!file) return;
    setBusy("photo");
    setError(null);
    setRejections([]);

    try {
      const upload = await uploadPhoto(file);

      // A rejected photo is a normal outcome, not an error.
      if (upload.validation && upload.validation.ok === false) {
        setRejections(upload.validation.reasons || ["The photo couldn't be used."]);
        return;
      }

      setPrediction(await predictFromImage(upload.image_id));
      navigate("/results");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleManual() {
    setBusy("manual");
    setError(null);
    setRejections([]);
    try {
      setPrediction(await predictManual(manualSkinType, manualSeverity));
      navigate("/results");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <StepIndicator current={1} />

      <header className="page-header">
        <h1>Analyse your skin</h1>
        <p>
          Upload a clear, well-lit photo of your face. We assess your skin type and acne
          severity, then build a routine from products that match — filtered against your
          allergies and budget.
        </p>
        {profile.allergies.length > 0 || profile.budgetMax != null ? (
          <p className="text-sm muted" style={{ marginTop: "0.5rem" }}>
            Using your saved profile:{" "}
            {profile.allergies.length > 0
              ? `avoiding ${profile.allergies.join(", ")}`
              : "no ingredient exclusions"}
            {profile.budgetMax != null && `, up to ₹${profile.budgetMax} per product`}.{" "}
            <Link to="/profile" className="link">
              Edit
            </Link>
          </p>
        ) : (
          <p className="text-sm muted" style={{ marginTop: "0.5rem" }}>
            <Link to="/profile" className="link">
              Set up your skin profile
            </Link>{" "}
            first to filter out ingredients you react to.
          </p>
        )}
      </header>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon">
            <AlertIcon />
          </span>
          <div className="alert-body">
            <span className="alert-title">Something went wrong</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {rejections.length > 0 && (
        <div className="alert alert-warning" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon">
            <AlertIcon />
          </span>
          <div className="alert-body">
            <span className="alert-title">This photo can't be analysed</span>
            <ul>
              {rejections.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <span className="text-sm muted">
              Retake the photo, or use the manual option below.
            </span>
          </div>
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Upload a photo</h2>
              <p className="text-sm muted" style={{ marginTop: "0.25rem" }}>
                Face the camera in even lighting, no filters.
              </p>
            </div>
            <ModuleBadge module="photoValidation" />
          </div>

          <div className="card-body stack">
            {previewUrl ? (
              <>
                <div className="preview">
                  <img src={previewUrl} alt="Selected face photo preview" />
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy !== null}
                  >
                    Choose a different photo
                  </button>
                  <span className="text-sm muted">{file?.name}</span>
                </div>
              </>
            ) : (
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
                <span className="dropzone-icon">
                  <UploadIcon />
                </span>
                <div className="stack" style={{ gap: "0.25rem" }}>
                  <strong>Drag a photo here</strong>
                  <span className="text-sm muted">JPG or PNG, up to 10 MB</span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => inputRef.current?.click()}
                >
                  Browse files
                </button>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />

            <AnalysisProgress active={busy === "photo"} />

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={handleAnalyse}
              disabled={!file || busy !== null}
            >
              {busy === "photo" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Analysing…
                </>
              ) : (
                <>
                  Analyse photo
                  <ArrowRightIcon />
                </>
              )}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Or tell us yourself</h2>
              <p className="text-sm muted" style={{ marginTop: "0.25rem" }}>
                No photo needed. Useful if your camera isn't up to it, or you already know
                your skin.
              </p>
            </div>
            <span className="badge">Manual</span>
          </div>

          <div className="card-body stack">
            <div className="field">
              <label className="label" htmlFor="manual-skin-type">
                Skin type
              </label>
              <select
                id="manual-skin-type"
                className="select"
                value={manualSkinType}
                onChange={(event) => setManualSkinType(event.target.value)}
              >
                {SKIN_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="manual-severity">
                Acne severity
              </label>
              <select
                id="manual-severity"
                className="select"
                value={manualSeverity}
                onChange={(event) => setManualSeverity(event.target.value)}
              >
                {SEVERITIES.map((value) => (
                  <option key={value} value={value}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
              <span className="hint">
                Mild is roughly 1–5 spots, moderate 6–20, severe more than 20.
              </span>
            </div>

            <div className="alert">
              <span className="alert-icon muted">
                <InfoIcon />
              </span>
              <span className="text-sm muted">
                Self-reported results are labelled as such throughout, so you always know
                what the recommendations were based on.
              </span>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-lg btn-block"
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
        </section>
      </div>
    </>
  );
}
