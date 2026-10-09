# Drawable requirements

Every image in the game is an Android **vector / shape drawable** in `app/src/main/res/drawable/`.
There are no PNG or WebP binaries in the repository: the committed art is procedurally
generated placeholder work (circles, rounded rects and polygons in the genre's pastel palette),
so a clean clone builds, runs and looks like a coherent game.

**To ship real art**, drop a PNG/WebP of the *same file name* into `drawable-xxhdpi` (and delete
the XML of the same name). No Java and no layout changes are needed — the code only ever
references these names.

Total: **60 drawables**.

| Drawable | Type | Viewport / shape | Detail | Used by |
| --- | --- | --- | --- | --- |
| `baby_body` | vector | 96×96 | 8 paths | baby scene |
| `baby_eyes_closed` | vector | 96×96 | 3 paths | baby scene · blink loop |
| `baby_foot` | vector | 96×96 | 13 paths | mini-game · step 6 |
| `baby_hand_nails_long` | vector | 96×96 | 14 paths | baby scene · before step 6 |
| `baby_hand_nails_short` | vector | 96×96 | 14 paths | baby scene · after step 6 |
| `baby_head` | vector | 96×96 | 7 paths | baby scene |
| `baby_tears` | vector | 96×96 | 6 paths | baby scene · sad |
| `banner_level_complete` | vector | 300×104 | 7 paths | completion overlay |
| `bg_button_blue` | selector | 9-patch style | pressed + default | completion (Home) |
| `bg_button_green` | selector | 9-patch style | pressed + default | mini-game (Done) |
| `bg_button_pink` | selector | 9-patch style | pressed + default | completion (Play again) |
| `bg_circle_button` | selector | 9-patch style | pressed + default | HUD sound/restart buttons |
| `bg_hint_bubble` | shape | rectangle | solid/gradient | HUD instruction bubble |
| `bg_panel` | vector | 300×400 | 7 paths | completion + mini-game card |
| `bg_playmat` | vector | 100×100 | 7 paths | baby scene |
| `bg_room` | shape | rectangle | solid/gradient | Activity window + fragment background |
| `diaper_clean_on` | vector | 96×96 | 9 paths | baby scene · step 2 |
| `diaper_dirty` | vector | 96×96 | 7 paths | baby scene · step 1 |
| `diaper_sticker` | vector | 96×96 | 5 paths | baby scene + tray · step 2 |
| `face_dirt` | vector | 96×96 | 5 paths | baby scene · step 8 |
| `face_happy` | vector | 96×96 | 5 paths | baby scene · reaction |
| `face_neutral` | vector | 96×96 | 9 paths | baby scene · default |
| `face_sad` | vector | 96×96 | 10 paths | baby scene · reaction |
| `face_surprised` | vector | 96×96 | 9 paths | baby scene · reaction |
| `hair_messy` | vector | 96×96 | 4 paths | baby scene · step 10 |
| `hair_neat` | vector | 96×96 | 4 paths | baby scene · step 10 |
| `hair_wet_overlay` | vector | 96×96 | 4 paths | baby scene · step 9 |
| `hint_hand` | vector | 96×96 | 9 paths | HintController |
| `hint_ring` | shape | oval | solid/gradient | HintController |
| `hud_dot_empty` | shape | oval | solid/gradient | TaskProgressHud + mini-game |
| `hud_dot_filled` | vector | 24×24 | 3 paths | TaskProgressHud + mini-game |
| `ic_close` | vector | 24×24 | 3 paths | mini-game |
| `ic_launcher_foreground` | vector | 108×108 | 12 paths | adaptive launcher icon |
| `ic_restart` | vector | 24×24 | 2 paths | HUD |
| `ic_sound_off` | vector | 24×24 | 2 paths | HUD |
| `ic_sound_on` | vector | 24×24 | 3 paths | HUD |
| `mouth_closed` | vector | 96×96 | 2 paths | baby scene · steps 7, 11 |
| `mouth_open` | vector | 96×96 | 4 paths | baby scene · step 7 |
| `nail_long` | vector | 96×96 | 5 paths | mini-game · step 6 |
| `nail_short` | vector | 96×96 | 3 paths | mini-game · step 6 |
| `nose_runny` | vector | 96×96 | 7 paths | baby scene · step 3 |
| `powder_cloud` | vector | 96×96 | 7 paths | baby scene · step 5 |
| `progress_step` | layer-list | stretch | 2 items | fragment HUD bar |
| `rash_spot` | vector | 96×96 | 6 paths | baby scene · step 4 |
| `star_empty` | vector | 96×96 | 2 paths | completion overlay |
| `star_filled` | vector | 96×96 | 3 paths | completion overlay |
| `tool_diaper_clean` | vector | 96×96 | 8 paths | Task 2 · tray |
| `tool_diaper_dirty` | vector | 96×96 | 8 paths | Task 1 · tray + step 1 art |
| `tool_hair_brush` | vector | 96×96 | 8 paths | Task 10 · tray |
| `tool_hair_dryer` | vector | 96×96 | 9 paths | Task 9 · tray |
| `tool_medicine_spoon` | vector | 96×96 | 7 paths | Task 7 · tray |
| `tool_nail_clipper` | vector | 96×96 | 8 paths | Task 6 · tray + mini-game clippers |
| `tool_pacifier` | vector | 96×96 | 8 paths | Task 11 · tray + baby pacifier |
| `tool_powder` | vector | 96×96 | 11 paths | Task 5 · tray |
| `tool_rash_cream` | vector | 96×96 | 10 paths | Task 4 · tray |
| `tool_tissue` | vector | 96×96 | 6 paths | Task 3 · tray |
| `tool_towel` | vector | 96×96 | 8 paths | Task 8 · tray |
| `trash_bin` | vector | 96×96 | 5 paths | baby scene · step 1 target |
| `trash_bin_lid` | vector | 96×96 | 5 paths | baby scene · step 1 feedback |
| `tray_hand` | vector | 96×100 | 15 paths | TrayController |

## Conventions the replacement art should keep

- **Tools** are drawn on a 96×96 viewport with the working end where the task says it is:
  the cream nozzle and the powder cap are at the *top*, the tissue and brush are held from the
  *bottom*, the dryer nozzle is on the *left*. Those points are the `focus(x, y)` values in each
  task, and they decide where the finger grabs the tool and where it lands on the target.
- **Baby parts** are drawn on a 96×96 viewport and placed by `view_baby_scene.xml` with fractional
  constraints. Keep the subject centred and filling the canvas so the `HitZone`s line up.
- **Faces** (`face_neutral`, `face_happy`, `face_sad`, `face_surprised`) contain eyes, brows and
  blush **only** — the mouth is a separate overlay (`mouth_closed` / `mouth_open`) so it can open
  independently while being fed.
- **Icons** are 24×24; **buttons and panels** are shape/selector drawables with a 26 dp corner
  radius and a darker 3 dp stroke, which is the pressed-state language used across the UI.
- `hint_hand` should point up-and-to-the-left: `HintController` offsets it so the fingertip lands
  on the target.

## Sound

`app/src/main/res/raw/` holds 20 short `.wav` cues (~320 KB), also generated as placeholders
(synthesized tones and filtered noise). Replace them with real recordings, keeping the file names:

```
  sfx_baby_coo.wav  sfx_baby_cry.wav  sfx_baby_giggle.wav  sfx_brush.wav
  sfx_celebrate.wav  sfx_dryer.wav  sfx_level_complete.wav  sfx_pickup.wav
  sfx_pop.wav  sfx_powder.wav  sfx_sip.wav  sfx_snap.wav
  sfx_snip.wav  sfx_sparkle.wav  sfx_star.wav  sfx_sticker.wav
  sfx_trash.wav  sfx_whoosh.wav  sfx_wipe.wav  sfx_wrong.wav
```

They are enumerated once, in `SoundPoolManager.Sfx`, with a per-cue default volume.
