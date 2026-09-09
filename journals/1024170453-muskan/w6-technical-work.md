# Week 6 : Data Pipelines and First Training Run

## ResNet-50 Training Script and First Run

I worked on the training side of the acne notebook alongside Himmat, once her preprocessed ACNE04 split and class-smoothing logic were ready to train against:

- **Training script** — wrote the ResNet-50 training loop on top of an ImageNet-pretrained backbone, with the final layer swapped out for the 3-class severity head.
- **Loss and class weighting** — used weighted cross-entropy on top of the inverse-frequency smoothing already applied to the class counts, so the severe class (the smallest one) still got a meaningful gradient signal.
- **Kaggle setup** — ran the notebook on Kaggle with GPU T4×2 and Internet explicitly enabled in the commit dialog, and used Save Version → Save & Run All to commit the run properly rather than relying on interactive kernel state, since that gets lost if the laptop sleeps mid-run.
- **First run and sanity checks** — got the first training run through to completion and checked the per-class confusion pattern, not just the overall accuracy, since a high headline number with the model only ever predicting "mild" would have been a red flag given the class imbalance.
- **Baseline established** — this run gives us a number to beat with augmentation and loss-function experiments in the coming weeks, and confirms the ACNE04 pipeline produces correctly shaped, correctly labeled batches end to end.

## MobileNetV2 Training Script and First Run

I also wrote the training script for the MobileNetV2 skin-type classifier (oily vs. dry) once the cleaned dataset from the data-prep side was ready, and ran the first pass to get an initial accuracy baseline for the skin-type module.

## Real MediaPipe Validation

Separately, I swapped the `ok: true` validation stub for the real `validate_photo` function using MediaPipe: actual face detection, lighting checks, and angle checks, with specific rejection reasons now returned to the frontend instead of a blanket pass/fail.

## Notes for Next Week

The ResNet-50 baseline and the confusion-pattern notes from this run are what W8's error-analysis task will build on, so I kept the run logs and per-class breakdown rather than just the final accuracy number.

This week's focus was mostly on training — getting both the acne and skin-type notebooks past their first real runs — with the MediaPipe validation swap as the other piece of work.
