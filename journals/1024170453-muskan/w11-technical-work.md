# Week 11 : Skin-Type Dataset Preprocessing

## Dataset Inventory

I looked at the available skin-type datasets on Kaggle and chose one with three classes: dry, normal, and oily. I checked the class distribution and found it was reasonably balanced, so no resampling was needed.

## Cleaning and Deduplication

I wrote a cleaning stage to remove duplicates and images that were too small or obviously not faces. After cleaning, the dataset had a usable number of images in each class. I did not apply a face detection gate here because that would have removed too many images; the MediaPipe gate on the backend handles bad inputs at inference time.

## Train/Val/Test Split

I split the dataset into train, validation, and test sets with no overlap. Each image appears in exactly one set. I used a fixed random seed so the split is reproducible.

## Normalization

I resized all images to 224x224 (the MobileNetV2 input size) and normalized with the standard ImageNet mean and standard deviation. The preprocessing pipeline is set up as a torchvision transform.

## Notes

The cleaned and split dataset is ready for training. I will run the training notebook on Kaggle next week. I did not push the notebook to the repo yet because the training run is not done.
