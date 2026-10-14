# Week 6 : Data Pipelines and First Training Run

## ResNet-50 Training Script and First Run

I worked on the training side of the acne notebook with Himmat, using her preprocessed ACNE04 split and class smoothing. I wrote the training loop on an ImageNet-pretrained ResNet-50 with the last layer replaced by a 3-class severity head. For the loss I used weighted cross-entropy on top of the inverse-frequency smoothing, so the severe class, which is the smallest, still gets a useful gradient.

I ran it on Kaggle with GPU T4 x2 and Internet turned on, and used Save Version and Save & Run All so the run is committed and not lost if the laptop goes to sleep. The first run finished. I looked at the per-class confusion matrix and not only the overall accuracy, because with this much class imbalance a model that mostly predicts mild could still look fine on accuracy alone. This run is our baseline for the augmentation and loss experiments.

## Skin-Type Dataset

I collected and cleaned the images for the skin-type classifier (oily, dry and normal). I removed duplicates and kept a source log for the images I collected manually.

## Notes

I saved the run logs and the per-class breakdown, so they can be used for error analysis later.
