# Week 8 : Improvement Plan

## Reviewing MST Feedback

After the prototype submission I went through the feedback from the MST review. The main gaps were that photo validation was still a stub, the `AnalysisResult` table was not being written to on each prediction, and there was no way to track a user's progress over time. I listed these as the three things to close before the second prototype.

## Connecting AnalysisResult to /api/predict

I wired the `AnalysisResult` model into the `/api/predict` endpoint so every successful prediction now gets a row in the database. The row stores the user id, severity, skin type, confidence, and a timestamp. This was straightforward once the Alembic migration for the table was in place.

## MediaPipe Photo Validation

I replaced the validation stub with a real implementation using MediaPipe Face Detection. The gate checks that exactly one face is detected, that the face region is large enough relative to the frame, and that the image is not too dark. If any check fails the endpoint returns a 400 with a reason string instead of running inference. This catches the common failure cases: group photos, heavily backlit shots, and images where the face is in the corner.

## Improvement Plan Document

I wrote up the improvement plan covering what changed for each module and what still needs to be done: skin-type model training (Muskan), routine output improvements (Ansh), and the feedback and progress endpoints (deferred to later weeks).
