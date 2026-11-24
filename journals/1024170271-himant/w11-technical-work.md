# Week 11 : Progress Over Improvement Plan

## Photo Validation in the Full Request Flow

I tested the MediaPipe validation gate end to end: upload a photo that fails the face detection check, check the 400 response and the error message in the UI, then upload a valid photo and confirm the full predict-and-recommend chain still works. I fixed a bug where the gate was running on the raw uploaded bytes before the image was decoded, which caused MediaPipe to crash on some JPEG files.

## Alembic Migration for skin_type_source

Muskan's skin-type model needed a new column in `AnalysisResult` to record whether the skin type came from the model or from the user fallback. I wrote a migration to add `skin_type_source` with a default of `"user"` so existing rows are not broken.

## Auth Tests and Analysis Tests

After the schema change I re-ran the full test suite. All 15 auth tests and 8 analysis tests passed. I added two more analysis tests: one that checks the validation gate returns 400 on a blank image, and one that checks `skin_type_source` is set correctly when the user provides a manual value.

## Notes

The `/api/predict` endpoint now saves predictions and validates photos. The skin-type model integration is waiting on Muskan finishing the training run on Kaggle. Once that is done I will swap out the manual fallback.
