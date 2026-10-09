package com.gamek.daycare.game.task;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;

/**
 * Step 3 — drag the tissue to the nose and wipe side to side.
 *
 * <p>A {@code RUB_HORIZONTAL} gesture, so only direction changes count: one long swipe across the
 * face does not solve it, the player really has to wipe back and forth. The drip shrinks with the
 * progress value, giving continuous feedback instead of a single on/off switch.</p>
 */
public class WipeNoseTask extends GestureTask {

    /** Total back-and-forth distance, in dp, that clears the nose. */
    private static final float WIPE_DISTANCE_DP = 240f;
    private boolean wipeSoundPlayed;

    public WipeNoseTask(TaskContext ctx) {
        super(TaskStep.WIPE_NOSE, ctx, DragController.Gesture.RUB_HORIZONTAL,
                WIPE_DISTANCE_DP, 0L, 1f);
    }

    @Override
    protected HitZone createZone() {
        return HitZone.ofView("zone_nose", ctx.baby.getNose(), ctx.baby.sceneGroup())
                .padding(ctx.dp(16));
    }

    @Override
    protected float focusY() {
        // The tissue is held by its bottom corner, so the wiping edge is up top.
        return 0.72f;
    }

    @Override
    protected void onGestureStarted() {
        ctx.baby.react(com.gamek.daycare.view.BabyScene.Mood.SURPRISED);
    }

    @Override
    protected void onZoneEntered(boolean inside) {
        if (inside && !wipeSoundPlayed) {
            wipeSoundPlayed = true;
            ctx.sound.play(SoundPoolManager.Sfx.WIPE);
        }
    }

    @Override
    protected void onGestureTick(float progress) {
        ctx.baby.setRunnyNoseAmount(1f - progress);
        if (progress > 0.15f && progress < 0.95f && (int) (progress * 12f) % 4 == 0) {
            ctx.fx.sparkle(0.5f, 0.30f);
        }
    }

    @Override
    protected void onGestureDone() {
        ctx.baby.setRunnyNose(false);
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setRunnyNose(false);
    }

    @Override
    protected void onDetach() {
        wipeSoundPlayed = false;
        super.onDetach();
    }
}
