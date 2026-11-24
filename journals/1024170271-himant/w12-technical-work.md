# Week 12 : ResNet-50 Checkpoint Key Mismatch and Frontend 409 Handling

## ResNet-50 State Dict Key Mismatch on Load

**Error:**
```
RuntimeError: Error(s) in loading state_dict for ResNet:
        Unexpected key(s) in state_dict: "model.conv1.weight", "model.bn1.weight",
        "model.bn1.bias", "model.layer1.0.conv1.weight" ...
        Missing key(s) in state_dict: "conv1.weight", "bn1.weight" ...
```

**Relevant Context**
The checkpoint was saved from a training wrapper class that wrapped the ResNet inside a `self.model` attribute:

```python
# training script — how the checkpoint was saved
class AcneClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = resnet50(pretrained=True)
        self.model.fc = nn.Linear(2048, 3)

trainer = AcneClassifier()
torch.save(trainer.state_dict(), "resnet50_acne.pt")
# keys saved as: "model.conv1.weight", "model.layer1.0.conv1.weight" ...
```

But at inference time the checkpoint was loaded directly into a bare ResNet:

```python
# inference.py — original broken load
model = resnet50(pretrained=False)
model.fc = nn.Linear(2048, 3)
model.load_state_dict(torch.load("resnet50_acne.pt"))
# bare ResNet keys: "conv1.weight", "layer1.0.conv1.weight" ...
# mismatch with the "model." prefix in the checkpoint
```

**Key Observation**
The checkpoint keys carry a `model.` prefix from the wrapper class. The inference-time model has no wrapper, so its keys have no prefix. PyTorch's `load_state_dict` does an exact string match on keys — any prefix difference causes a full failure.

**Solution**
Strip the `model.` prefix from every key before loading:

```python
import collections

raw = torch.load("resnet50_acne.pt", map_location="cpu")
fixed = collections.OrderedDict(
    (k[len("model."):] if k.startswith("model.") else k, v)
    for k, v in raw.items()
)
model = resnet50(pretrained=False)
model.fc = nn.Linear(2048, 3)
model.load_state_dict(fixed)
model.eval()
```

**Because**
`torch.save(module.state_dict())` serialises the keys exactly as they appear in the module hierarchy. Wrapping a model in `self.model` prepends `model.` to every key. Stripping the prefix at load time realigns the keys without needing to re-export the checkpoint.

---

## Frontend Not Handling HTTP 409 from Predict Endpoint

**Error:**
No crash in the backend. But after uploading a photo without first saving a skin type, the frontend displayed a generic error message instead of prompting the user to enter their skin type.

**Relevant Context**
The predict endpoint returns 409 when skin type has not been recorded and the user has not filled in the profile:

```python
# inference.py — backend 409 response
if not user.skin_type and not body.skin_type:
    raise HTTPException(status_code=409, detail="skin_type_required")
```

The original frontend fetch just caught all non-2xx responses as a generic error:

```js
// Upload.jsx — original
const res = await fetch("/api/predict", { method: "POST", body: formData });
if (!res.ok) {
  setError("Something went wrong. Please try again.");
  return;
}
```

**Key Observation**
A 409 from this endpoint has a specific meaning: the backend needs skin type to be provided before it can run inference. That is not the same as a generic failure and needs its own UI path.

**Solution**
Check for 409 specifically and return a sentinel that the calling component can act on:

```js
// Upload.jsx — fixed
const res = await fetch("/api/predict", { method: "POST", body: formData });
if (res.status === 409) {
  return { skinTypeRequired: true };
}
if (!res.ok) {
  setError("Something went wrong. Please try again.");
  return;
}
const data = await res.json();
```

**Because**
HTTP status codes carry semantic meaning. A 409 Conflict here signals a specific precondition failure, not a server error. Handling it separately lets the UI show a targeted prompt instead of a generic error that leaves the user unsure what went wrong.

---

## Summary

This week I integrated the trained ResNet-50 acne severity model into the backend. The main blocker was a state dict key mismatch caused by the training checkpoint being saved from a wrapper class. Stripping the key prefix at load time fixed it without re-training. I also improved the frontend to handle the 409 response from the predict endpoint so users are properly directed to fill in their skin type before running analysis.
