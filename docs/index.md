![Tiet Logo](assets/tiet-logo.svg){ .tiet-logo }

**UCS503: Software Engineering (Project)**  
**TIET Patiala**

# SkinSense

**Author(s)**:

Himantveer Kaur, Muskan Kohli, Ansh Bindal, Arnav Chandla

SkinSense is an AI-based skin analysis and skincare
recommendation app. It predicts skin type and acne
severity from a user-submitted photo, then generates a
personalised skincare routine and product
recommendations -- filtered by budget, allergies, and
ingredient conflicts -- with weekly longitudinal
tracking and a dermatologist-referral safety net for
severe or low-confidence cases.

## Project layout

- `code/backend` -- FastAPI backend
- `code/frontend` -- React (Vite) frontend
- `ml` -- model training/inference code (skin type,
  acne severity)

## Backend

``` shell
cd code/backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Frontend

``` shell
cd code/frontend
npm install
npm run dev
```