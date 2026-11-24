# Week 12 : draw.io Export Quality and Missing Model Files in Deployment Diagram

## draw.io PNG Export Blurry at Default Zoom

**Error:**
No crash. The exported PNG diagrams looked sharp on screen but were blurry when inserted into the report at print size.

**Relevant Context**
The diagrams were exported from draw.io at the default 100% zoom, which rasterises at 96 dpi:

```
Export settings used:
  Zoom: 100%
  Format: PNG
  Resolution: 96 dpi (screen default)

Result: image was 820 × 460px
When placed in a Word document at 10cm wide: ~208 dpi
When printed at 300 dpi: upscaled and blurry
```

**Key Observation**
96 dpi is fine for screen but insufficient for print. The image was being upscaled when placed in the document, making text in the diagram look fuzzy.

**Solution**
Export at 300% zoom or export as SVG:

```
Option 1 — High-res PNG:
  File > Export As > PNG
  Zoom: 300%
  Result: 2460 × 1380px — clean at print size

Option 2 — SVG (vector, infinitely scalable):
  File > Export As > SVG
  Embed fonts: Yes
  Include a copy of the diagram: Yes
```

**Because**
PNG is raster — the pixels are fixed at export time. Exporting at 300% gives enough pixel density for 300 dpi print. SVG is vector and scales to any size without loss, making it the better choice for diagrams that will be printed.

---

## Deployment Diagram Missing Model Files Node

**Error:**
No crash. The lab evaluator flagged the deployment diagram as incomplete — the ML model files were not represented as a node.

**Relevant Context**
The deployment diagram showed the FastAPI server, database, and frontend, but the model files were not explicitly shown:

```
Original diagram nodes:
  [Browser]  <-->  [FastAPI Server]  <-->  [PostgreSQL]
                         |
                   [React Frontend]
```

The evaluator's feedback: "Where are the model weights stored? How does the inference module access them? This is a critical part of your deployment."

**Key Observation**
The model files (`resnet50_acne.pt`, `mobilenetv2_skintype.pt`) are not database rows or API responses — they are static files loaded from disk at server startup. They are a distinct deployment artefact that needs to be shown.

**Solution**
Add a "Model Store" node attached to the FastAPI server:

```
Updated diagram nodes:
  [Browser]  <-->  [FastAPI Server]  <-->  [PostgreSQL]
                         |
               [Model Store: /models/]
               resnet50_acne.pt
               mobilenetv2_skintype.pt
```

**Because**
A deployment diagram should show every persistent artefact the system depends on. If the model files are missing from the production server the application fails at startup. Making this explicit in the diagram also prompts the README to include a step for downloading them.

---

## Summary

This week I fixed the two diagram issues flagged during the week 12 lab review. The PNG export quality was improved by exporting at 300% zoom. The deployment diagram was updated to include the model store node, which was a valid gap the evaluator caught. The diagrams are now in the repo at the correct path.
