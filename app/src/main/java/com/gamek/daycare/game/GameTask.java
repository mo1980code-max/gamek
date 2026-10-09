package com.gamek.daycare.game;

import android.os.Handler;
import android.os.Looper;
import android.view.View;

import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;

import java.util.List;

/**
 * Base class for one step of the daycare round.
 *
 * <p>A task owns exactly three moments:</p>
 * <ul>
 *   <li>{@link #onAttach()} — build zones, register the tray tool as draggable, wire taps, show
 *       any step-specific props;</li>
 *   <li>{@link #markComplete()} — call it once when the step is solved; the base class guards
 *       against double-firing and forwards to {@link TaskContext.Callbacks};</li>
 *   <li>{@link #onDetach()} — remove props, unregister draggables, cancel animators.</li>
 * </ul>
 *
 * <p>Everything else (tray slide-in/out, hint scheduling, SFX, HUD, celebration) is handled by
 * {@link TaskManager}, so a concrete task is usually 30–60 lines.</p>
 */
public abstract class GameTask {

    /** Unique id used to register the tool with the {@link DragController}. */
    public static final String TOOL_ID = "tray_tool";

    protected final TaskStep step;
    protected final TaskContext ctx;

    private final Handler handler = new Handler(Looper.getMainLooper());

    private boolean complete;
    private boolean attached;
    private boolean detached;
    private boolean outcomeApplied;

    protected GameTask(TaskStep step, TaskContext ctx) {
        this.step = step;
        this.ctx = ctx;
    }

    public final TaskStep getStep() {
        return step;
    }

    public final boolean isComplete() {
        return complete;
    }

    /** Called by {@link TaskManager} after the tray has slid in and the tool art is set. */
    public final void attach() {
        if (attached || detached) {
            return;
        }
        attached = true;
        onAttach();
    }

    /**
     * Applies the step's lasting effect on the baby (cream gone, hair dry, diaper on…). Called
     * exactly once per completed step, right before the flow advances — including for steps that
     * are solved by a mini-game rather than by a drag.
     */
    public final void applyOutcome() {
        if (outcomeApplied) {
            return;
        }
        outcomeApplied = true;
        onApplyOutcome();
    }

    /** Called by {@link TaskManager} before the next tray slides in, and on teardown. */
    public final void detach() {
        if (detached) {
            return;
        }
        detached = true;
        ctx.drag.unregisterAll();
        onDetach();
    }

    /** Build the step: zones, draggables, tap listeners, props. */
    protected abstract void onAttach();

    /** Commit this step's permanent change to the baby scene. */
    protected void onApplyOutcome() {
    }

    /** Remove anything this task added. The drag controller is already cleared for you. */
    protected void onDetach() {
        clearCallbacks();
    }

    // ---------------------------------------------------------------- scheduling

    /**
     * Posts work on the main thread, scoped to this task: everything pending is cancelled by
     * {@link #detach()}, so a step can never fire callbacks after the manager has moved on.
     */
    protected final void postDelayed(Runnable runnable, long delayMillis) {
        handler.postDelayed(runnable, delayMillis);
    }

    protected final void clearCallbacks() {
        handler.removeCallbacksAndMessages(null);
    }

    // ---------------------------------------------------------------- completion

    /** Solves the step. Safe to call more than once; only the first call is forwarded. */
    protected final void markComplete() {
        if (complete || detached) {
            return;
        }
        complete = true;
        ctx.callbacks.onTaskCompleted(this);
    }

    /** Reports in-step progress (0..1) to the HUD. Never call after {@link #markComplete()}. */
    protected final void reportProgress(float value) {
        if (complete || detached) {
            return;
        }
        float clamped = value < 0f ? 0f : (value > 1f ? 1f : value);
        ctx.callbacks.onTaskProgress(this, clamped);
    }

    /**
     * Whether this step needs the tray hand. Mini-game steps return {@code false} so the manager
     * skips the slide-in/slide-out and hands the screen straight to the popup.
     */
    public boolean usesTray() {
        return true;
    }

    /**
     * Delivered by {@link TaskManager} when a mini-game this task launched has closed.
     * The default implementation simply completes the step on success.
     */
    public void onMiniGameResult(boolean success) {
        if (success) {
            markComplete();
        }
    }

    // ---------------------------------------------------------------- drag helpers

    /**
     * Registers the tray tool as draggable against {@code zones}.
     *
     * @param listener receives the drop decision; return {@code true} from
     *                 {@link DragController.Listener#onDropOnTarget} to accept the drop. Pass
     *                 {@code null} to keep whatever listener {@code options} already carries.
     */
    protected DragController.Draggable bindTool(List<HitZone> zones,
                                                DragController.Options options,
                                                DragController.Listener listener) {
        View tool = ctx.toolView();
        if (tool == null) {
            return null;
        }
        DragController.Options opts = options != null ? options : new DragController.Options();
        if (listener != null) {
            // Only override when one was passed explicitly: tasks normally set their own listener on
            // the Options builder, and a null here must not wipe it out.
            opts.listener(listener);
        }
        return ctx.drag.registerDraggable(TOOL_ID, tool, zones, opts);
    }

    /** Single-zone shorthand for the common "drag this tool onto that spot" step. */
    protected DragController.Draggable bindTool(HitZone zone,
                                                DragController.Options options,
                                                DragController.Listener listener) {
        return bindTool(TaskContext.zones(zone), options, listener);
    }

    // ---------------------------------------------------------------- hints

    /**
     * View the hint hand should fly <em>from</em>. Defaults to the tray tool, which is right for
     * every drag step; tap-only steps override it to point at the thing being tapped.
     */
    public View getHintSource() {
        return ctx.toolView();
    }

    /** View the hint hand should fly <em>to</em>. May be {@code null} if {@link #getHintZone()} is set. */
    public View getHintTargetView() {
        return null;
    }

    /** Fallback hint target when there is no view to point at. */
    public HitZone getHintZone() {
        List<HitZone> zones = ctx.drag.getActiveZones();
        if (zones == null) {
            return null;
        }
        for (int i = 0; i < zones.size(); i++) {
            HitZone zone = zones.get(i);
            if (zone != null && zone.isEnabled()) {
                return zone;
            }
        }
        return null;
    }

    /**
     * How the hint hand should behave. Drag steps animate source → target; tap steps just bounce in
     * place over the target.
     */
    public HintMode getHintMode() {
        return HintMode.DRAG;
    }

    public enum HintMode {
        /** Hand travels from the tool to the target and back. */
        DRAG,
        /** Hand bounces in place over the target ("tap here"). */
        TAP
    }
}
