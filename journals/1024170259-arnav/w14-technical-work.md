# Week 14 : Security Review and Changes

## Security Review

I reviewed the SkinSense frontend, backend, and documentation deployment workflow for security issues. The backend currently exposes only a health endpoint, while the frontend contains the photo-analysis and recommendation flows. The review identified a wildcard CORS policy, privacy text that did not explain when profile information and photos are sent to the configured API, and unpinned dependencies in the documentation deployment workflow.

## CORS Configuration

I replaced the wildcard CORS origin setting in the backend with an allowlist configured through `SKINSENSE_ALLOWED_ORIGINS`. The default origins support the local Vite development server. Allowed methods and headers are now explicitly listed. A deployed environment should set the variable to its frontend origin or origins.

## Privacy Disclosure

I updated the profile page to explain that skin type, acne severity, allergies, and budget are sent to the configured SkinSense API when it is enabled, while profile notes remain in the browser. I also updated the results page to tell users that the photo is sent to the configured API for analysis.

## Documentation and Verification

I added `SECURITY-CHANGE-REPORT.md` to summarize the findings and code changes. The documentation deployment workflow's unpinned dependencies and write permissions remain for follow-up. This was a static review; I did not run automated tests or a dependency advisory scan.