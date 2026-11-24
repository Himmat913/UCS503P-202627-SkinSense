import { useRef, useState } from "react";

import CameraCapture from "./CameraCapture";
import Segmented from "./Segmented";
import { CameraIcon, ImageIcon, TrashIcon, UploadIcon } from "./Icons";
import { ACCEPTED_TYPES, TYPE_LABELS } from "../lib/photo";
import { formatBytes } from "../lib/skin";

export default function PhotoPanel({ previewUrl, meta, onSelect, onClear, disabled, children }) {
  const inputRef = useRef(null);
  const [source, setSource] = useState("upload");
  const [dragging, setDragging] = useState(false);

  function pick(file) {
    if (file) onSelect(file);
  }

  function changeSource(next) {
    setSource(next);
    onClear();
  }

  function openPicker() {
    inputRef.current?.click();
  }

  const hasPhoto = Boolean(previewUrl);

  return (
    <section className="panel photo-panel" aria-labelledby="photo-heading">
      <div className="panel-head">
        <div>
          <h2 id="photo-heading" className="panel-title">
            Your photo
          </h2>
          <p className="panel-sub">One clear, front-facing photo in even light. No filters or makeup works best.</p>
        </div>
        <Segmented
          label="Photo source"
          size="sm"
          value={source}
          onChange={changeSource}
          options={[
            { value: "upload", label: "Upload", icon: <UploadIcon size={16} /> },
            { value: "camera", label: "Camera", icon: <CameraIcon size={16} /> },
          ]}
        />
      </div>

      {hasPhoto ? (
        <div className="photo-selected">
          <figure className="photo-stage">
            <img src={previewUrl} alt="The photo you selected for analysis" />
          </figure>
          <div className="photo-meta">
            <span className="photo-meta-icon" aria-hidden="true">
              <ImageIcon size={18} />
            </span>
            <div className="photo-meta-text">
              <p className="photo-name">{meta?.name || "Photo"}</p>
              <p className="photo-details">
                {[meta?.width && meta?.height ? `${meta.width} × ${meta.height} px` : null, formatBytes(meta?.size), TYPE_LABELS[meta?.type]]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div className="photo-actions">
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={source === "upload" ? openPicker : onClear}
                disabled={disabled}
              >
                {source === "upload" ? "Replace" : "Retake"}
              </button>
              <button type="button" className="icon-btn" onClick={onClear} disabled={disabled} aria-label="Remove photo" title="Remove photo">
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      ) : source === "upload" ? (
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
            pick(event.dataTransfer.files?.[0]);
          }}
        >
          <span className="dropzone-icon" aria-hidden="true">
            <UploadIcon size={24} />
          </span>
          <p className="dropzone-title">Drag your photo here</p>
          <p className="dropzone-hint">JPG, PNG or WEBP, up to 10 MB</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={openPicker}>
            Choose a photo
          </button>
        </div>
      ) : (
        <CameraCapture onCapture={pick} onCancel={() => setSource("upload")} />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {children}
    </section>
  );
}
