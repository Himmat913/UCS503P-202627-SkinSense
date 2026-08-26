# Week 4 : Use-Case Diagram

## Use-Case Modelling

I worked on the SkinSense use-case diagram. The main actors were defined as **User** and **Admin**.

For the User, I mapped the analysis flow from `Upload Selfie for Analysis` to `Verify Face Photo`, `Predict Skin Type`, `Predict Acne Severity`, and `View Analysis Results`. The recommendation-related functions were separated into `Get Product Recommendations`, `Check Ingredient Conflicts`, `View Recommendation Explanation`, `Set Price Preference`, `Build AM/PM Routine`, and `View Safety Disclaimer`.

For the Admin, I added `Manage Product & Ingredient Database` to represent maintenance of the product and ingredient information used by the recommendation engine.

`Track Skin Progress` was kept as a planned future feature because periodic tracking is not part of the current core implementation.

## Technical Review

I checked the relationships between the use cases so that prediction functions support the analysis result and recommendation functions operate after analysis. PostgreSQL was not added as an actor because it is an internal database component.

## Reference Study

I reviewed the ACNE04 method used for the planned acne-severity model. The referenced preprocessing uses three severity classes: mild (1-5), moderate (6-20), and severe (>20). The method also applies class balancing, resizing, and normalization before model training.

No application code was written during this task.
