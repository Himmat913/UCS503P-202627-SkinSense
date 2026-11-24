# Week 16 : Dark Mode Flash of Unstyled Content and Feedback State Lost on Navigation

## Flash of Unstyled Content in Dark Mode

**Error:**
No crash. On hard refresh, the page would flash white (light mode) for a fraction of a second before switching to dark mode, even when dark mode was the saved preference.

**Relevant Context**
The dark mode was applied by a `useEffect` that runs after the component mounts:

```jsx
// main.jsx — original broken version
function App() {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);
  ...
}
```

**Key Observation**
`useEffect` runs after the first paint. The browser paints the page once with the default (light) styles, then the effect fires and switches to dark mode. This causes a visible flash.

**Solution**
Add an inline `<script>` in the `<head>` of `index.html` that runs synchronously before any CSS or React mounts:

```html
<!-- index.html — fixed -->
<head>
  <script>
    (function () {
      try {
        var theme = localStorage.getItem("theme");
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        }
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" href="/src/base.css" />
</head>
```

**Because**
An inline script in `<head>` is a render-blocking resource — it runs before the browser paints anything. By the time the first pixel is painted, the `dark` class is already on the `<html>` element, so there is nothing to flash.

---

## Inline Feedback Widget Losing State on Navigation

**Error:**
No crash. When a user typed feedback text, navigated to another tab, and came back, the feedback form was empty. The `feedbackSent` flag was also reset, so users could submit feedback multiple times.

**Relevant Context**
The feedback state was held in local component state inside `Feedback.jsx`:

```jsx
// Feedback.jsx — original
const [feedbackText, setFeedbackText] = useState("");
const [feedbackSent, setFeedbackSent] = useState(false);
// component unmounts when user navigates away — state is destroyed
```

**Key Observation**
React destroys component state when a component unmounts. Navigation in a single-page app unmounts the results page, which unmounts `Feedback.jsx` and resets its state.

**Solution**
Lift `feedbackText` and `feedbackSent` to `AnalysisContext` so they survive navigation:

```jsx
// AnalysisContext.jsx — added feedback state
const [feedbackText, setFeedbackText] = useState("");
const [feedbackSent, setFeedbackSent] = useState(false);

// Feedback.jsx — now reads from context
const { feedbackText, setFeedbackText, feedbackSent, setFeedbackSent } = useAnalysis();
```

**Because**
`AnalysisContext` is mounted at the app root and lives for the full session. State in the context persists across route changes, so the feedback text and sent flag survive navigation between tabs.

---

## Summary

This week I fixed two issues found during final UI review. The dark mode flash was eliminated by moving the theme check to an inline script in `<head>` so it runs before the first paint. The feedback form losing state on navigation was fixed by lifting that state into `AnalysisContext`, which persists across route changes. The app now feels polished on both issues with no visual flicker and no state loss.
