# Week 11 : Referral Flag and Routine Improvements

## Referral Flag Logic

I improved the referral flag so it fires on two conditions: severe acne (more than 20 lesions by the model's classification) or a prediction confidence below 0.5. At low confidence the engine still returns a routine, but it adds a note recommending the user see a dermatologist rather than relying on the app's output alone.

## Routine Step Coverage

I found that the routine builder sometimes returned an empty step if the product catalog had no matching item for a particular routine slot (toner, serum). The 8 hand-written entries in the catalog were added specifically to avoid this, but the matching logic was filtering them out because their ingredient lists were very short. I relaxed the ingredient-completeness filter for these categories.

## Documentation

I updated the product catalog documentation to describe the INR pricing convention and the hand-written entries. The catalog README explains which fields are required and which are optional.

## Tests

I added two recommendation tests: one that checks the referral flag appears in the response for a severe severity input, and one that checks the routine always has at least one product per step.
