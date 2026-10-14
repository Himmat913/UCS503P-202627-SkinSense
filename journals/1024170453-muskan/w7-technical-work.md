# Week 7 : Backend, Database, and MST Prep

## Frontend Pages

I finished out the remaining frontend pages — Profile, Ingredients, About, and Feedback — bringing the app to seven pages total alongside Upload, Results, and Recommendations. All of them follow the shadcn/Mainline theme so the styling stays consistent across the app.

## API Client Improvements

I added silent token refresh to the frontend API client, so an expired access token gets refreshed in the background using the refresh token instead of dropping the user back to login mid-session. I also kept the fixture-based fallback working across all seven pages, so the app stays demoable even if the backend is down.

## Skin-Type Dataset

On the ML side, I kept working on the skin-type dataset for the MobileNetV2 classifier — the oily/dry/normal images collected and cleaned in W6 still need a full training run, so this week was about getting the dataset itself finalized and ready to train on: checking image counts per class, removing a few more duplicates that slipped through the first cleanup pass, and confirming the folder structure matches what the training script expects.

## Notes for Next Week

The dataset is ready; the actual MobileNetV2 training run and fusing it with the Likert questionnaire scoring are still open, and are the next ML task once the acne-model backend integration settles down.
