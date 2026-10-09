package com.gamek.daycare.game.task;

import android.view.View;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.GameTask;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Base class for steps made of one or more "drag this tool onto that exact spot" snaps.
 *
 * <p>Used by the fresh-diaper step (place the diaper, then close the left sticker, then the right
 * one), by single-snap steps such as the pacifier and the medicine spoon, and by the dirty-diaper
 * step where the only valid target is the bin.</p>
 *
 * <p>Between snaps the tray keeps its position and only the held artwork is swapped with a pop, so
 * a multi-part step reads as one continuous action instead of three separate turns.</p>
 */
public abstract class SnapSequenceTask extends GameTask implements DragController.Listener {

    /** Delay between finishing one snap and the tray offering the next piece. */
    private static final long NEXT_SNAP_DELAY = 260L;

    /** One tool → one target pairing inside a step. */
    protected static final class SnapStep {
        final int toolRes;
        final float scale;
        final int offsetXDp;
        final int offsetYDp;
        final float focusX;
        final float focusY;
        final float magnet;

        private SnapStep(Builder b) {
            this.toolRes = b.toolRes;
            this.scale = b.scale;
            this.offsetXDp = b.offsetXDp;
            this.offsetYDp = b.offsetYDp;
            this.focusX = b.focusX;
            this.focusY = b.focusY;
            this.magnet = b.magnet;
        }

        public static Builder builder(int toolDrawableRes) {
            return new Builder(toolDrawableRes);
        }

        static final class Builder {
            private final int toolRes;
            private float scale = 1f;
            private int offsetXDp;
            private int offsetYDp;
            private float focusX = 0.5f;
            private float focusY = 0.5f;
            private float magnet = 0.3f;

            Builder(int toolRes) {
                this.toolRes = toolRes;
            }

            /** Scale of the artwork once it has snapped onto the target. */
            Builder scale(float value) { this.scale = value; return this; }
            /** Fine-tune where the tool lands relative to the zone center, in dp. */
            Builder offset(int dxDp, int dyDp) { this.offsetXDp = dxDp; this.offsetYDp = dyDp; return this; }
            /** The tool's working end, as a fraction of its own size. */
            Builder focus(float x, float y) { this.focusX = x; this.focusY = y; return this; }
            Builder magnet(float value) { this.magnet = value; return this; }

            SnapStep build() { return new SnapStep(this); }
        }
    }

    private final List<SnapStep> snaps;
    private int index;
    private HitZone currentZone;

    protected SnapSequenceTask(TaskStep step, TaskContext ctx, List<SnapStep> snaps) {
        super(step, ctx);
        if (snaps == null || snaps.isEmpty()) {
            throw new IllegalArgumentException("SnapSequenceTask needs at least one snap");
        }
        this.snaps = Collections.unmodifiableList(new ArrayList<>(snaps));
    }

    protected static List<SnapStep> snaps(SnapStep... steps) {
        return Arrays.asList(steps);
    }

    /** The target zone for snap #index. */
    protected abstract HitZone createZone(SnapStep snap, int index);

    /** A snap was accepted — commit the artwork (diaper appears, sticker sticks, …). */
    protected abstract void onSnapAccepted(SnapStep snap, int index, HitZone zone);

    /** Optional: the tray tool may need a different scale than the drop target. */
    protected float toolScaleInTray(SnapStep snap, int index) {
        return 1f;
    }

    /**
     * Extra time before the final snap counts as done, so a step can play its payoff first (the
     * medicine step sips three times before the baby smiles). 0 completes immediately.
     */
    protected long completionDelay(SnapStep snap, int index) {
        return 0L;
    }

    @Override
    protected void onAttach() {
        showSnap(0);
    }

    @Override
    protected void onDetach() {
        super.onDetach();
        currentZone = null;
    }

    private void showSnap(final int i) {
        if (i >= snaps.size()) {
            return;
        }
        index = i;
        final SnapStep snap = snaps.get(i);

        ctx.tray.setTool(snap.toolRes, toolScaleInTray(snap, i), i > 0);
        currentZone = createZone(snap, i);

        DragController.Options options = new DragController.Options()
                .behavior(DragController.DropBehavior.SNAP_AND_RELEASE)
                .gesture(DragController.Gesture.NONE)
                .snapScale(snap.scale)
                .focus(snap.focusX, snap.focusY)
                .snapOffset(ctx.dp(snap.offsetXDp), ctx.dp(snap.offsetYDp))
                .magnet(snap.magnet)
                .listener(this);
        bindTool(TaskContext.zones(currentZone), options, null);

        reportProgress(snaps.size() == 1 ? 0f : (float) i / snaps.size());
    }

    // ---------------------------------------------------------------- DragController.Listener

    @Override
    public void onPickupArmed(DragController.Draggable draggable, float rawX, float rawY) {
        // Pickup / zone-enter / snap cues come from the DragController's PickupSfx.
    }

    @Override
    public void onDragStarted(DragController.Draggable draggable, View ghost) {
    }

    @Override
    public void onZoneChanged(DragController.Draggable draggable, HitZone zone) {
    }

    @Override
    public void onGestureProgress(DragController.Draggable draggable, float progress) {
    }

    @Override
    public boolean onDropOnTarget(DragController.Draggable draggable, HitZone zone) {
        final SnapStep snap = snaps.get(index);
        final int accepted = index;
        onSnapAccepted(snap, accepted, zone);
        ctx.callbacks.onBurstRequested(0.5f, 0.45f);

        if (accepted + 1 >= snaps.size()) {
            ctx.sound.play(SoundPoolManager.Sfx.SPARKLE);
            ctx.callbacks.onBabyReaction(BabyScene.Mood.HAPPY);
            long delay = completionDelay(snap, accepted);
            if (delay > 0L) {
                postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        markComplete();
                    }
                }, delay);
            } else {
                markComplete();
            }
            return true;
        }

        // More pieces to place: swap the tray artwork after a beat.
        postDelayed(new Runnable() {
            @Override
            public void run() {
                showSnap(accepted + 1);
            }
        }, NEXT_SNAP_DELAY);
        return true;
    }

    @Override
    public void onDropMissed(DragController.Draggable draggable) {
        ctx.sound.play(SoundPoolManager.Sfx.WRONG, 0.45f, 1f);
    }

    @Override
    public void onSnapBackFinished(DragController.Draggable draggable) {
    }

    @Override
    public HitZone getHintZone() {
        return currentZone != null ? currentZone : super.getHintZone();
    }
}
