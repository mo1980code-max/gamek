package com.gamek.daycare.game;

import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.task.DiaperToTrashTask;
import com.gamek.daycare.game.task.FreshDiaperTask;
import com.gamek.daycare.game.task.HairBrushTask;
import com.gamek.daycare.game.task.HairDryerTask;
import com.gamek.daycare.game.task.MedicineTask;
import com.gamek.daycare.game.task.NailClippingTask;
import com.gamek.daycare.game.task.PacifierTask;
import com.gamek.daycare.game.task.PowderTask;
import com.gamek.daycare.game.task.RashCreamTask;
import com.gamek.daycare.game.task.WetTowelTask;
import com.gamek.daycare.game.task.WipeNoseTask;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;
import com.gamek.daycare.view.HintController;
import com.gamek.daycare.view.ParticleEmitterView;
import com.gamek.daycare.view.TaskProgressHud;
import com.gamek.daycare.view.TrayController;

/**
 * Runs one round of the daycare game: the eleven sequential tray tasks, in order.
 *
 * <p>This is the only class that knows about sequencing. A concrete {@link GameTask} never decides
 * what comes next; it just solves itself and calls {@code markComplete()}. Everything in between —
 * sliding the tray out, celebrating, sliding the new tray in, arming the hint timer, updating the
 * HUD — happens here.</p>
 *
 * <h3>Step lifecycle</h3>
 * <pre>
 *   IDLE → TRAY_IN ─→ ACTIVE ──(task completes)──→ STEP_CLEARED → TRAY_OUT → next step
 *                      │   ↑                                        │
 *                      └──→ MINIGAME ──(result)────────────────────┘
 *                                                              last step → FINISHED (3 stars)
 * </pre>
 *
 * <p>Input is frozen ({@link DragController#setEnabled}) during every transition, so a tap that
 * lands mid-celebration cannot start the next step early or double-fire a drop.</p>
 */
public final class TaskManager implements HintController.Provider, TaskContext.Callbacks {

    /** What the manager cannot do itself: show the celebration and host mini-game fragments. */
    public interface Host {
        /** Three-star celebration. */
        void showCompletion(int stars);

        /** Adds the mini-game fragment for {@code miniGameId}. */
        void launchMiniGame(String miniGameId);

        /** True while a mini-game fragment is on screen. */
        boolean isMiniGameShowing();

        /**
         * Per-step progress, 0..1 — the fragment mirrors it on the thin HUD bar.
         * {@code step} is {@code null} for the final "round complete" tick.
         */
        void onStepProgress(TaskStep step, float progress);

        /** Hint copy for the current step, already resolved from resources. */
        void onHintTextChanged(CharSequence text);
    }

    /** Coarse state, mostly useful for debugging and for gating input. */
    public enum State {
        IDLE,
        TRAY_IN,
        ACTIVE,
        STEP_CLEARED,
        TRAY_OUT,
        MINIGAME,
        FINISHED
    }

    /** How long the "step cleared" celebration holds before the tray slides out. */
    private static final long CLEAR_CELEBRATION_MS = 780L;

    private final Host host;
    private final BabyScene baby;
    private final DragController drag;
    private final TrayController tray;
    private final ParticleEmitterView fx;
    private final SoundPoolManager sound;
    private final HintController hints;
    private final TaskProgressHud hud;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private final TaskFlow flow = new TaskFlow();
    private final TaskContext taskContext;

    private GameTask currentTask;
    private State state = State.IDLE;
    private boolean started;
    private boolean paused;
    private boolean destroyed;

    public TaskManager(Host host,
                       ViewGroup root,
                       ViewGroup dragLayer,
                       ViewGroup hintLayer,
                       BabyScene baby,
                       DragController drag,
                       TrayController tray,
                       ParticleEmitterView fx,
                       TaskProgressHud hud,
                       SoundPoolManager sound,
                       HintController hints) {
        this.host = host;
        this.baby = baby;
        this.drag = drag;
        this.tray = tray;
        this.fx = fx;
        this.hud = hud;
        this.sound = sound;
        this.hints = hints;
        this.taskContext = new TaskContext(root.getContext(), root, dragLayer, hintLayer,
                baby, drag, tray, fx, sound, this);

        drag.setGlobalListener(new DragController.SimpleListener() {
            @Override
            public void onPickupArmed(DragController.Draggable draggable, float rawX, float rawY) {
                // Grabbing the tool is itself an answer to the hint.
                if (hints != null) {
                    hints.onUserInteraction();
                }
            }
        });
    }

    // ---------------------------------------------------------------- lifecycle

    /** Resets the baby and starts step 1. */
    public void start() {
        if (destroyed) {
            return;
        }
        started = true;
        paused = false;
        flow.reset();
        baby.resetToInitialState();
        fx.clear();
        hud.setTotalSteps(flow.totalSteps());
        hud.reset();
        drag.setEnabled(true);
        state = State.IDLE;
        startCurrentStep();
    }

    /** "Play again" from the celebration: identical to {@link #start()}, minus the HUD rebuild. */
    public void restart() {
        if (destroyed) {
            return;
        }
        cancelPendingWork();
        if (currentTask != null) {
            currentTask.detach();
            currentTask = null;
        }
        drag.unregisterAll();   // also cancels any live drag and drops its ghost
        tray.hideImmediately();
        fx.clear();
        sound.stopDryerLoop();
        hintsHide();
        start();
    }

    /**
     * Called from {@code onPause}.
     *
     * <p>Only the hint poller is stopped. The sequencing callbacks are deliberately <em>not</em>
     * cancelled: {@code celebrateStepCleared} → {@code finishStep} → {@code advanceFlow} is a chain
     * of posted steps, so clearing the queue mid-celebration would strand the round with the tray
     * still on screen and no way to reach the next step. Those callbacks only touch views that
     * outlive the pause, and {@link #destroy()} tears the whole thing down if the window really
     * goes away.</p>
     */
    public void pause() {
        paused = true;
        if (hints != null) {
            hints.stop();
        }
    }

    /** Called from {@code onResume}. */
    public void resume() {
        if (destroyed || !started) {
            return;
        }
        paused = false;
        // Only re-arm the hint timer if the player is actually looking at a solvable step.
        if (hints != null && state == State.ACTIVE) {
            hints.start();
        }
    }

    public void destroy() {
        destroyed = true;
        paused = false;
        cancelPendingWork();
        if (hints != null) {
            hints.onDestroy();
        }
        if (currentTask != null) {
            currentTask.detach();
            currentTask = null;
        }
        drag.unregisterAll();
        tray.release();
        sound.stopDryerLoop();
    }

    private void cancelPendingWork() {
        handler.removeCallbacksAndMessages(null);
    }

    private void hintsHide() {
        if (hints != null) {
            hints.hide();
        }
    }

    // ---------------------------------------------------------------- sequencing

    private void startCurrentStep() {
        if (destroyed) {
            return;
        }
        final TaskStep step = flow.current();
        if (step == null) {
            finishRound();
            return;
        }

        currentTask = createTask(step);
        hud.setCompletedSteps(step.getNumber() - 1);
        host.onHintTextChanged(taskContext.context.getString(step.getHintStringRes()));

        if (hints != null) {
            hints.stop();
        }

        if (currentTask.usesTray()) {
            state = State.TRAY_IN;
            drag.setEnabled(false);
            tray.slideIn(step.getToolDrawableRes(), new TrayController.Callback() {
                @Override
                public void onFinished() {
                    onTrayReady();
                }
            });
        } else {
            // Mini-game step: the tray stays out of the way entirely.
            state = State.TRAY_OUT;
            drag.setEnabled(false);
            tray.slideOut(new TrayController.Callback() {
                @Override
                public void onFinished() {
                    onTrayReady();
                }
            });
        }
    }

    private void onTrayReady() {
        if (destroyed || currentTask == null) {
            return;
        }
        currentTask.attach();
        state = currentTask.usesTray() ? State.ACTIVE : State.MINIGAME;
        drag.setEnabled(currentTask.usesTray());
        // A tray slide started before onPause can land after it; resume() re-arms in that case.
        if (hints != null && !paused) {
            hints.start();
        }
    }

    private void celebrateStepCleared(final GameTask task) {
        state = State.STEP_CLEARED;
        drag.setEnabled(false);
        if (hints != null) {
            hints.hide();
        }

        sound.play(SoundPoolManager.Sfx.CELEBRATE);
        // react(HAPPY) lifts the head and hops the body as one move.
        baby.react(BabyScene.Mood.HAPPY);
        fx.burst(0.5f, 0.42f, 26, ParticleEmitterView.CONFETTI_COLORS,
                ParticleEmitterView.Shape.STAR, 120f, 360f, 9f, 1100f);
        hud.setCompletedSteps(task.getStep().getNumber());
        host.onStepProgress(task.getStep(), 1f);

        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                finishStep(task);
            }
        }, CLEAR_CELEBRATION_MS);
    }

    private void finishStep(GameTask task) {
        if (destroyed) {
            return;
        }
        // Commit the visible result (rash gone, hair dry…) before the props are torn down.
        task.applyOutcome();

        if (!task.usesTray()) {
            task.detach();
            currentTask = null;
            advanceFlow();
            return;
        }

        state = State.TRAY_OUT;
        final GameTask finishing = task;
        tray.slideOut(new TrayController.Callback() {
            @Override
            public void onFinished() {
                finishing.detach();
                if (currentTask == finishing) {
                    currentTask = null;
                }
                advanceFlow();
            }
        });
    }

    private void advanceFlow() {
        if (destroyed) {
            return;
        }
        TaskFlow.AdvanceResult result = flow.advance();
        if (result == TaskFlow.AdvanceResult.COMPLETED) {
            finishRound();
        } else {
            startCurrentStep();
        }
    }

    private void finishRound() {
        state = State.FINISHED;
        drag.setEnabled(false);
        drag.unregisterAll();
        tray.hideImmediately();
        sound.stopDryerLoop();
        if (hints != null) {
            hints.stop();
        }
        host.onStepProgress(null, 1f);
        // The celebration overlay brings its own confetti; three stars for a completed round.
        host.showCompletion(3);
    }

    /** Called by the Activity when a mini-game fragment reports its result. */
    public void onMiniGameFinished(String miniGameId, boolean success) {
        if (destroyed || currentTask == null) {
            return;
        }
        state = State.ACTIVE;
        currentTask.onMiniGameResult(success);
        if (!success && hints != null) {
            hints.start();
        }
    }

    // ---------------------------------------------------------------- state accessors

    public State getState() {
        return state;
    }

    public TaskStep getCurrentStep() {
        return flow.current();
    }

    // ---------------------------------------------------------------- task factory

    /**
     * The single place that maps a {@link TaskStep} onto its implementation. Adding a step means
     * adding one enum constant and one case here.
     */
    private GameTask createTask(TaskStep step) {
        switch (step) {
            case DIAPER_TO_TRASH: return new DiaperToTrashTask(taskContext);
            case FRESH_DIAPER:    return new FreshDiaperTask(taskContext);
            case WIPE_NOSE:       return new WipeNoseTask(taskContext);
            case RASH_CREAM:      return new RashCreamTask(taskContext);
            case BABY_POWDER:     return new PowderTask(taskContext);
            case NAIL_CLIPPING:   return new NailClippingTask(taskContext);
            case MEDICINE:        return new MedicineTask(taskContext);
            case WET_TOWEL:       return new WetTowelTask(taskContext);
            case HAIR_DRYER:      return new HairDryerTask(taskContext);
            case HAIR_BRUSH:      return new HairBrushTask(taskContext);
            case PACIFIER:        return new PacifierTask(taskContext);
            default:
                throw new IllegalStateException("No task implementation for " + step);
        }
    }

    // ---------------------------------------------------------------- TaskContext.Callbacks

    @Override
    public void onTaskCompleted(GameTask task) {
        if (destroyed || task != currentTask || state == State.STEP_CLEARED || state == State.FINISHED) {
            return;
        }
        celebrateStepCleared(task);
    }

    @Override
    public void onTaskProgress(GameTask task, float progress) {
        if (destroyed || task != currentTask) {
            return;
        }
        host.onStepProgress(task.getStep(), progress);
    }

    @Override
    public void onLaunchMiniGame(GameTask task, String miniGameId) {
        if (destroyed || task != currentTask || host.isMiniGameShowing()) {
            return;
        }
        state = State.MINIGAME;
        drag.setEnabled(false);
        if (hints != null) {
            hints.stop();
        }
        host.launchMiniGame(miniGameId);
    }

    @Override
    public boolean isMiniGameShowing() {
        return host.isMiniGameShowing();
    }

    @Override
    public void onBurstRequested(float xFraction, float yFraction) {
        if (fx != null) {
            fx.sparkle(xFraction, yFraction);
        }
    }

    @Override
    public void onBabyReaction(BabyScene.Mood mood) {
        if (baby == null) {
            return;
        }
        baby.react(mood);
        if (sound == null) {
            return;
        }
        switch (mood) {
            case HAPPY:
                sound.play(SoundPoolManager.Sfx.BABY_COO);
                break;
            case GIGGLE:
                sound.play(SoundPoolManager.Sfx.BABY_GIGGLE);
                break;
            case SAD:
                sound.play(SoundPoolManager.Sfx.BABY_CRY);
                break;
            case SURPRISED:
                sound.play(SoundPoolManager.Sfx.BABY_COO, 0.7f, 1.15f);
                break;
            case NEUTRAL:
            default:
                break;
        }
    }

    // ---------------------------------------------------------------- HintController.Provider

    @Override
    public boolean isHintAllowed() {
        return !destroyed && state == State.ACTIVE && currentTask != null && !host.isMiniGameShowing();
    }

    @Override
    public View getHintSource() {
        return currentTask != null ? currentTask.getHintSource() : null;
    }

    @Override
    public View getHintTargetView() {
        return currentTask != null ? currentTask.getHintTargetView() : null;
    }

    @Override
    public HitZone getHintZone() {
        if (currentTask == null) {
            return null;
        }
        // Gesture and snap tasks both expose their live zone, which is always the right thing to
        // point at — including mid-step, e.g. the second diaper sticker.
        HitZone zone = currentTask.getHintZone();
        if (zone != null) {
            return zone;
        }
        return null;
    }

    @Override
    public GameTask.HintMode getHintMode() {
        return currentTask != null ? currentTask.getHintMode() : GameTask.HintMode.DRAG;
    }
}
