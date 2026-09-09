# Week 5 : End-to-End Skeleton

## Backend Schemas and Storage

I set up the request/response schemas for the upload and predict endpoints, along with the local storage handling for uploaded images. This gave the rest of the backend a fixed shape to build against before any real model logic existed.

## /api/upload and /api/predict

I implemented `/api/upload` and `/api/predict` with stub inference wired in, plus the referral-flag logic (returning a placeholder "see a dermatologist" flag for now). The stub returns a deterministic response so the frontend team could build against a stable contract while the real ResNet-50 model was still in training.

## Integrating Ansh's Recommendation Router

Once Ansh's stub recommendation engine and router were ready, I wired his router into `main.py` so the full request chain — upload → predict → recommend — worked end to end through one FastAPI app.

## Verification

I ran the backend and frontend together locally and walked through the full flow: uploading a photo, getting a stub severity/skin-type prediction, and receiving a stub product list with an AM/PM routine. This became the definition-of-done check for the week — a clean clone had to run both servers and complete the flow, including the manual-fallback path if a model step failed.

No trained models were involved yet; this week was purely about getting the skeleton running.
