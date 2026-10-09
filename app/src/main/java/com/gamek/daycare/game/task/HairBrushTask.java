package com.gamek.daycare.game.task;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

/**
 * Step 10 — comb the messy hair.
 *
 * <p>{@code RUB_VERTICAL}: only up-and-down strokes count, which is the motion a brush actually
 * makes. The hair artwork rotates and settles as progress climbs, and swaps to the neat version
 * once it is past halfway.</p>
 */
public class HairBrushTask extends GestureTask {

    private static final float BRUSH_DISTANCE_DP = 340f;
    private boolean brushSoundPlayed;
    private int lastSoundBucket = -1;

    public HairBrushTask(TaskContext ctx) {
        super(TaskStep.HAIR_BRUSH, ctx, DragController.Gesture.RUB_VERTICAL,
                BRUSH_DISTANCE_DP, 0L, 1f);
    }

    @Override
    protected HitZone createZone() {
        return HitZone.ofView("zone_hair_brush", ctx.baby.getHair(), ctx.baby.sceneGroup())
                .padding(ctx.dp(14));
    }

    @Override
    protected float focusY() {
        // The bristles are at the top of the brush; the handle sits under the finger.
        return 0.82f;
    }

    @Override
    protected void onGestureStarted() {
        ctx.baby.react(BabyScene.Mood.GIGGLE);
    }

    @Override
    protected void onZoneEntered(boolean inside) {
        if (inside && !brushSoundPlayed) {
            brushSoundPlayed = true;
            ctx.sound.play(SoundPoolManager.Sfx.BRUSH);
        }
    }

    @Override
    protected void onGestureTick(float progress) {
        ctx.baby.setHairMess(1f - progress);

        // Re-trigger the brush swish roughly every quarter of the gesture.
        int bucket = (int) (progress * 4f);
        if (bucket != lastSoundBucket) {
            lastSoundBucket = bucket;
            ctx.sound.play(SoundPoolManager.Sfx.BRUSH, 0.5f, 0.9f + bucket * 0.06f);
        }
    }

    @Override
    protected void onGestureDone() {
        ctx.baby.setHairMess(0f);
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setHairMess(0f);
    }

    @Override
    protected void onDetach() {
        brushSoundPlayed = false;
        lastSoundBucket = -1;
        super.onDetach();
    }
}
