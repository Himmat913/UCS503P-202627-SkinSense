# Week 16 : FinShield Test Case False Positive and Final Report Class Count Mismatch

## FinShield Test: Valid Transaction Flagged as Fraud

**Error:**
No crash in FinShield. But the test case designed to verify that a low-risk transaction passes without a fraud flag was failing — the model returned `fraud: true` for a transaction that was explicitly designed to be safe.

**Relevant Context**
The test input was constructed manually:

```python
# test_finshield.py — TC_REC_001
input_data = {
    "amount": 150.00,
    "merchant_category": "grocery",
    "hour_of_day": 14,
    "distance_from_home_km": 2.5,
    "new_merchant": False    # Python bool
}
expected = {"fraud": False}
actual = client.post("/predict", json=input_data).json()
# actual: {"fraud": true, "confidence": 0.72}
```

After checking the FinShield training notebook (GitHub: `harshit29062006/finshield_ai`), the `new_merchant` column was encoded as integer `0`/`1` during training, not as a boolean.

**Key Observation**
When `False` is serialised to JSON it becomes `false`. Some pandas or sklearn preprocessing pipelines coerce `false` (boolean) differently from `0` (integer). The FinShield model was treating the JSON boolean as a truthy non-zero value, which made it look like a new merchant.

**Solution**
Submit test inputs using integer encoding that matches the training data:

```python
# test_finshield.py — TC_REC_001 corrected
input_data = {
    "amount": 150.00,
    "merchant_category": "grocery",
    "hour_of_day": 14,
    "distance_from_home_km": 2.5,
    "new_merchant": 0    # explicit int, not Python bool
}
```

**Because**
Test inputs should match the encoding the model was trained on. The training data dictionary for FinShield specifies `0`/`1` for boolean fields. Using Python booleans introduces a serialisation ambiguity that some preprocessing chains handle differently from integers.

---

## Final Report Describing Four Severity Classes When Implementation Uses Three

**Error:**
No crash. But the final report's ML section described four severity classes (Hayashi grading), while the actual implementation throughout the codebase used three classes.

**Relevant Context**
The original proposal described four-level Hayashi grading. The report section was copied from the proposal without updating it:

```
Report text (copied from proposal):
  "The model classifies acne into four severity levels: minimal, mild,
   moderate, and severe, following Hayashi et al. (2008)."

Actual implementation (throughout codebase):
  - Three classes: mild (1-5 lesions), moderate (6-20), severe (>20)
  - Following Zhang & Ma, Sensors 2022 taxonomy
  - resnet50_acne.pt: output layer is nn.Linear(2048, 3)
```

**Key Observation**
A discrepancy between the proposal, the report, and the actual code is an evaluation risk. An examiner comparing the proposal to the final report would find inconsistent class counts and no explanation for the change.

**Solution**
Update the report to reflect the actual implementation and explain the deviation:

```
Updated report text:
  "The model classifies acne into three severity levels: mild (1-5 lesions),
   moderate (6-20 lesions), and severe (>20 lesions), following the taxonomy
   in Zhang & Ma (Sensors 2022). The original proposal described four Hayashi
   classes. This was revised during implementation because ACNE04's label
   distribution and Zhang & Ma's validated architecture both support three
   classes. A fourth class was considered but not pursued due to data sparsity."
```

**Because**
Final reports are graded against both the proposal and the actual deliverable. A deviation that is documented and justified demonstrates engineering judgement. An undocumented deviation looks like an oversight.

---

## Summary

This week I completed the FinShield test cases for our group's review task and updated the final report. The test case false positive was caused by using Python booleans instead of integer encoding in the test input, which did not match FinShield's training data format. The report class count mismatch was fixed by updating the ML section to accurately reflect the three-class implementation and explaining the change from the original four-class proposal.
