# Native `input type="date"` on mobile

## Conclusion (Aug 2026)

**Native `type="date"` works on real phones.** The open-then-close calendar was reproduced only in **browser mobile emulation** (DevTools device mode), not on physical devices.

We keep native date inputs. Prefer:

```html
<label class="ui-label-spaced" for="dob">Date of birth</label>
<input id="dob" type="date" class="ui-input" required />
```

Do **not** wrap the control inside `<label>…<input type="date" /></label>` (label nesting can still cause toggle quirks on some browsers).

## iOS width quirk

Safari sizes `type="date"` to the formatted value (narrow chip). Force full width in CSS:

- `.ui-input[type='date']` → `width: 100%`, `-webkit-appearance: none`
- `::-webkit-date-and-time-value { text-align: left }`

Selects already use `appearance-none` + full width; date must match that contract.

## Symptom we saw

In DevTools mobile layout, tapping the calendar icon opened the native picker and closed it immediately. Year/month/day selects were a temporary workaround for that tooling false positive.

## Checklist if it “breaks” again in the browser

1. Re-test on a **real** iOS Safari / Android Chrome before changing UI.
2. Confirm DevTools device mode is not the only failing environment.
3. Check fixed bottom nav / sticky header only after real-device failure.
4. Historical Chromium picker event-timing bugs exist, but they were not our soft-launch cause.

## Product note

Selects (year / month / day) remain a valid DOB UX if we ever want them for accessibility or older WebViews — not required after the phone check.
