# Browser end-to-end tests

`e2e_test.py` drives Chromium through the whole app against a running backend and frontend: accounts, real photo validation, real acne inference, recommendations and filters, the routine builder, profile history, account isolation, zoom-equivalent widths and mobile layout. It finishes by printing how many checks passed.

## Run

1. Start the backend on port 8000 with a throwaway database, and the frontend on port 5173 (see `code/README.md`). For example:

   ```bash
   cd code/backend
   DATABASE_URL=sqlite:////tmp/skinsense_e2e.db uvicorn main:app --port 8000
   ```

   ```bash
   cd code/frontend
   npm run build && npm run preview -- --port 5173
   ```

2. Install Playwright once:

   ```bash
   pip install playwright pillow
   python -m playwright install chromium
   ```

3. Point the test at a clear, front-facing face photo you are allowed to use, then run it:

   ```bash
   SKINSENSE_E2E_FACE=/path/to/face.jpg python code/tests_e2e/e2e_test.py
   ```

Screenshots are written to `code/tests_e2e/screenshots/`. Each run registers two new test accounts.
