# Week 14 : Analysis Progress Stuck on Step 0 and DemoBanner Not Clearing

## AnalysisProgress Stuck on Step 0

**Error:**
No crash. After submitting a photo, the progress bar would jump straight from step 0 to the final step without animating through the intermediate stages.

**Relevant Context**
The original implementation used `.then()` chaining to advance through steps, but all the state updates were batched by React before the next render:

```jsx
// AnalysisProgress.jsx — original broken version
const runAnalysis = () => {
  setStep(1);
  fetch("/api/predict", { method: "POST", body: formData })
    .then(() => setStep(2))
    .then(() => setStep(3))
    .then(data => {
      setStep(4);
      setPrediction(data);
    });
};
```

**Key Observation**
`.then()` callbacks fire in the same microtask queue flush. React batches the `setStep` calls and only re-renders once at the end of the batch, so the intermediate step values are never painted. The progress bar jumps from 0 to the final step.

**Solution**
Use `async/await` with explicit delays between steps so each `setStep` triggers a separate render:

```jsx
// AnalysisProgress.jsx — fixed
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const runAnalysis = async () => {
  setStep(1);
  await sleep(400);
  setStep(2);
  const res = await fetch("/api/predict", { method: "POST", body: formData });
  setStep(3);
  await sleep(300);
  const data = await res.json();
  setStep(4);
  setPrediction(data);
};
```

**Because**
`await sleep()` yields control back to the browser between each step, allowing React to flush the state update and repaint the progress bar before the next step fires.

---

## DemoBanner Persisting After Live Prediction

**Error:**
No crash. After a user ran a real prediction, the demo banner ("You are viewing demo data") continued to show on the results page.

**Relevant Context**
The `DemoBanner` component reads `dataSource.usedMock` from the analysis context, but that flag was never reset before a live prediction attempt:

```jsx
// Upload.jsx — original
const handleSubmit = async () => {
  // dataSource.usedMock was still true from a previous demo session
  const res = await fetch("/api/predict", { method: "POST", body: formData });
  const data = await res.json();
  setDataSource({ usedMock: false, ...data });  // only set after fetch returned
};
```

If the user had viewed the demo, `usedMock` was `true` in the context. The fetch ran and returned real data, but the banner was visible during the entire loading period and sometimes persisted if `setDataSource` was not called in the right order.

**Key Observation**
`usedMock` was only cleared after the fetch completed. During the fetch, and in any error path, it stayed `true` and the banner remained.

**Solution**
Clear `usedMock` before starting the live fetch:

```jsx
// Upload.jsx — fixed
const handleSubmit = async () => {
  dataSource.usedMock = false;   // clear before fetch
  const res = await fetch("/api/predict", { method: "POST", body: formData });
  const data = await res.json();
  setDataSource({ usedMock: false, ...data });
};
```

**Because**
Setting `usedMock = false` before the fetch ensures the banner disappears immediately when the user submits a real photo, rather than persisting through the loading period.

---

## Summary

This week I fixed two UX issues with the analysis flow. The progress animation was not working because React batched the state updates — switching to `async/await` with `sleep()` calls between steps fixed that. The demo banner persisting after a live prediction was caused by `usedMock` only being cleared after the fetch, not before it. Both are now fixed and the live prediction flow looks correct end-to-end.
