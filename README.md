# Baby Daycare — 2D Native Android Game (Java)

A portrait, fullscreen, single-Activity toddler care game in the style of *Baby Jini Daycare*:
a hand slides in from the bottom-right holding a tool, the player drags it onto the baby, and
**eleven sequential tasks** play out one after another until a three-star celebration.

Written in **plain Java** for Android Studio, with **no third-party libraries** beyond AndroidX —
particles, progress rings, hint animations and sound are all implemented in-repo, so the project
builds and runs from a clean clone.

---

## Quick start

```bash
# 1. Open the project in Android Studio (Giraffe or newer) and let it sync, or from the CLI:
gradle wrapper --gradle-version 8.7     # generates gradlew + the wrapper jar (not committed)
./gradlew :app:assembleDebug
./gradlew :app:test                     # runs the JVM unit tests for the task state machine

# 2. Install on a device / emulator (API 21+) and play.
```

> The `gradle/wrapper/gradle-wrapper.jar` is **not** committed (binary). Android Studio regenerates
> it on first sync; from the CLI run the `gradle wrapper` task once as shown above.
>
> The release build is signed with the **debug** key so `assembleRelease` works out of the box.
> Swap in your own `signingConfig` before shipping.

**Config:** `compileSdk 34` · `minSdk 21` · `targetSdk 34` · Java 17 · AGP 8.5.2 / Gradle 8.7.

---

## Architecture

```
DayCareGameActivity                 single Activity: portrait, immersive fullscreen, fragment host
└── DayCareGameFragment             all the wiring; implements TaskManager.Host + MiniGame.Host
    ├── BabyScene                   the baby + room, and every piece of state the steps mutate
    ├── ParticleEmitterView         confetti / powder / warm air / sparkles (Choreographer-driven)
    ├── TaskProgressHud             11 dots + "Step 4 of 11"
    ├── TrayController              the sliding hand that holds the current tool
    ├── drag_layer                  the lifted tool "ghost" floats here, above everything
    ├── hint_layer                  the idle pointing hand + pulsing target ring
    ├── mini_game_container         NailClipGameFragment is added here with getChildFragmentManager()
    └── CompletionOverlay           three-star celebration with its own confetti
```

### Who owns what

| Class | Responsibility |
| --- | --- |
| `DayCareGameActivity` | Orientation, immersive mode, keep-screen-on, fragment host. Nothing else. |
| `DayCareGameFragment` | Builds the controllers, implements the two `Host` interfaces. No game rules. |
| **`TaskManager`** | **The only class that knows about sequencing.** Tray slides, celebrations, HUD, hint gating, mini-game hand-off. |
| `TaskFlow` / `TaskStep` | Pure-JVM state machine + the ordered enum of the eleven steps. Unit-tested. |
| `GameTask` | Base class for one step: `onAttach()` → `markComplete()` → `onApplyOutcome()` → `onDetach()`. |
| `GestureTask` | Reusable base for "drag on, then rub/hold" steps (6 of the 11). |
| `SnapSequenceTask` | Reusable base for "drag onto this exact spot" steps, single or multi-part (4 of the 11). |
| **`DragController`** | The one `OnTouchListener` for the whole screen: pickup, ghost, hit testing, magnet, snap, **snap-back**, sticky gestures. |
| **`DragDropHelper`** | Coordinate-space maths + `Rect.intersects` hit testing with center-weighted scoring. |
| `HitZone` | A target rect — bound to a View, fixed px, or a fraction of the scene. Pad-able, enable-able. |
| `HintController` | The 4-second idle hand: flies tool → target, bounces, pulses a ring, repeats. |
| `SoundPoolManager` | 20 cues on one `SoundPool`, async-load safe, mute + pause/resume/release. |
| `CompletionOverlay` | Three-star celebration: panel overshoot, staggered star pops, confetti. |
| `ParticleEmitterView` | Pooled particles, four shapes, bursts / streams / rain. Zero cost when idle. |

### Step lifecycle

```
IDLE → TRAY_IN ──→ ACTIVE ──(task calls markComplete)──→ STEP_CLEARED → TRAY_OUT → next step
                     │  ↑                                                            │
                     └──→ MINIGAME ──(result)───────────────────────────────────────┘
                                                        last step → FINISHED (3 stars + confetti)
```

Input is frozen (`DragController.setEnabled(false)`) during **every** transition, so a tap landing
mid-celebration cannot start the next step early or double-fire a drop.

---

## The eleven tasks

| # | `TaskStep` | Implementation | Interaction |
| --- | --- | --- | --- |
| 1 | `DIAPER_TO_TRASH` | `DiaperToTrashTask` | Drag → snap into the bin. The lid lifts as the diaper approaches and slams shut on a miss. |
| 2 | `FRESH_DIAPER` | `FreshDiaperTask` | **Three** snaps in one step: diaper, left sticker, right sticker. The tray swaps artwork between them. |
| 3 | `WIPE_NOSE` | `WipeNoseTask` | Drag + `RUB_HORIZONTAL` — only direction reversals count, so one long swipe won't do it. |
| 4 | `RASH_CREAM` | `RashCreamTask` | Drag + `RUB_FREE` over the rash area; the three spots fade out in sequence. |
| 5 | `BABY_POWDER` | `PowderTask` | Drag + `HOLD` (1.7 s). Real powder particles fall; progress bleeds off if you drift away. |
| 6 | `NAIL_CLIPPING` | `NailClippingTask` | Hands the screen to `NailClipGameFragment` (tap five nails). No tray. |
| 7 | `MEDICINE` | `MedicineTask` | Drag → snap to the mouth, then three gulps before the step counts as done. |
| 8 | `WET_TOWEL` | `WetTowelTask` | Drag + `RUB_FREE` over the face; food smudges fade out. |
| 9 | `HAIR_DRYER` | `HairDryerTask` | Drag + `HOLD` (2.2 s) with a **`CircularProgressBar` ring**, looping dryer SFX and warm-air particles. |
| 10 | `HAIR_BRUSH` | `HairBrushTask` | Drag + `RUB_VERTICAL`; the hair straightens and swaps to the neat artwork past 50 %. |
| 11 | `PACIFIER` | `PacifierTask` | Drag → snap to the mouth, pacifier pops in, then the celebration. |

---

## Drag & drop, in detail

`DragController` is installed as the **root view's** `OnTouchListener`:

```java
root.setOnTouchListener(dragController);   // root must be android:clickable="true"
```

That `clickable="true"` is load-bearing: Android only keeps delivering `MOVE`/`UP` to a listener if
the view's `onTouchEvent` consumed the `DOWN`. Buttons still work, because a child that handles
`DOWN` consumes the gesture before it ever bubbles up to the root.

**Pickup → drag → drop**

1. `registerDraggable(id, toolView, zones, options)` declares what may be dragged and where it may go.
2. `ACTION_DOWN` inside the tool (plus touch-slop tolerance) arms a pickup; passing the system touch
   slop starts the drag: a **ghost** `ImageView` is created in `drag_layer`, the tray tool is hidden,
   a pop SFX plays, and the tool lifts to `1.12×` with a velocity-derived tilt.
3. `ACTION_MOVE` repositions the ghost inside an `OnPreDrawListener`, so motion is frame-synced and
   never tears. A **magnet** pulls it gently (`22 %` of the remaining distance) toward the zone
   center — enough to feel assisted, not enough to feel automated.
4. Hit testing runs `DragDropHelper.bestHit(ghostRect, zones)`, which uses `Rect.intersects` and
   scores a zone whose **center** the tool covers above one that merely overlaps, breaking ties by
   overlap area. Both rects are mapped into their nearest common ancestor first, so nesting,
   translation and scale are all handled.
5. `ACTION_UP` resolves via the step's `DropBehavior`:
   - `SNAP_AND_RELEASE` — animate onto the target (`OvershootInterpolator`) and finish, **or**
     `animateSnapBack()` along a shallow arc into the tray hand when nothing was hit;
   - `SNAP_AND_STICK` — land on the target and keep the session alive in *sticky standby*, so the
     player can rub/wipe/hold across several swipes. Lifting the finger never aborts the step.

**Snap-back** is also the safety valve: a sticky gesture that goes nowhere for 20 s hands the tool
back rather than soft-locking the round.

---

## Idle hint system

`HintController` polls every 350 ms and asks `DragController.isIdleFor(4000)`. After **4 seconds** of
inactivity it:

- resolves the target from the running task (`getHintTargetView()`, else `getHintZone()`),
- flies a pointing hand from the tray tool to the target (`OvershootInterpolator`),
- **bounces** it three times and pulses a white ring on the target,
- fades out and repeats after 1.6 s for as long as the player stays idle.

Tap-only steps (diaper stickers, nails) use `HintMode.TAP` and bounce in place instead of travelling.
Any touch anywhere hides it immediately — the drag controller reports every `ACTION_DOWN`.

---

## Sound

`SoundPoolManager` wraps one `SoundPool` (6 streams) with a typed `Sfx` enum:

```java
sound.play(Sfx.POP);                     // default volume for that cue
sound.play(Sfx.WRONG, 0.45f, 1f);        // explicit volume + playback rate
sound.startDryerLoop();                  // looping stream, tracked so it can be stopped
sound.setMuted(true); sound.pause(); sound.resume(); sound.release();
```

Streams load asynchronously and playing before a load finishes is a silent no-op rather than a crash.
Generic drag feedback (pickup, zone-enter tick, snap) is played **once**, by the controller's
`PickupSfx` hook — tasks only add step-specific cues, so nothing double-fires.

**The 20 files in `app/src/main/res/raw/` are procedurally generated placeholders** (synthesized
tones/noise, ~320 KB total) so the game has working audio from a clean clone. Replace them with real
recordings, keeping the filenames, and nothing in the code has to change.

---

## Art

Every image is an **Android vector drawable** in `app/src/main/res/drawable/`, generated from simple
primitives (circles, rounded rects, polygons) as clean placeholder art in the pastel style of the
genre. That means:

- no PNG/WebP binaries in the repo,
- crisp at any density and on any screen size,
- drop-in replacement — see **[docs/ASSETS.md](docs/ASSETS.md)** for the full list of 60 drawables
  with their intended size, palette and which step uses each.

To use real artwork, replace a file with a PNG/WebP of the **same name** in `drawable-xxhdpi` (and
delete the XML) — no Java or layout change is required.

The baby is positioned entirely with **fractional constraints** (`layout_constraintWidth_percent` +
computed bias), and every `HitZone` is built from those same views via `HitZone.ofView(...)`. Art and
hitboxes therefore cannot drift apart, and the scene scales from a 5″ phone to a 10″ tablet unchanged.

---

## Adding or re-ordering a step

1. Add a constant to `TaskStep` (order in the enum **is** the play order) with its hint string and
   tray artwork.
2. Add one `case` to `TaskManager.createTask(...)`.
3. Extend `GestureTask` (rub/hold) or `SnapSequenceTask` (place), or `GameTask` for anything custom.

Nothing else changes — the HUD dot count, hint text, tray artwork and progress all follow the enum.

## Adding a mini-game

1. Subclass `MiniGameFragment`, give it an `ID_*` and call `finishWithResult(success)`.
2. Add a `case` to `DayCareGameFragment.createMiniGame(...)`.
3. In your task, set `usesTray() == false` and call `ctx.callbacks.onLaunchMiniGame(this, ID)`.

Results come back through `GameTask.onMiniGameResult(boolean)`. A popup dismissed with the back
button reports failure (from `onDestroyView`), so the task re-offers it instead of soft-locking.

---

## Testing

`./gradlew :app:test` runs `TaskFlowTest` — 10 JVM tests covering step order, advance/complete
semantics, progress, reset, custom step lists and the empty-list guard. `TaskFlow` and `TaskStep`
have no `android.*` imports by design, which is what makes them testable without Robolectric.

The view and input layers are covered by their own seams rather than tests: `DragDropHelper` is pure
geometry (`rectIn`, `overlapArea`, `bestHit`) and `HitZone` is pure maths, so both are easy to add JVM
tests for if you want them.

---

## Known limitations / next steps

- **Placeholder art and audio.** Structurally complete, visually simple — see `docs/ASSETS.md`.
- **No persistence.** Best score, stars earned and settings are not saved across launches.
- **One round.** `TaskStep` is the whole level; a level-select build would add a `Round` wrapper
  around `TaskFlow` and vary the step list per level.
- **No accessibility pass.** The game is aimed at pre-readers, so there are content descriptions but
  no TalkBack flow, no colour-blind-safe palette and no reduced-motion option.
- **`onBackPressed` is not overridden.** androidx.fragment pops the mini-game back stack for us and
  back otherwise exits, which is the intended behaviour — worth revisiting if you add a pause menu.
