# Week 12 : Skin-Type Model

## Data Preprocessing

I finished preprocessing the skin-type dataset. The images are resized to the MobileNetV2 input size, normalized with the ImageNet mean and std, and split into train, validation and test sets, with each image in only one of them.

## Model Architecture

I set up the MobileNetV2 architecture for the skin-type classifier in the notebook. It starts from ImageNet pretrained weights and has a new classification head for our skin-type classes.

## Training

I am running the training notebook on Kaggle. It is not in the repo yet, and I will add it once the run is complete and the model checkpoint is ready.

## Notes

After training I will look at the per-class results and then connect the model to the backend, in the same way as the acne model.
