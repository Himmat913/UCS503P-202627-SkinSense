# Week 7 : Frontend and Skin-Type Dataset

## Frontend Pages

I finished the remaining pages (Profile, Ingredients, About and Feedback), which made seven pages in total alongside Upload, Results and Recommendations, all in the shadcn/Mainline theme.

Later in the week I reworked the frontend into a shorter flow. Upload and Results were merged into one Analyze page, where the user can upload a photo or take one with the camera, pick a skin type, and add ingredients to avoid as tags. Recommendations became a Report page that shows the results with confidence, the filters, and a "Why this?" explanation on each product. I added a separate Routine page for the AM/PM routine, and removed the standalone Upload, Results, About and Ingredients pages. I also redid the base, theme and component styles to match.

## API Client

I added silent token refresh to the API client, so an expired access token is refreshed in the background with the refresh token and the user is not sent back to login. The client now sends `skin_type` along with the photo request, since the backend needs it while there is no skin-type model. The fixture fallback still works on every page, so the app can be demoed even if the backend is down.

## Skin-Type Dataset

I kept working on the skin-type dataset for the MobileNetV2 classifier. This week was about finalizing it: checking the image count per class, removing a few more duplicates that were missed in the first cleanup, and making sure the folder structure matches what the training notebook expects.

## Notes

The dataset is ready. The MobileNetV2 training and combining it with the questionnaire scoring are still to do.
