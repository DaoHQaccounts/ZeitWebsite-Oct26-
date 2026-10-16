# Zeit Health — website v1 [imagery led]

Mobile-first marketing site. Plain HTML, CSS and JS: no framework, no build step.

v1 [imagery led] starts a new line of versions, built from v10 plus people. Feedback on v10: it looked like any AI company in 2025–26. It adds
studio photographs made with Higgsfield, all in one look: a pale studio, cream bouclé sofas,
cream knitwear, families of every age, a film camera at the edge of some frames.

## Sections

1. **Hero** — simple / secure / health / superapp, with the app's orb; lifts away on scroll
1b. **People** (new) — "One record for everyone you love": two rows of photos drifting slowly
2. **Cards** — company-style cards; a stacked deck that fans into the app's rail as you scroll
3. **The app** — the app in a phone frame, used the way a person would: swipe the cards, tap the orb, ask out loud, get an answer from the record. New: the phone stands in front of a photo of a person, which changes with each use case
4. **About** — short intro and four pillars. New: a film-set photo and a wearables photo
5. **Opt-in** — email sign-up for updates. New: a family photo above it
6. **Footer**

## Share it

`share/zeit-health-v1-imagery-led.html` is the whole site in one file. Send it; it opens in any browser.

## Run it

```
python3 -m http.server 4801
# open http://localhost:4801
```

## Before launch

- **Sign-ups are not saved yet.** Set `OPTIN_ENDPOINT` at the top of `app.js` to a form
  endpoint (Formspree, Supabase function, Mailchimp…). It gets a JSON POST `{ email, source }`.
- About-section copy is a first draft.
- **Photos load from Higgsfield's servers** (`d8j0ntlcm91z4.cloudfront.net`). Move them into
  `assets/` before launch so the site does not depend on someone else's links.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | All styles; tokens copied from the app |
| `app.js` | Card rail, springs, opened-card sheet, sign-up form |
| `assets/favicon.svg` | Tab icon |
| `assets/og.png` | Preview image for shared links (needs the live domain in `og:image`) |
| `share/` | Single-file builds to send around |
