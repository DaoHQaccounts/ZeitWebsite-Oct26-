# Zeit Health — website v12

Mobile-first marketing site. Plain HTML, CSS and JS: no framework, no build step.

## Sections

1. **Hero** — simple / secure / health / superapp, with the app's orb; lifts away on scroll
2. **Cards** — company-style cards; a stacked deck that fans into the app's rail as you scroll
3. **The app** — four use cases in a phone frame, built from the real app screens: Talk to ZEIT, Record a visit, Face Scan, Vault
4. **About** — short intro and four pillars
5. **Opt-in** — email sign-up for updates
6. **Footer**

## Share it

`share/zeit-health-v12.html` is the whole site in one file. Send it; it opens in any browser.

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
| `assets/og.png` | Preview image for shared links (needs the live domain in `og:image`) |
| `share/` | Single-file builds to send around |
