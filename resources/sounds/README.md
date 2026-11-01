# Sounds

Two cues, played by the overlay window:

| File | Plays when |
| ---- | ---------- |
| `rest-start.ogg` | A rest begins (eye rest or long rest). |
| `rest-end.ogg` | A rest runs out by itself. Not after Skip or Postpone. |

To change a sound, replace the file and keep the name. Rules, checked by
`tests/main/sound-assets.test.ts`:

- Ogg Vorbis (`.ogg`). A renamed WAV or MP3 fails the test.
- Under 150 KB. Short and soft: about one second.
- Only files you may redistribute. CC0 (public domain) needs no credit. If a license needs
  credit, add it to the table below.

Convert with ffmpeg if needed: `ffmpeg -i in.wav -c:a libvorbis -q:a 2 rest-start.ogg`

## Credits

| File | Source | License |
| ---- | ------ | ------- |
| `rest-start.ogg` | Placeholder, synthesized for this project (two soft sine bells, E5 then A5) | Project license |
| `rest-end.ogg` | Placeholder, synthesized for this project (two soft sine bells, A5 then E5) | Project license |
