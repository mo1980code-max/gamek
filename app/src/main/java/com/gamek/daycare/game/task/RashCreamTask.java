package com.gamek.daycare.game.task;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

/**
 * Step 4 — rub rash cream into the red spots.
 *
 * <p>The target is the whole rash area rather than the three individual spots, and the gesture is
 * {@code RUB_FREE}: any back-and-forth motion counts, in any direction, which is what "rub it in"
 * feels like. The spots fade out one after another as progress climbs.</p>
 */
public class RashCreamTask extends GestureTask {

    private static final float RUB_DISTANCE_DP = 340f;

    /** Rash area as a fraction of the scene, generously larger than the spots themselves. */
    private static final float ZONE_LEFT = 0.32f;
    private static final float ZONE_TOP = 0.42f;
    private static final float ZONE_RIGHT = 0.70f;
    private static final float ZONE_BOTTOM = 0.61f;

    private int lastSparkleBucket = -1;

    public RashCreamTask(TaskContext ctx) {
        super(TaskStep.RASH_CREAM, ctx, DragController.Gesture.RUB_FREE,
                RUB_DISTANCE_DP, 0L, 0.9f);
    }

    @Override
    protected HitZone createZone() {
        return HitZone.ofFraction("zone_rash", ctx.baby.sceneGroup(),
                ZONE_LEFT, ZONE_TOP, ZONE_RIGHT, ZONE_BOTTOM);
    }

    @Override
    protected float focusY() {
        // The cream comes out of the tube's nozzle, at its top.
        return 0.18f;
    }

    @Override
    protected void onGestureStarted() {
        ctx.sound.play(SoundPoolManager.Sfx.WIPE, 0.5f, 0.85f);
        ctx.baby.react(BabyScene.Mood.SURPRISED);
    }

    @Override
    protected void onGestureTick(float progress) {
        ctx.baby.setRashAmount(1f - progress);

        // Throttled sparkles: one bucket per eighth of the gesture, so it twinkles without flooding
        // the particle pool.
        int bucket = (int) (progress * 8f);
        if (bucket != lastSparkleBucket && bucket > 0) {
            lastSparkleBucket = bucket;
            ctx.fx.sparkle(ZONE_LEFT + (ZONE_RIGHT - ZONE_LEFT) * (0.25f + 0.5f * (float) Math.random()),
                    ZONE_TOP + (ZONE_BOTTOM - ZONE_TOP) * 0.5f);
        }
    }

    @Override
    protected void onGestureDone() {
        ctx.baby.setRashAmount(0f);
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setRashAmount(0f);
    }

    @Override
    protected void onDetach() {
        lastSparkleBucket = -1;
        super.onDetach();
    }
}
