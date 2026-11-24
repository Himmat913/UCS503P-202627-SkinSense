# Week 12 : Skin-Type Model Integration

## Integrating the Trained Model

Muskan finished training the 3-class MobileNetV2 (dry/normal/oily) on Kaggle. I took her checkpoint (`mobilenetv2_skintype.pt`) and added it to the backend under `ml_models/skin_type/`. The integration follows the same pattern as the acne model: the checkpoint is loaded once at startup, the prediction runs on the MediaPipe-cropped face region, and the result is passed through a softmax to get per-class confidence scores.

## Fallback Path

If the skin-type model is not found at startup, the backend falls back to asking the user via a 409 response. The frontend shows a manual skin-type picker when it gets a 409. I kept this fallback path in place because it is useful for local development without the checkpoint.

## Backend Tests

I updated the analysis tests to cover the model path: one test loads a real face image and checks that `skin_type_source` is `"model"`, and one checks that the 409 fallback fires when the model file is missing. All tests pass.

## Notes

The acne model gives `source: "model"` and the skin-type model now gives `skin_type_source: "model"` in the same prediction response. The two models run sequentially in `/api/predict`. The test balanced accuracy for the skin-type model is around 0.71, which is in line with the human-rater agreement ceiling for this dataset.
