# Week 5 : End-to-End Skeleton

## Photo Validation Stub

I built the photo validation stub (`ok: true`) so the upload flow could be tested end to end before the real MediaPipe-based checks were ready. This unblocked the Upload page without waiting on the actual face-detection and lighting/angle logic.

## Frontend Pages

I built out the Upload, Results, and Recommendations pages in React, wired to the frozen API contracts Himmat and Ansh had agreed on. Each page was built to work against the stub responses first, so the UI could be reviewed and iterated on independently of backend progress.

## API Client and Manual-Fallback Mode

I wrote the frontend API client, including a manual-fallback mode: if the backend isn't reachable or a model step fails, the UI falls back to example/fixture data with a visible "Example data" banner rather than breaking. This meant the frontend was demoable even if a backend piece wasn't finished in time.

## Integration Check

Once Himmat's routers were merged, I connected the pages to the real (stub-backed) endpoints and walked through the full upload → prediction → recommendation flow in the browser to confirm nothing broke across the handoff.
