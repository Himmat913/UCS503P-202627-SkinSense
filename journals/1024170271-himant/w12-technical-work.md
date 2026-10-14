# Week 12 : Photo Validation and Merge to Master

## Saving Predictions

I connected the `AnalysisResult` table to `/api/predict`. Every prediction, whether it comes from a photo or from manual input, is now saved with the user, image id, skin type and confidence, acne severity and confidence, lesion estimate, source (`model`, `stub` or `manual`) and the referral flag.

## Test Fixes and Merge to Master

Two predict tests started failing after the real inference work. `/api/predict` with an `image_id` now needs a `skin_type`, so the old tests got a 422 instead of the response they expected, and one of them also checked for `source == "stub"`. The app was behaving correctly and the tests were outdated, so I updated them to send `skin_type` and to accept either `stub` or `model` as the source. I also added a test that a photo request without `skin_type` is rejected. After that everything passed, and I merged the integration branch (real inference, PostgreSQL and Alembic, the product catalog and the new frontend) into `master` with a pull request.

## MediaPipe Photo Validation

I replaced the validation stub, which returned `ok: true` for every file, with a real `validate_photo` that uses MediaPipe FaceMesh. The return format is the same as before (`ok`, `reasons`, `checks`, `validator_version`). A photo is rejected, with a message the user can act on, when:

- the file cannot be read as an image
- no face is found, or more than one face is found
- the face is cut off at the edge of the photo or is too small in the frame
- the head is turned too far to the side (I estimate yaw from where the nose sits between the two cheek landmarks)
- the face region is too dark or too bright
- the face is blurry (variance of the Laplacian on a face crop resized to 256 px)

Phone photos are rotated according to their EXIF data before the checks, because MediaPipe expects an upright face. The upload page already shows the reasons returned by the backend, so the frontend did not need any change.

The newest MediaPipe releases no longer include the `mp.solutions` API, which has the face models bundled inside the package. The replacement API needs a separate model file to be downloaded. I pinned `mediapipe==0.10.21`, the last version that has the bundled models. It needs `numpy<2`, so I pinned `numpy==1.26.4` too and checked that the project's PyTorch version still works with it.

If MediaPipe cannot be imported, the validator lets photos through and reports `mediapipe-unavailable` as its version, so a broken install does not block the whole upload flow.

For testing, the face detector is a separate function, so the unit tests replace it with fake landmarks and cover each rejection reason without a real face photo. One more test runs the real MediaPipe on a blank image and checks that it finds no face. The existing upload test now stubs the validator, since a plain test image correctly fails validation. I also added a small command line helper (`py -m services.photo_validation <image>`) to check the thresholds on real photos.

## CI

I added a GitHub Actions workflow that runs the backend tests and builds the frontend on every pull request and every push to `master`. The tests run in stub mode so the workflow does not need PyTorch.

## Notes

The validation thresholds are starting values and need tuning on more real photos. The skin-type model is the next big ML task.
