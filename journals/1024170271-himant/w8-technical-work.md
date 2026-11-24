# Week 8 : MediaPipe Photo Validation and Predict Endpoint Wiring

## Photo Validation Crashing on JPEG Upload

**Error:**
```
Traceback (most recent call last):
  File ".../photo_validation.py", line 34, in validate_photo
    results = face_detection.process(image_array)
ValueError: data type must be uint8
  (MediaPipe received a 1-D buffer of compressed bytes instead of a decoded image)
```

**Relevant Context**
The validation gate was receiving the raw uploaded file bytes from FastAPI and passing them straight to MediaPipe:

```python
# photo_validation.py — original broken version
async def validate_photo(file: UploadFile) -> ValidationResult:
    contents = await file.read()
    image_array = np.frombuffer(contents, dtype=np.uint8)
    with mp_face_detection.FaceDetection(min_detection_confidence=0.5) as face_detection:
        results = face_detection.process(image_array)
```

**Key Observation**
`np.frombuffer` on JPEG bytes produces a 1-D array of compressed data. MediaPipe's `.process()` needs a decoded H x W x 3 RGB numpy array. The raw bytes are still JPEG-compressed, not pixel data.

**Solution**
Decode the image with PIL first, convert to RGB, then hand it to MediaPipe:

```python
# photo_validation.py — fixed version
from PIL import Image
import io

async def validate_photo(file: UploadFile) -> ValidationResult:
    contents = await file.read()
    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    image_array = np.array(pil_image, dtype=np.uint8)   # H x W x 3, uint8
    with mp_face_detection.FaceDetection(min_detection_confidence=0.5) as face_detection:
        results = face_detection.process(image_array)
```

**Because**
MediaPipe's Python bindings call into native C++ code that expects a contiguous uint8 array shaped (H, W, 3). PIL's `.open().convert("RGB")` fully decodes the JPEG and produces exactly that shape and dtype.

---

## AnalysisResult Not Being Saved After Prediction

**Error:**
No crash. The `/api/predict` endpoint returned results but nothing appeared in the `analysis_results` table. Queries to `/api/progress` returned an empty list every time.

**Relevant Context**
The predict endpoint was calling the ML model and returning the JSON response, but the SQLAlchemy insert was missing:

```python
# inference.py — predict endpoint, original
@router.post("/predict")
async def predict(file: UploadFile, db: Session = Depends(get_db), user = Depends(get_current_user)):
    validation = await validate_photo(file)
    result = run_inference(file)
    return result   # never saved to DB
```

**Key Observation**
The endpoint returned the model output correctly but never committed an `AnalysisResult` row. All progress tracking and history depend on that row existing.

**Solution**
Insert the row before returning:

```python
@router.post("/predict")
async def predict(file: UploadFile, db: Session = Depends(get_db), user = Depends(get_current_user)):
    validation = await validate_photo(file)
    result = run_inference(file)
    db_result = AnalysisResult(
        user_id=user.id,
        acne_severity=result["acne_severity"],
        skin_type=result["skin_type"],
        skin_type_source=result.get("skin_type_source", "manual"),
        confidence_acne=result["confidence"]["acne"],
        confidence_skin_type=result["confidence"]["skin_type"],
        referral_needed=result["referral_needed"],
    )
    db.add(db_result)
    db.commit()
    return result
```

**Because**
SQLAlchemy does not auto-persist objects. `db.add()` stages the row in the session and `db.commit()` flushes it to PostgreSQL. Without that the ORM object only exists in memory for the duration of the request.

---

## Summary

This week I closed the two main gaps flagged in the MST feedback. The photo validation gate was wired up with real MediaPipe face detection replacing the stub, and every successful prediction now writes a row to `analysis_results` so progress tracking can work. The fix to the JPEG decoding issue also taught me that any library calling into native C++ code usually has strict dtype and shape requirements that Python's duck typing will not catch at the call site.
