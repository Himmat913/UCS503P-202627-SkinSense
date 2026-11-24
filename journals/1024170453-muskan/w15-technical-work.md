# Week 15 : Tab Bar Overflow on iPhone SE and TypeError on Ingredients Page

## Tab Bar Items Clipped on iPhone SE (375px)

**Error:**
No crash. On an iPhone SE viewport (375px wide), the bottom tab bar clipped the last item — it was partially off-screen. On larger phones it looked fine.

**Relevant Context**
The tab bar had five items, each with a fixed width:

```css
/* components.css — original */
.tab-bar-item {
  width: 80px;
  flex-shrink: 0;
}
/* 5 items × 80px = 400px — overflows 375px viewport */
```

```jsx
// Layout.jsx — original tab bar
<nav className="tab-bar">
  <TabItem label="Home" />
  <TabItem label="Upload" />
  <TabItem label="Results" />
  <TabItem label="Routine" />
  <TabItem label="Profile" />
</nav>
```

**Key Observation**
`5 × 80px = 400px` is wider than a 375px viewport. With `flex-shrink: 0` the items do not compress, so the last item is pushed off-screen.

**Solution**
Replace the fixed width with `flex: 1` so each item shares the available space equally:

```css
/* components.css — fixed */
.tab-bar-item {
  flex: 1;
  min-width: 0;
}
```

**Because**
`flex: 1` distributes the container's width equally among all children regardless of the total pixel count. `min-width: 0` prevents the flex children from overflowing their allocated share if the label text is long.

---

## TypeError on Ingredients Page When category Is Undefined

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'toLowerCase')
  at Ingredients.jsx:47:32
```

The ingredients page crashed when browsing certain products.

**Relevant Context**
The ingredients component called `.toLowerCase()` on `item.category` to filter and group products:

```jsx
// Ingredients.jsx — original broken version
const filtered = ingredients.filter(item =>
  item.category.toLowerCase().includes(searchTerm.toLowerCase())
);
```

Some products in `ingredients.json` had no `category` field, so `item.category` was `undefined`.

**Key Observation**
`.toLowerCase()` on `undefined` throws a TypeError. The JSON data was inconsistent — most products had a `category` but some did not.

**Solution**
Use nullish coalescing to fall back to an empty string when `category` is missing:

```jsx
// Ingredients.jsx — fixed
const filtered = ingredients.filter(item =>
  (item.category ?? "").toLowerCase().includes(searchTerm.toLowerCase())
);
```

**Because**
`?? ""` returns an empty string when `item.category` is `null` or `undefined`, so `.toLowerCase()` always has a string to work on. Products with no category just never match the category filter, which is the correct behaviour.

---

## Summary

This week I handled two frontend bugs found during mobile testing. The tab bar overflow on iPhone SE was fixed by switching from fixed pixel widths to `flex: 1`. The ingredients page crash was caused by optional fields in the JSON data not being guarded before string operations. Both are now fixed and mobile layout and ingredients browsing work correctly across all viewport sizes tested.
