# Week 8 : Improvement Plan

## Frontend Review After MST

After the prototype I went through the frontend with fresh eyes and listed the things that needed fixing. The results page was showing placeholder values for confidence and skin type even when real data was coming back. The recommendations page had no loading state, so it would show nothing while the request was in flight. I fixed both.

## Fixing the Results Display

The confidence value was being formatted as a decimal (0.83) but the UI was treating it as a percentage string. I added a format helper so the displayed value is always a percentage. The skin type was not being populated because the response key name had changed during integration; I updated the mapping.

## Loading State on Recommendations

I added a loading spinner to the recommendations page so the user sees something while the request is in flight. The spinner uses the same style as the existing one on the upload page.

## Improvement Plan

I listed the three things I want to do before the second prototype: start the skin-type model training, improve the results page to show more detail, and clean up the component styles. The model training will need a Kaggle run and cannot be done in a single lab session.
