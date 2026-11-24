# Week 15 : Second Prototype

## Testing the Full Frontend Flow

I tested the full flow in the browser for the second prototype CE: register a new account, upload a photo, check the results page, go to recommendations, check the routine tabs. I found that the AM/PM routine tabs were not switching correctly on mobile viewport widths. I fixed the tab switching logic.

## Ingredients Page

I improved the ingredients page so it shows each ingredient with its known conflicts highlighted. The page reads from the public `/api/ingredients` endpoint and does not require login.

## Styling Consistency

I went through all the pages and made the spacing and colour usage consistent. The app was using a mix of hardcoded colour values and CSS variables from the theme. I changed everything to use the CSS variables.

## Notes

For the second prototype the frontend is complete enough to demonstrate the full user journey. The main item left before the final prototype is the broader redesign that I had planned.
