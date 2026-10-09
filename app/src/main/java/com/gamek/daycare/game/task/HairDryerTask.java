package com.gamek.daycare.game.task;

import android.graphics.Rect;
import android.view.View;
import android.widget.FrameLayout;

import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.DragDropHelper;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;
import com.gamek.daycare.view.CircularProgressBar;

/**
 * Step 9 — blow-dry the hair while a circular progress ring fills.
 *
 * <p>The ring is created on demand and dropped into the drag layer next to the hair, so it floats
 * above the scene and follows the artwork whatever the screen size. The dryer loop sound runs only
 * while the nozzle is actually over the hair, and the wet overlay fades out in step with the ring.</p>
 */
public class HairDryerTask extends GestureTask {

    private static final long HOLD_MS = 2_200L;
    private static final int RING_SIZE_DP = 76;

    private CircularProgressBar ring;
    private boolean dryerLooping;
    private int frameToggle;

    public HairDryerTask(TaskContext ctx) {
        super(TaskStep.HAIR_DRYER, ctx, DragController.Gesture.HOLD, 0f, HOLD_MS, 1f);
    }

    @Override
    protected HitZone createZone() {
        return HitZone.ofView("zone_hair", ctx.baby.getHair(), ctx.baby.sceneGroup())
                .padding(ctx.dp(12));
    }

    @Override
    protected float focusX() {
        // Air comes out of the dryer's nozzle, on its left.
        return 0.22f;
    }

    @Override
    protected void onAttach() {
        super.onAttach();
        addRing();
    }

    /** Builds the progress ring and parks it just above-right of the hair. */
    private void addRing() {
        ring = new CircularProgressBar(ctx.context);
        ring.setProgressColor(0xFFFF8A65);
        ring.setTrackColor(0x33000000);
        ring.setDoneColor(0xFF4BD6A0);
        ring.setStrokeDp(11f);
        ring.setAlpha(0f);
        int size = ctx.dp(RING_SIZE_DP);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(size, size);
        ctx.dragLayer.addView(ring, lp);

        ring.post(new Runnable() {
            @Override
            public void run() {
                positionRing();
                ring.animate().alpha(1f).setDuration(220L).start();
            }
        });
    }

    private void positionRing() {
        HitZone zone = getZone();
        if (zone == null || ring == null || ring.getWidth() == 0) {
            return;
        }
        Rect hair = zone.getBounds();                 // in scene coordinates
        Rect sceneInLayer = DragDropHelper.rectIn(ctx.baby.sceneGroup(), ctx.dragLayer, new Rect());
        int centerX = sceneInLayer.left + hair.right + ctx.dp(6);
        int centerY = sceneInLayer.top + hair.centerY() - ctx.dp(10);

        // Keep the ring fully on screen even on narrow devices.
        int maxX = ctx.dragLayer.getWidth() - ring.getWidth() - ctx.dp(8);
        centerX = Math.min(Math.max(centerX, ctx.dp(8)), Math.max(centerX, maxX));

        ring.setTranslationX(centerX - ring.getWidth() / 2f);
        ring.setTranslationY(centerY - ring.getHeight() / 2f);
    }

    @Override
    protected void onZoneEntered(boolean inside) {
        if (inside && !dryerLooping) {
            dryerLooping = true;
            ctx.sound.startDryerLoop();
            ctx.baby.react(BabyScene.Mood.SURPRISED);
        } else if (!inside && dryerLooping) {
            dryerLooping = false;
            ctx.sound.stopDryerLoop();
        }
    }

    @Override
    protected void onGestureTick(float progress) {
        if (ring != null) {
            ring.setProgress(progress);
        }
        ctx.baby.setHairWetness(1f - progress);

        frameToggle++;
        if ((frameToggle & 1) == 0) {
            HitZone zone = getZone();
            if (zone != null) {
                Rect hair = zone.getBounds();
                Rect sceneInRoot = DragDropHelper.rectIn(ctx.baby.sceneGroup(), ctx.root, new Rect());
                float fx = (sceneInRoot.left + hair.centerX()) / (float) Math.max(1, ctx.root.getWidth());
                float fy = (sceneInRoot.top + hair.centerY()) / (float) Math.max(1, ctx.root.getHeight());
                ctx.fx.emitWarmAir(fx, fy, 2);
            }
        }
    }

    @Override
    protected void onGestureDone() {
        stopLoop();
        ctx.baby.setHairWetness(0f);
        if (ring != null) {
            ring.setProgress(1f);
        }
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setHairWetness(0f);
    }

    @Override
    protected void onDetach() {
        stopLoop();
        frameToggle = 0;
        if (ring != null) {
            ring.animate().cancel();
            if (ring.getParent() instanceof FrameLayout) {
                ((FrameLayout) ring.getParent()).removeView(ring);
            }
            ring = null;
        }
        super.onDetach();
    }

    private void stopLoop() {
        if (dryerLooping) {
            dryerLooping = false;
            ctx.sound.stopDryerLoop();
        }
    }

    /** The ring is a nice target for the hint hand when the player has not picked the dryer up. */
    @Override
    public View getHintTargetView() {
        return ctx.baby.getHair();
    }
}
