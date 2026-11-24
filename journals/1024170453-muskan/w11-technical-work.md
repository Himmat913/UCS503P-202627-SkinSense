# Week 11 : Inflated Validation Accuracy from Duplicate Images

## Validation Accuracy at 96% Due to Near-Duplicate Images

**Error:**
No crash. The first training run reported 96% validation accuracy, which was far higher than expected for a 3-class skin type problem. This was suspicious.

**Relevant Context**
The dataset was collected by scraping images from multiple sources. The train/val split was done randomly without checking for duplicates:

```python
# training notebook — original split, no deduplication
from sklearn.model_selection import train_test_split

all_paths = glob("dataset/**/*.jpg", recursive=True)
train_paths, val_paths = train_test_split(all_paths, test_size=0.2, random_state=42)
# near-identical images from the same source could end up in both splits
```

After training, checking the val set manually showed many images that were slightly resized or re-compressed versions of training images.

**Key Observation**
Near-duplicate images in both train and val sets inflate validation accuracy because the model has effectively seen those images during training. The 96% figure was measuring memorisation, not generalisation.

**Solution**
Compute MD5 hashes for every image, deduplicate on hash, then split:

```python
import hashlib
from pathlib import Path

def file_hash(path):
    return hashlib.md5(Path(path).read_bytes()).hexdigest()

# deduplicate
seen = {}
unique_paths = []
for p in all_paths:
    h = file_hash(p)
    if h not in seen:
        seen[h] = p
        unique_paths.append(p)

# now split
train_paths, val_paths = train_test_split(unique_paths, test_size=0.2, random_state=42)
```

After deduplication, validation accuracy dropped to ~71%, which matched the expected range from the Zhang & Ma paper.

**Because**
MD5 catches exact duplicates. Near-duplicates (same image re-saved at different quality) produce different hashes, but the main issue was exact copies from multiple download passes of the same source. The hash dedup removed those cleanly. The 71% figure is the honest baseline for this problem.

---

## NameError: train_loader Not Defined on Kaggle Re-Run

**Error:**
```
NameError: name 'train_loader' is not defined
```

Appeared on Kaggle when clicking "Save and Run All" after adding new cells to the notebook.

**Relevant Context**
Previous experiments had left stale cells in the notebook that defined `train_loader` in one place and used it in another. When cells were reordered or deleted the reference broke:

```python
# Cell 12 (from an abandoned experiment — later deleted)
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)

# Cell 18 (still in notebook, referencing the deleted cell's variable)
for epoch in range(NUM_EPOCHS):
    for batch in train_loader:   # NameError: train_loader not defined
        ...
```

**Key Observation**
Kaggle notebooks execute cells in order on "Save and Run All" but interactive sessions keep variables in memory from previous runs. A notebook that works interactively can fail on a clean run if it has stale cells that were only run manually.

**Solution**
Delete all stale cells and do "Restart and Run All" before every commit:

```python
# Clean notebook structure — define train_loader in the same cell as the training loop
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

for epoch in range(NUM_EPOCHS):
    for batch in train_loader:
        ...
```

**Because**
"Restart and Run All" clears all kernel state and runs every cell from scratch in order. Any undefined variable that only existed in a previous interactive session will cause a NameError, which is exactly what you want to catch before committing.

---

## Summary

This week I fixed two data quality issues in the skin type model training pipeline. The inflated validation accuracy was caused by near-duplicate images crossing the train/val boundary. After MD5-based deduplication the accuracy settled at 71%, which is the honest baseline for this dataset. The Kaggle NameError was caused by stale cells from abandoned experiments — the fix is to always do "Restart and Run All" before committing a notebook version.
