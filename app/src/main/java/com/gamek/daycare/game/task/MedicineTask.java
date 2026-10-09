package com.gamek.daycare.game.task;

import android.view.View;

import com.gamek.daycare.R;
import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

/**
 * Step 7 — feed the medicine spoon.
 *
 * <p>The baby opens its mouth as soon as the spoon is picked up and the step plays three little
 * gulps after the drop before it counts as done, which is why {@link #completionDelay} holds the
 * completion back instead of firing it the instant the spoon lands.</p>
 */
public class MedicineTask extends SnapSequenceTask {

    private static final int SIPS = 3;
    private static final long SIP_INTERVAL_MS = 230L;

    public MedicineTask(TaskContext ctx) {
        super(TaskStep.MEDICINE, ctx, snaps(
                SnapStep.builder(R.drawable.tool_medicine_spoon)
                        .scale(0.8f)
                        .focus(0.5f, 0.18f)
                        .offset(0, -6)
                        .magnet(0.42f)
                        .build()));
    }

    @Override
    protected HitZone createZone(SnapStep snap, int index) {
        return HitZone.ofView("zone_mouth", ctx.baby.getMouth(), ctx.baby.sceneGroup())
                .padding(ctx.dp(14));
    }

    @Override
    public void onDragStarted(DragController.Draggable draggable, View ghost) {
        ctx.baby.setMouthOpen(true);
        ctx.baby.react(BabyScene.Mood.SURPRISED);
    }

    @Override
    protected void onSnapAccepted(SnapStep snap, int index, HitZone zone) {
        for (int i = 0; i < SIPS; i++) {
            scheduleSip(i);
        }
        reportProgress(1f);
    }

    private void scheduleSip(final int i) {
        postDelayed(new Runnable() {
            @Override
            public void run() {
                ctx.sound.play(SoundPoolManager.Sfx.SIP, 0.9f, 1f + i * 0.08f);
                ctx.baby.pop(ctx.baby.getMouth());
                ctx.baby.setMouthOpen(i < SIPS - 1);
            }
        }, i * SIP_INTERVAL_MS);
    }

    @Override
    protected long completionDelay(SnapStep snap, int index) {
        return SIPS * SIP_INTERVAL_MS + 160L;
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setMouthOpen(false);
    }

    @Override
    public void onSnapBackFinished(DragController.Draggable draggable) {
        ctx.baby.setMouthOpen(false);
    }

    @Override
    protected void onDetach() {
        ctx.baby.setMouthOpen(false);
        super.onDetach();
    }
}
