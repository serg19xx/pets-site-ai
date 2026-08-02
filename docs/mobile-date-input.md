# Native `input type="date"` on mobile

## Symptom (soft launch, Aug 2026)

On the Add pet form (mobile layout), tapping the calendar icon on `Date of birth` opened the native picker and **closed it immediately**. Selecting a date was effectively impossible.

Desktop wide layout was fine or less noticeable.

## What we tried

1. **Stop nesting `type="date"` inside `<label>`**  
   On some mobile browsers a tap on the calendar indicator both opens the picker and re-activates the label, which toggles the picker closed.  
   Separating `label[for]` + `input` **did not fix** our case.

2. **Keep native date + CSS tweaks** (`min-height`, `color-scheme`) — no change.

## Current workaround

Use [`web/components/DateOfBirthField.vue`](../web/components/DateOfBirthField.vue): three `<select>`s (year / month / day) that sync to `YYYY-MM-DD` for the API. Used on pet create/edit, registration, and profile edit.

## Likely causes (for a later revisit)

Not fully proven for our stack; treat as a checklist when re-testing native date:

| Factor | Why it matters |
|--------|----------------|
| **Chromium date/time picker event timing** | Long-standing class of bugs: picker opens on focus/`pointerdown`, then a following `click` / capture outside closes it (see historical [Chromium 941910](https://bugs.chromium.org/p/chromium/issues/detail?id=941910) and library workarounds using `setPointerCapture` / `stopPropagation` on click). |
| **Chrome DevTools device mode** | Emulated mobile on desktop often mis-handles the native date popup (open → instant close). Always re-test on a **real phone** before blaming app code. |
| **Fixed UI chrome** | Our mobile shell has `position: fixed` bottom nav + sticky header with `backdrop-blur` and `z-40`. Native popups can lose focus or receive a spurious outside-click when layout / visual viewport shifts. |
| **Label / hit-target stacking** | Still a real footgun; never wrap `type="date"` in a clickable `<label>` that also contains the control. |
| **App JS** | No global `pointerdown` listener while the form is idle (user menu only binds when open). Unlikely primary cause, but re-check any capture-phase listeners before bringing native date back. |

## How to re-test later

1. On a **physical** iOS Safari and Android Chrome, temporarily restore:

   ```html
   <label class="ui-label-spaced" for="dob">Date of birth</label>
   <input id="dob" type="date" class="ui-input" required />
   ```

   on `/app/my-pets/new` only (not inside a wrapping `<label>`).

2. Compare: tap calendar icon vs tap the text area of the field; with bottom nav visible vs temporarily `display: none` on `.ui-bottom-nav`.

3. If it only fails in DevTools → document as tooling false positive; keep selects for DOB or use native only when `matchMedia('(pointer: fine)')`.

4. If it fails on real devices with bottom nav hidden → prefer a small custom picker or keep selects; do not spend more time fighting the OS control for DOB.

## Product note

For **date of birth**, year/month/day selects are often clearer than a calendar (users think in age, not “pick a day on a grid”). Keeping `DateOfBirthField` long-term is reasonable even after native date is understood.
