package com.gamek.daycare.game.task;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

/**
 * Step 8 — wipe the wet towel over the baby's face.
 *
 * <p>Free rubbing across the whole face; the food marks fade out as progress climbs. The towel is
 * held by its corner, so the focus point sits low and the wiping surface leads the drag.</p>
 */
public class WetTowelTask extends GestureTask {

    private static final float WIPE_DISTANCE_DP = 380f;

    private int lastSparkleBucket = -1;

    public WetTowelTask(TaskContext ctx) {
        super(TaskStep.WET_TOWEL, ctx, DragController.Gesture.RUB_FREE,
                WIPE_DISTANCE_DP, 0L, 0.95f);
    }

    @Override
    protected HitZone createZone() {
        // The dirt artwork itself, widened a little so a sloppy wipe still counts.
        return HitZone.ofFraction("zone_face", ctx.baby.sceneGroup(),
                0.33f, 0.22f, 0.67f, 0.39f).padding(ctx.dp(10));
    }

    @Override
    protected float focusY() {
        return 0.78f;
    }

    @Override
    protected void onGestureStarted() {
        ctx.sound.play(SoundPoolManager.Sfx.WIPE);
        ctx.baby.react(BabyScene.Mood.GIGGLE);
    }

    @Override
    protected void onGestureTick(float progress) {
        ctx.baby.setFaceDirt(1f - progress);
        int bucket = (int) (progress * 6f);
        if (bucket != lastSparkleBucket && bucket > 0) {
            lastSparkleBucket = bucket;
            ctx.fx.sparkle(0.5f, 0.30f);
        }
    }

    @Override
    protected void onGestureDone() {
        ctx.baby.setFaceDirt(0f);
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setFaceDirt(0f);
    }

    @Override
    protected void onDetach() {
        lastSparkleBucket = -1;
        super.onDetach();
    }
}
