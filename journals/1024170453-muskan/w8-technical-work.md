# Week 8 : Confidence Display NaN and Stale Recommendations on Load

## Confidence Value Showing NaN% in Results

**Error:**
No crash. The results page displayed `NaN%` for the confidence score instead of a percentage.

**Relevant Context**
The backend returns confidence as a float between 0 and 1:

```json
{
  "acne_severity": "mild",
  "confidence": { "acne": 0.87, "skin_type": 0.71 }
}
```

The frontend component was trying to multiply it as if it were already a percentage:

```jsx
// Results.jsx — original broken version
<span>{Math.round(result.confidence.acne * 100)}%</span>
// result.confidence.acne was undefined because the key was accessed wrongly
// Math.round(undefined * 100) = NaN
```

**Key Observation**
The component accessed `result.confidence.acne` but `result.confidence` could be undefined if the response had not fully populated yet, and the key name used in the component did not exactly match the backend response shape. `Math.round(undefined * 100)` produces `NaN`.

**Solution**
Use nullish coalescing to guard against undefined before multiplying:

```jsx
// Results.jsx — fixed
<span>{Math.round((result.confidence?.acne ?? 0) * 100)}%</span>
```

**Because**
`?.` prevents a TypeError if `confidence` is undefined, and `?? 0` falls back to 0 so the math produces a valid number. The result displays as `0%` rather than `NaN%` while the data is loading.

---

## Stale Recommendations Showing While Fetching New Ones

**Error:**
No crash. When the user navigated to the recommendations page, the previous session's recommendations were visible for a moment before the new ones loaded. There was no loading indicator.

**Relevant Context**
The recommendations component fetched on mount but had no loading state:

```jsx
// Recommendations.jsx — original
const [recommendations, setRecommendations] = useState([]);

useEffect(() => {
  fetch("/api/recommendations")
    .then(res => res.json())
    .then(data => setRecommendations(data));
}, []);

// rendered the stale cached value from the previous render immediately
```

**Key Observation**
React initialises state from the previous render's value when the component remounts. The old recommendations were shown until the fetch completed. With no loading indicator the user could not tell if what they were seeing was current.

**Solution**
Add a loading state and clear recommendations before each fetch:

```jsx
// Recommendations.jsx — fixed
const [recommendations, setRecommendations] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  fetch("/api/recommendations")
    .then(res => res.json())
    .then(data => setRecommendations(data))
    .finally(() => setLoading(false));
}, []);

if (loading) return <Spinner />;
```

**Because**
Setting `loading: true` at the start of each fetch prevents the stale data from being visible during the in-flight period. `.finally()` ensures the spinner is removed whether the request succeeds or fails.

---

## Summary

This week I fixed the results page and the recommendations page after the MST review. The confidence display was showing `NaN%` due to unsafe property access on the response object. The recommendations page had no loading state, causing stale data to flash on screen. Both are now fixed and the UI gives the user accurate feedback during loading.
