# Skin-type checkpoint

Place the trained checkpoint here as:

    mobilenetv2_skintype.pt

(the path `config.SKIN_TYPE_MODEL_PATH` points to). It's the file saved by the
training notebook's final cell as `mobilenetv2_skintype_final.pt` — just rename it
on the way in, no code change needed.

Expected contents (a dict, loaded with `torch.load(..., weights_only=False)`):

- `state_dict` — MobileNetV2 state dict, classifier replaced with
  `Sequential(Dropout(0.3), Linear(last_channel, len(classes)))`
- `classes` — list of class names, index-aligned with the model's output, e.g.
  `["dry", "normal", "oily"]`
- `preprocess` — dict with at least `sharpness_target`, matching
  `services/skin_preprocess.py`'s `preprocess()` keyword of the same name

If this file is missing, `services.inference.predict_skin_type()` returns `None`
and `/api/predict` asks the caller to supply `skin_type` manually (HTTP 409) — the
app keeps working without this file, just without the model-based reading.
