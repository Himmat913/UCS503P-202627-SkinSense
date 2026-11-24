# Week 12 : Skin-Type Model Training

## Training Run on Kaggle

I ran the MobileNetV2 training notebook on Kaggle using a T4 GPU. The model starts from ImageNet pretrained weights. I froze the base layers for the first few epochs and then unfroze them for fine-tuning. The final test balanced accuracy is around 0.71, which is in line with what the literature reports for three-class skin-type classification.

## Per-Class Results

The model does well on oily and dry but struggles to separate normal from dry. This is expected: the visual difference between normal and dry skin is small, and human raters also disagree on these cases at a similar rate.

## Checkpoint

The trained checkpoint is `mobilenetv2_skintype.pt`. I downloaded it from Kaggle and gave it to Himmat to add to the backend under `ml_models/skin_type/`. The notebook itself will be added to the repo once it is cleaned up.

## Component Diagram

I drew the component diagram for the project in draw.io. It shows the frontend, backend, database, and ML model components and how they connect. This was part of the documentation requirements for the CE.

## Deployment Diagram

I also drew the deployment diagram showing how the app runs on a local machine during development: the React dev server and the FastAPI server as separate processes, both connecting to the same PostgreSQL instance.
