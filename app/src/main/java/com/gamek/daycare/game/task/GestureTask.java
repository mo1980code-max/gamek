package com.gamek.daycare.game.task;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.GameTask;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

/**
 * Base class for every "drag the tool onto the baby, then work it" step:
 * wipe the nose, rub in rash cream, sprinkle powder, towel the face, blow-dry and brush the hair.
 *
 * <p>It wires the tray tool as a {@link DragController.DropBehavior#SNAP_AND_STICK} draggable, so
 * the tool lands on the target and stays there while the player rubs or holds. Subclasses only
 * supply a target zone and three small hooks:</p>
 *
 * <ul>
 *   <li>{@link #createZone()} — where on the baby the tool belongs;</li>
 *   <li>{@link #onGestureTick(float)} — per-frame visuals (ring fill, particles, art fade);</li>
 *   <li>{@link #onGestureDone()} — the payoff (runny nose gone, cream absorbed, hair dry).</li>
 * </ul>
 */
public abstract class GestureTask extends GameTask implements DragController.Listener {

    private final DragController.Gesture gesture;
    private final float gestureTargetDp;
    private final long holdDuration;
    private final float snapScale;

    private HitZone zone;
    private boolean gestureStarted;
    private float lastReported = -1f;

    /**
     * @param gesture          rub axis, or HOLD for a duration-based step
     * @param gestureTargetDp  rub distance in dp that completes a RUB_* step (ignored for HOLD)
     * @param holdDuration     milliseconds inside the zone that complete a HOLD step
     * @param snapScale        scale of the tool once it has landed on the target
     */
    protected GestureTask(TaskStep step,
                          TaskContext ctx,
                          DragController.Gesture gesture,
                          float gestureTargetDp,
                          long holdDuration,
                          float snapScale) {
        super(step, ctx);
        this.gesture = gesture;
        this.gestureTargetDp = gestureTargetDp;
        this.holdDuration = holdDuration;
        this.snapScale = snapScale;
    }

    /** The target on the baby. Called once, from {@link #onAttach()}. */
    protected abstract HitZone createZone();

    /** Fired the first time the gesture starts accumulating. */
    protected void onGestureStarted() {
    }

    /** Fired whenever the tool enters or leaves the zone; {@code zone} may be {@code null}. */
    protected void onZoneEntered(boolean inside) {
    }

    /** Per-frame progress, 0..1. */
    protected abstract void onGestureTick(float progress);

    /** The gesture filled up — apply the visible result. */
    protected abstract void onGestureDone();

    /** Where the tool's working end sits, as a fraction of the tool view. */
    protected float focusX() {
        return 0.5f;
    }

    protected float focusY() {
        return 0.5f;
    }

    public final HitZone getZone() {
        return zone;
    }

    @Override
    protected void onAttach() {
        zone = createZone();
        DragController.Options options = new DragController.Options()
                .behavior(DragController.DropBehavior.SNAP_AND_STICK)
                .gesture(gesture)
                .gestureTargetPx(gestureTargetDp > 0f ? ctx.dp(gestureTargetDp) : -1f)
                .holdDuration(holdDuration)
                .snapScale(snapScale)
                .focus(focusX(), focusY())
                .magnet(0.26f)
                .listener(this);
        bindTool(TaskContext.zones(zone), options, null);
    }

    @Override
    protected void onDetach() {
        super.onDetach();
        gestureStarted = false;
        lastReported = -1f;
    }

    // ---------------------------------------------------------------- DragController.Listener

    @Override
    public void onPickupArmed(DragController.Draggable draggable, float rawX, float rawY) {
        // Generic pickup/enter/drop cues are played by the DragController's PickupSfx, so tasks only
        // add step-specific sound here.
    }

    @Override
    public void onDragStarted(DragController.Draggable draggable, android.view.View ghost) {
    }

    @Override
    public void onZoneChanged(DragController.Draggable draggable, HitZone hit) {
        onZoneEntered(hit != null);
    }

    @Override
    public void onGestureProgress(DragController.Draggable draggable, float progress) {
        if (!gestureStarted && progress > 0f) {
            gestureStarted = true;
            onGestureStarted();
        }
        onGestureTick(progress);
        // Throttle HUD updates: the ring redraws every frame anyway.
        if (Math.abs(progress - lastReported) > 0.01f || progress >= 1f) {
            lastReported = progress;
            reportProgress(progress);
        }
    }

    @Override
    public boolean onDropOnTarget(DragController.Draggable draggable, HitZone hit) {
        // For a gesture step this fires when the gesture has filled up.
        onGestureDone();
        ctx.sound.play(SoundPoolManager.Sfx.SPARKLE);
        ctx.callbacks.onBabyReaction(BabyScene.Mood.HAPPY);
        markComplete();
        return true;
    }

    @Override
    public void onDropMissed(DragController.Draggable draggable) {
        ctx.sound.play(SoundPoolManager.Sfx.WRONG, 0.5f, 1f);
    }

    @Override
    public void onSnapBackFinished(DragController.Draggable draggable) {
    }

    @Override
    public HitZone getHintZone() {
        return zone != null ? zone : super.getHintZone();
    }
}
