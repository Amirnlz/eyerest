# Bundled fonts

The design system uses Manrope (variable, SIL Open Font License 1.1). The loader in
`src/renderer/fonts.ts` registers every file listed in `src/design/fonts.ts` that exists in this
folder. A missing file is not an error: the UI uses the system sans stack.

Required files:

- `Manrope-Variable.woff2`: the variable font, weight axis 200 to 800, Latin subset.
- `OFL.txt`: the license text that ships with the font download. The license requires it to travel
  with the font. A test fails if the font is present without it.

## Producing the font file

1. Download the Manrope family from Google Fonts. Use the variable file `Manrope[wght].ttf` and
   copy `OFL.txt` from the same download.
2. Subset to Latin and convert to woff2 (needs Python with `fonttools` and `brotli`):

   ```bash
   pyftsubset "Manrope[wght].ttf" \
     --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
     --layout-features="*" \
     --flavor=woff2 \
     --output-file=Manrope-Variable.woff2
   ```

3. Put `Manrope-Variable.woff2` and `OFL.txt` in this folder. Expect about 30 to 60 KB.

## Checking it works

Run `npm run dev`, open the overlay DevTools, and run:

```js
document.fonts.check("1rem 'Manrope Variable'")
```

It returns `true` once the face is registered. In the Network tab the font request is served from
the app, never from a remote host (the CSP is `default-src 'self'`).
