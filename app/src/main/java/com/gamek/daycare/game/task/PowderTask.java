package com.gamek.daycare.game.task;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;

/**
 * Step 5 — hold the powder bottle over the baby and let it sprinkle.
 *
 * <p>A {@code HOLD} gesture: the drag controller fills the value while the bottle stays inside the
 * zone and bleeds it back down when it drifts out, so the player has to actually keep it there.
 * Real powder particles fall from the nozzle for as long as it is held.</p>
 */
public class PowderTask extends GestureTask {

    private static final long HOLD_MS = 1_700L;

    /** Diaper / belly area, as a fraction of the scene. */
    private static final float ZONE_LEFT = 0.31f;
    private static final float ZONE_TOP = 0.56f;
    private static final float ZONE_RIGHT = 0.69f;
    private static final float ZONE_BOTTOM = 0.79f;

    /** Emit on every other frame — plenty dense, half the particle churn. */
    private int frameToggle;

    public PowderTask(TaskContext ctx) {
        super(TaskStep.BABY_POWDER, ctx, DragController.Gesture.HOLD, 0f, HOLD_MS, 1f);
    }

    @Override
    protected HitZone createZone() {
        return HitZone.ofFraction("zone_powder", ctx.baby.sceneGroup(),
                ZONE_LEFT, ZONE_TOP, ZONE_RIGHT, ZONE_BOTTOM);
    }

    @Override
    protected float focusY() {
        // Powder pours from the bottle's cap.
        return 0.12f;
    }

    @Override
    protected void onGestureStarted() {
        ctx.sound.play(SoundPoolManager.Sfx.POWDER);
    }

    @Override
    protected void onZoneEntered(boolean inside) {
        if (!inside) {
            // Drifting off target: cut the pour so the particles do not keep falling in mid-air.
            ctx.sound.play(SoundPoolManager.Sfx.WRONG, 0.22f, 1.4f);
        }
    }

    @Override
    protected void onGestureTick(float progress) {
        ctx.baby.setPowderAmount(progress);
        frameToggle++;
        if ((frameToggle & 1) == 0) {
            ctx.fx.emitPowder((ZONE_LEFT + ZONE_RIGHT) / 2f, ZONE_TOP + 0.02f,
                    (ZONE_RIGHT - ZONE_LEFT) * 0.7f, 2);
        }
    }

    @Override
    protected void onGestureDone() {
        ctx.baby.setPowderAmount(1f);
        ctx.fx.emitPowder((ZONE_LEFT + ZONE_RIGHT) / 2f, ZONE_TOP, (ZONE_RIGHT - ZONE_LEFT) * 0.8f, 22);
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setPowderAmount(1f);
    }

    @Override
    protected void onDetach() {
        frameToggle = 0;
        super.onDetach();
    }
}
