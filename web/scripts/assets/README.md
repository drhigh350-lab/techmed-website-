# Subject assets for `npm run seed`

Drop the Blueprint roadmap graphics and guide PDFs here before running
`node scripts/seed.mjs` (from `web/`), and it uploads them to Sanity and
attaches them to the matching subject automatically. Nothing here is
committed to git — these files only need to exist on your machine at seed
time; once uploaded, Sanity's CDN is the source of truth.

Any subject whose file isn't present yet is simply seeded without it (its
page falls back to the placeholder/"coming soon" state) — re-run the script
later once the file exists and it attaches on the next pass, no code
changes needed.

## Roadmap images — `roadmaps/`

One image per subject, named by slug:

```
roadmaps/mathematics.png      (or .jpg / .jpeg)
roadmaps/physics.png
roadmaps/chemistry.png
roadmaps/biology.png
roadmaps/use-of-english.png
```

## Guide PDFs — `guides/`

```
guides/mathematics.pdf
guides/physics.pdf
guides/chemistry.pdf
guides/biology.pdf
guides/use-of-english.pdf
```

Only add a guide once it's actually finished — this powers the real "View
Guide" / "Download Guide" buttons on the subject page.
