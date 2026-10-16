# Zeit Health — website v2

Mobile-first marketing site. Plain HTML, CSS and JS: no framework, no build step.

## Sections

1. **Hero** — four words: simple / secure / health / superapp
2. **Card system** — company-style cards (colour field + data half) on the app's rail motion
   entry sweep, swipe and tap-to-open (ported from `zeit-flows-app/src/components/CardRail.jsx`)
3. **About** — short intro and four pillars
4. **Opt-in** — email sign-up for updates
5. **Footer**

## Run it

```
python3 -m http.server 4801
# open http://localhost:4801
```

## Before launch

- **Sign-ups are not saved yet.** Set `OPTIN_ENDPOINT` at the top of `app.js` to a form
  endpoint (Formspree, Supabase function, Mailchimp…). It gets a JSON POST `{ email, source }`.
- About-section copy is a first draft.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | All styles; tokens copied from the app |
| `app.js` | Card rail, springs, opened-card sheet, sign-up form |
| `assets/favicon.svg` | Tab icon |
