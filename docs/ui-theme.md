# UI theme library

CSS-first design theme for Pet Friends. Change look in one place; use stable `ui-*` classes in templates.

## How it works

```
tokens.css  →  components.css (.ui-*)  →  Vue pages / components
(theme)        (primitives)               (layout utilities + ui-*)
```

| File | Role |
|------|------|
| [`web/assets/css/tokens.css`](../web/assets/css/tokens.css) | Colors, radii, surfaces, **control sizes** — edit theme here |
| [`web/assets/css/components.css`](../web/assets/css/components.css) | `.ui-*` primitives (buttons, inputs, cards, shell) |
| [`web/assets/css/main.css`](../web/assets/css/main.css) | Imports Tailwind + tokens + components |

**Rules**

- **Look** → `ui-*` classes (or tokens that drive them).
- **Layout / spacing** → Tailwind utilities (`mt-6`, `flex`, `gap-4`, …).
- Do not paste long one-off Tailwind strings for buttons, inputs, or cards when a `ui-*` class exists.

## Theme tokens (`tokens.css`)

### Color & surface

| Token | Use |
|-------|-----|
| `--color-primary-*` | Brand scale (Tailwind `@theme`) |
| `--ui-surface` | Cards, inputs, header |
| `--ui-surface-muted` | Page background |
| `--ui-surface-inset` | Nested panels |
| `--ui-border` / `--ui-border-strong` | Dividers / control borders |
| `--ui-text` / `--ui-text-muted` / `--ui-text-subtle` | Body hierarchy |
| `--ui-ring` | Focus ring color |

### Radius

| Token | Use |
|-------|-----|
| `--radius-control` | Inputs, buttons, small chips |
| `--radius-card` / `--radius-panel` | Cards, panels |

### Form controls (shared height)

| Token | Default | Use |
|-------|---------|-----|
| `--ui-control-min-height` | `2.75rem` | `.ui-input`, `.ui-select`, `type="date"` |
| `--ui-control-padding-x` | `0.75rem` | Horizontal padding |
| `--ui-control-padding-y` | `0.625rem` | Vertical padding |
| `--ui-control-font-size` | `0.875rem` | Control text |
| `--ui-focus-ring-width` | `2px` | Focus rings (available for buttons) |

Tune date vs select height on iPhone by adjusting `--ui-control-min-height` (and date WebKit rules in `components.css`). See also [mobile-date-input.md](./mobile-date-input.md).

Dark mode overrides surface/text/border under `.dark` in `tokens.css`.

## Class cheat sheet

### Typography

`ui-h1` … `ui-h4` · `ui-page-title` · `ui-section-title` · `ui-page-subtitle` · `ui-lead` · `ui-body` · `ui-caption` · `ui-hint` · `ui-overline` · `ui-prose`

### Buttons

`ui-btn-primary` · `ui-btn-secondary` · `ui-btn-ghost` · `ui-btn-danger` · sizes `ui-btn-sm` / `ui-btn-md` · `ui-btn-block`

### Forms

`ui-label` · `ui-label-spaced` · `ui-field` · `ui-field-label` · `ui-input` · `ui-select` · `ui-textarea` · `ui-form` · `ui-form-stack` · `ui-form-actions` · `ui-checkbox` · `ui-checkbox-label`

Date of birth:

```html
<label class="ui-label-spaced" for="dob">Date of birth</label>
<input id="dob" type="date" class="ui-input" required />
```

### Surfaces

`ui-card` · `ui-card-lg` · `ui-card-muted` · `ui-panel` · `ui-panel-title` · `ui-empty` · `ui-under-construction*`

### Feedback

`ui-alert` · `ui-alert-error` · `ui-alert-success` · `ui-alert-warning` · `ui-loading`

### Shell / nav

`ui-shell` · `ui-shell-body` · `ui-shell-main` · `ui-header` · `ui-nav-item` · `ui-bottom-nav` · `ui-page-container`

### Icons

`ui-icon` + `ui-icon-sm` / `ui-icon-md` / `ui-icon-lg`

## How to change the interface

1. **Palette / radii / control size** → edit [`tokens.css`](../web/assets/css/tokens.css).
2. **Shape of a control or button** → edit the matching `.ui-*` block in [`components.css`](../web/assets/css/components.css).
3. **One page layout** → Tailwind utilities on that page only; do not fork new one-off button styles.

## Out of scope (for now)

Storybook, Vue wrapper components for every primitive, and splitting `components.css` into many files — revisit if the file becomes hard to navigate.
