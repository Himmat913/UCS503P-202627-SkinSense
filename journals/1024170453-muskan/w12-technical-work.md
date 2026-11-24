# Week 12 : Class Imbalance in Skin Type Model

## Per-Class Accuracy Imbalance — Dry Class at 0.54 F1

**Error:**
No crash. After training with equal class weighting, the per-class F1 scores showed a large gap:

```
              precision    recall  f1-score
dry              0.61      0.49      0.54
normal           0.68      0.73      0.70
oily             0.84      0.88      0.86

accuracy                             0.74
macro avg        0.71      0.70      0.70
weighted avg     0.73      0.74      0.73
```

**Relevant Context**
The dataset had unequal class distribution:

```
dry:    1,240 images
normal: 2,180 images
oily:   3,650 images
```

The model was trained with standard `CrossEntropyLoss` and no class weighting:

```python
# training — original, no class weights
criterion = nn.CrossEntropyLoss()
```

**Key Observation**
With an unbalanced dataset the loss function is dominated by the majority class (oily). The model learns to predict oily accurately at the expense of dry, because that minimises the unweighted loss most efficiently.

**Solution**
Compute inverse-frequency class weights and pass them to the loss function:

```python
from sklearn.utils.class_weight import compute_class_weight
import numpy as np

labels = [label for _, label in train_dataset.samples]
weights = compute_class_weight("balanced", classes=np.unique(labels), y=labels)
class_weights = torch.tensor(weights, dtype=torch.float).to(device)

criterion = nn.CrossEntropyLoss(weight=class_weights)
```

After retraining with balanced weights:

```
              precision    recall  f1-score
dry              0.69      0.64      0.66
normal           0.70      0.72      0.71
oily             0.80      0.82      0.81

balanced accuracy                    0.712
```

**Because**
`compute_class_weight("balanced")` sets each class weight proportional to `n_samples / (n_classes * n_samples_for_class)`. This penalises errors on minority classes more heavily, pushing the model to learn the dry class better rather than ignoring it.

---

## Dry/Normal Confusion Persisting After Retraining

**Error:**
No crash. Even after adding class weights, dry and normal were still confused with each other at a rate that could not be improved by further training.

**Relevant Context**
The confusion matrix after balanced retraining:

```
Predicted:   dry   normal   oily
Actual dry:   64      31       5
Actual norm:  28      73       9
Actual oily:   3      12      85
```

Dry and normal had a 28-31% mutual confusion rate. Manual review of misclassified images showed many cases where the two labels genuinely looked the same.

**Key Observation**
Human raters agree on dry vs normal only about 70-72% of the time for borderline cases. The model is hitting approximately the same ceiling. This is a data labelling uncertainty problem, not a model architecture problem.

**Solution**
Document the ceiling and handle low-confidence dry/normal predictions in the backend with a referral flag:

```python
# recommendations.py — referral for low confidence skin type
SKIN_TYPE_CONF_THRESHOLD = 0.60

if result.confidence_skin_type < SKIN_TYPE_CONF_THRESHOLD:
    result.referral_needed = True
    result.referral_reason = "skin_type_uncertain"
```

**Because**
When the fundamental ambiguity is in the training data labels, more training data or a larger model will not help. The honest response is to surface the uncertainty to the user via the referral flag rather than pretending to a confidence the model cannot have.

---

## Summary

This week I completed MobileNetV2 skin type model training with class-balanced weights. The per-class F1 for dry improved from 0.54 to 0.66 by using inverse-frequency weighting. The remaining dry/normal confusion is at the human inter-rater ceiling for this problem (~70-72%), so it is documented and handled with a referral flag for predictions below 0.60 confidence rather than treated as a training failure.
