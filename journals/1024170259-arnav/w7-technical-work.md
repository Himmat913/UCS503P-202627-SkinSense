# Week 7 : Frontend and Skin-Type Dataset

## Frontend Pages and Flow

I completed the Profile, Ingredients, About, and Feedback pages, bringing the frontend to seven pages alongside Upload, Results, and Recommendations. The pages used the shadcn/Mainline theme.

I then reworked the experience into a shorter flow. The Analyze page combined photo upload, manual skin-type selection, and ingredient exclusions. The Report page presented results, confidence, filters, and explanations for product choices, while a separate Routine page showed the AM/PM routine. I updated the base, theme, and component styles to support the revised flow.

## API Client

I added silent token refresh so an expired access token could be refreshed in the background. The photo request also included `skin_type`, which the backend needed while a skin-type model was not yet available. Fixture fallback remained available so the frontend could be demonstrated when the backend was offline.

## Skin-Type Dataset

I continued preparing the MobileNetV2 dataset by checking the image count in each class, removing duplicates found during the final review, and confirming that the folder structure matched the training notebook's expectations.

## Notes

The dataset was ready for training. MobileNetV2 training and combining its output with questionnaire scoring remained as follow-up work.