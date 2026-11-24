import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AnalysisProgress from "../components/AnalysisProgress";
import IngredientPicker from "../components/IngredientPicker";
import ChoiceCards from "../components/ChoiceCards";
import Notice from "../components/Notice";
import PhotoPanel from "../components/PhotoPanel";
import Segmented from "../components/Segmented";
import StepIndicator from "../components/StepIndicator";
import { ArrowRightIcon, CameraIcon, ListIcon } from "../components/Icons";
import { predictFromImage, predictManual, uploadPhoto } from "../api/client";
import { checkFile } from "../lib/photo";
import { useAnalysis } from "../context/useAnalysis";
import { SEVERITIES, SKIN_TYPES } from "../lib/skin";

export default function Analyze() {
  const navigate = useNavigate();
  const {
    previewUrl,
    setPreviewUrl,
    photoMeta,
    setPhotoMeta,
    setPrediction,
    setRecommendations,
    profile,
    setProfile,
  } = useAnalysis();

  const [mode, setMode] = useState("photo");
  const [skinType, setSkinType] = useState(profile.lastSkinType || "");
  const [severity, setSeverity] = useState(profile.lastSeverity || "");
  const [avoidList, setAvoidList] = useState(profile.avoidIngredients || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [rejections, setRejections] = useState([]);
  // Normally skin type is read from the photo by the server's model, so the picker
  // stays hidden in photo mode. If the server reports no model is available right
  // now (409), needsSkinType flips on and the picker appears as a one-time fallback
  // for this check. pendingImageId remembers an already-uploaded, already-validated
  // photo across that retry so it isn't re-uploaded.
  const [needsSkinType, setNeedsSkinType] = useState(false);
  const [pendingImageId, setPendingImageId] = useState(null);

  const file = photoMeta?.file || null;

  function selectFile(nextFile) {
    setError(null);
    setRejections([]);
    setNeedsSkinType(false);
    setPendingImageId(null);
    const problem = checkFile(nextFile);
    if (problem) {
      setError(problem);
      return;
    }
    const url = URL.createObjectURL(nextFile);
    setPreviewUrl(url);
    setPhotoMeta({ file: nextFile, name: nextFile.name, size: nextFile.size, type: nextFile.type });

    const probe = new Image();
    probe.onload = () => {
      setPhotoMeta((current) =>
        current?.file === nextFile ? { ...current, width: probe.naturalWidth, height: probe.naturalHeight } : current,
      );
    };
    probe.src = url;
  }

  function clearPhoto() {
    setPreviewUrl(null);
    setPhotoMeta(null);
    setRejections([]);
    setNeedsSkinType(false);
    setPendingImageId(null);
  }

  function rememberChoices(result, chosenSeverity) {
    setProfile((prev) => ({
      ...prev,
      avoidIngredients: avoidList,
      lastSkinType: result.skin_type,
      lastSeverity: chosenSeverity || result.acne_severity,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setRejections([]);

    if (mode === "photo" && !file && !pendingImageId) {
      setError("Add a photo first, or switch to checking without a photo.");
      return;
    }
    if (mode === "photo" && needsSkinType && !skinType) {
      setError("Choose your skin type to continue.");
      return;
    }
    if (mode === "manual" && !skinType) {
      setError("Choose your skin type to continue.");
      return;
    }
    if (mode === "manual" && !severity) {
      setError("Choose how severe your acne is to continue.");
      return;
    }

    setBusy(true);
    try {
      let result;
      if (mode === "photo") {
        let imageId = pendingImageId;
        if (!imageId) {
          const upload = await uploadPhoto(file);
          if (upload.validation && upload.validation.ok === false) {
            setRejections(
              upload.validation.reasons?.length ? upload.validation.reasons : ["This photo couldn't be used."],
            );
            return;
          }
          imageId = upload.image_id;
          setPendingImageId(imageId);
        }

        try {
          // First attempt: let the server's skin-type model read the photo. Only send
          // skinType once the server has told us (via a 409 below) that it can't.
          result = await predictFromImage(imageId, needsSkinType ? skinType : null);
        } catch (err) {
          if (err.status === 409 && !needsSkinType) {
            setNeedsSkinType(true);
            return;
          }
          throw err;
        }

        setPendingImageId(null);
        setNeedsSkinType(false);
        rememberChoices(result);
      } else {
        result = await predictManual(skinType, severity);
        clearPhoto();
        rememberChoices(result, severity);
      }
      setRecommendations(null);
      setPrediction(result);
      navigate("/report");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <StepIndicator current={1} />

      <header className="page-head">
        <div>
          <h1>
            New <span className="accent">skin check</span>
          </h1>
          <p>Add a photo for an acne reading, or answer two questions to go straight to product picks.</p>
        </div>
        <Segmented
          label="How do you want to check your skin?"
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
            setRejections([]);
            setNeedsSkinType(false);
            setPendingImageId(null);
          }}
          options={[
            { value: "photo", label: "With a photo", icon: <CameraIcon size={18} /> },
            { value: "manual", label: "Without a photo", icon: <ListIcon size={18} /> },
          ]}
        />
      </header>

      <form className="analyze-grid" onSubmit={handleSubmit}>
        {mode === "photo" ? (
          <PhotoPanel previewUrl={previewUrl} meta={photoMeta} onSelect={selectFile} onClear={clearPhoto} disabled={busy}>
            {rejections.length > 0 && (
              <div className="photo-feedback">
                <Notice tone="warning" title="This photo can't be analysed" role="alert">
                  <ul>
                    {rejections.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <p>Retake or replace the photo, or switch to checking without a photo.</p>
                </Notice>
              </div>
            )}
          </PhotoPanel>
        ) : (
          <section className="panel" aria-labelledby="severity-heading">
            <div className="panel-head">
              <div>
                <h2 id="severity-heading" className="panel-title">
                  Your acne
                </h2>
                <p className="panel-sub">
                  Without a photo there's no model reading, so your answer is used as given.
                </p>
              </div>
            </div>
            <ChoiceCards
              name="severity"
              legend="How severe is your acne right now?"
              options={SEVERITIES}
              value={severity}
              onChange={setSeverity}
            />
          </section>
        )}

        <aside className="panel analyze-side" aria-labelledby="about-heading">
          <h2 id="about-heading" className="panel-title">
            About your skin
          </h2>

          {mode === "manual" && (
            <ChoiceCards
              name="skin-type"
              legend="What's your skin type?"
              options={SKIN_TYPES}
              value={skinType}
              onChange={setSkinType}
            />
          )}

          {mode === "photo" && !needsSkinType && (
            <p className="field-hint">Skin type is read automatically from your photo.</p>
          )}

          {mode === "photo" && needsSkinType && (
            <>
              <Notice tone="warning" title="Couldn't read skin type from your photo">
                The skin-type model isn't available on the server right now. Choose the type that sounds
                most like you so your check can continue.
              </Notice>
              <ChoiceCards
                name="skin-type"
                legend="What's your skin type?"
                options={SKIN_TYPES}
                value={skinType}
                onChange={setSkinType}
              />
            </>
          )}

          <div className="field">
            <label className="field-label" htmlFor="avoid">
              Anything to leave out? <span className="optional">Optional</span>
            </label>
            <IngredientPicker id="avoid" value={avoidList} onChange={setAvoidList} describedBy="avoid-hint" />
            <p className="field-hint" id="avoid-hint">
              Search the ingredients in our catalogue and pick any you want left out of your results.
            </p>
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          <div className="analyze-submit">
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  {mode === "photo" ? "Analysing your photo…" : "Finding your products…"}
                </>
              ) : (
                <>
                  {mode === "photo" ? "Analyse my skin" : "See my recommendations"}
                  <ArrowRightIcon />
                </>
              )}
            </button>
            <AnalysisProgress active={busy && mode === "photo"} />
            {mode === "photo" && !busy && (
              <p className="field-hint">
                Your photo is uploaded to the SkinSense server to be checked and graded. It isn't shown to
                other users.
              </p>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
