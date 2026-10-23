# Week 13 : Codebase Review, Security Changes and Verification

## Repository Overview

I reviewed the project architecture, including the backend authentication flow, PostgreSQL `AnalysisResult` schema, prediction and recommendation API routes, ingredient catalog, MediaPipe photo validation, and ResNet-50 inference loading for the `resnet50_acne.pt` checkpoint.

## Security Review and Changes

The review identified a wildcard CORS policy and privacy text that did not explain when profile details and photos are sent to the configured API. I updated the backend to use a CORS origin allowlist configured through `SKINSENSE_ALLOWED_ORIGINS`, with local Vite origins as the development defaults. I also limited the allowed methods and request headers.

I updated the profile and results pages to explain that profile preferences and photos are sent to the configured SkinSense API when it is enabled. Profile notes remain in the browser. I recorded these findings and changes in `SECURITY-CHANGE-REPORT.md`.

The documentation deployment workflow still installs unpinned dependencies and uses a write-capable token. This remains follow-up security work.

## Test Suite Execution

The original verification notes record that the backend authentication, image analysis, product recommendation, and health check tests passed on the `master` branch. Automated tests were not run after the CORS and privacy disclosure changes described above.

## Summary

I reviewed the integrated codebase and addressed the CORS and privacy disclosure findings. No schema changes or pull requests were made during this work. The documentation deployment workflow remains to be hardened.

## Notes

The review and changes were documented. The deployment workflow's dependency and token risks remain open.