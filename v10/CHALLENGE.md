# Transcript vs V9: the challenge

V9 lives in `DaoHQaccounts/ZeitWebsite-Oct26-` (`share/zeit-health-v9.html`). This repo starts over from the call
transcript, which arrived after V9 was built. Each point below says what the call asked for, what V9 does, and
what this build (B) does.

Key: ✅ V9 already matches · ⚠️ V9 partly matches · ❌ V9 goes against it

## The brief

| # | Transcript says | V9 | Verdict | This build (B) |
|---|---|---|---|---|
| 1 | Keep the design very simple | Orb renderer, springs, 3D tilt, scripted voice tour; ~42 KB of JS | ❌ | One file, ~120 lines of JS, native swipe |
| 2 | Same card system as the app | Company-style cards with colour field and data rows | ✅ | Kept the app's hues and gradients |
| 3 | Mobile first, feels like the app: swipe, open cards | Swipe rail, double tap to open | ⚠️ double tap is hard to find | Swipe; one tap opens the card |

## Page structure

| # | Transcript says | V9 | Verdict | This build (B) |
|---|---|---|---|---|
| 4 | Hero: short text, roughly "secure health super app" | "simple / secure / health / superapp", huge, stacked | ⚠️ | "The secure health superapp." plus one line |
| 5 | Hero stays; still there when you scroll back up | Words blur in once, then the hero lifts away and fades | ⚠️ reads like an intro animation | Plain section, no intro animation |
| 6 | Top of the page is not filled with content | Hero is empty apart from the words and orb | ✅ | Kept empty: words and a soft wash |
| 7 | First scroll: the system / how it works | First scroll is a card deck of health values | ❌ | "How it works": three step cards |
| 8 | Then: use cases | Use cases sit inside the phone section | ❌ not its own section | Own section: five use-case cards |
| 9 | Then: the app, with the card/swipe experience | Phone with a scripted voice tour | ⚠️ you watch it, you don't use it | Phone with real swipe and open |
| 10 | (not asked for) | About section with four pillars | ❌ extra | Removed |
| 11 | (not asked for) | Email sign-up | ❌ extra | Removed; ask Minh |

## Visual direction

| # | Transcript says | V9 | Verdict | This build (B) |
|---|---|---|---|---|
| 12 | Brand colours and gradients | Yes | ✅ | Kept |
| 13 | Half image on the card, information below | Colour field is about a third of the card | ⚠️ | Image is exactly half |
| 14 | Coloured headline | Headline is white on the colour field | ❌ | Headline in the card's colour, below the image |
| 15 | Minh's design reference | Not received | — | Not received; images are gradient placeholders |

## How to deliver

| # | Transcript says | V9 | Verdict | This build (B) |
|---|---|---|---|---|
| 16 | Quick HTML | HTML, CSS, JS | ✅ | One HTML file |
| 17 | No extra tools or functionality | Canvas orb, physics, voice tour | ❌ | None of these |
| 18 | Something visible fast | — | — | Done |

## Open questions for Minh

- Section 2 in the transcript is garbled ("our rail systems"). Is it "how it works", or the card rail itself?
- Should the sign-up form come back?
- Real photos for the card images, or keep gradients?
- Is "The secure health superapp." the right hero line?
