# Week 6 : Data Pipelines and First Training Run

## ACNE04 Preprocessing

I preprocessed the ACNE04 dataset following the approach in the reference paper (Zhang and Ma). The steps were:

- Relabelled the lesion counts into three severity classes: mild (1-5), moderate (6-20) and severe (>20).
- Built the train/test split from the paper's fold 0 instead of a random split, so our numbers stay comparable to the paper.
- Resized all images to 224x224 and normalized them with the ImageNet mean and std, since ResNet-50 starts from ImageNet weights.
- Applied class-count smoothing, because the severe class has far fewer images than mild and moderate.
- Checked the raw annotation format against the paper's description before running the relabelling script.
- Checked that images from the same patient or session do not end up on both sides of the split. The 99%+ accuracy in the paper is most likely inflated by this kind of leakage, and we would rather report a lower number that holds up.

## Skin-Type Data Preparation

With Muskan, I worked on the data side of the skin-type notebook. We finished collecting the dry class (about 250 images, with a source log) and cleaned the oily and normal classes taken from Kaggle by removing duplicates and fixing labels.

## Notes

The ACNE04 split and the smoothing weights are what the first ResNet-50 run trains on. If the run's numbers look wrong, those are the first two things to check.
