# Week 6 : Data Pipelines and First Training Run

## ACNE04 Preprocessing

I worked on preprocessing the ACNE04 dataset following the approach from the reference paper (Zhang & Ma), covering the following pipeline stages:

- **Severity reclassification** — remapped the original per-image lesion counts into the three target severity bands (mild 1–5, moderate 6–20, severe >20), consistent with the scope decision to drop the paper's finer-grained 4-class scheme.
- **Fold-0 train/test split** — built the split following the paper's cross-validation folds rather than a random split, so results stay comparable to the reference numbers and to future folds if we run them.
- **Resizing and normalization** — resized all images to 224×224 to match the ResNet-50 input size and normalized pixel values using ImageNet mean/std, since the model is initialized from ImageNet-pretrained weights.
- **Class-count smoothing** — applied inverse-frequency-style smoothing to the class counts to reduce the impact of the severe class being underrepresented relative to mild and moderate, so the first training run wouldn't be dominated by the majority classes.
- **Label format verification** — checked the raw ACNE04 annotation format against the paper's description before trusting the relabeling script, since a silent mismatch here would have propagated errors through every downstream step.
- **Leakage check** — made sure the train/test split didn't put images from the same patient/session on both sides, since the paper's own reported 99%+ accuracy is almost certainly inflated by exactly this kind of leakage, and we're deliberately avoiding it even at the cost of a lower headline number.

## Skin-Type Data Preparation

I also worked on the data side of the skin-type notebook alongside Muskan: finishing the dry-class collection to the target of roughly 250 images with a source log, and deduplicating/relabeling the oily and normal classes sourced from Kaggle, so the dataset was clean and ready before training started.

## CI Workflow

On the backend side, I set up the GitHub Actions CI workflow to run linting and `pytest` on every pull request, so future merges (including the model integration coming in W7) get checked automatically before landing on master.

## Notes for Next Week

The preprocessed ACNE04 split and the class-smoothing logic are what Muskan's first ResNet-50 run trains against — if that run's numbers look off, the first place to check is whether the smoothing weights or the fold-0 split changed between commits.

This week I focused on the data-preparation half of both notebooks — ACNE04 for the acne classifier and the skin-type dataset — plus the CI setup on the backend.
