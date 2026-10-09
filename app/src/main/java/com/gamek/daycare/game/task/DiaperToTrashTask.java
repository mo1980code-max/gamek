package com.gamek.daycare.game.task;

import com.gamek.daycare.R;
import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

/**
 * Step 1 — drag the old dirty diaper into the trash bin.
 *
 * <p>The bin lid lifts while the diaper is on its way and slams shut again on a miss, which is the
 * feedback that teaches "this is the target" without any text.</p>
 */
public class DiaperToTrashTask extends SnapSequenceTask {

    public DiaperToTrashTask(TaskContext ctx) {
        super(TaskStep.DIAPER_TO_TRASH, ctx, snaps(
                SnapStep.builder(R.drawable.tool_diaper_dirty)
                        .scale(0.85f)
                        .magnet(0.34f)
                        .build()));
    }

    @Override
    protected HitZone createZone(SnapStep snap, int index) {
        // Generous padding: the bin is in the corner and the diaper is a big, wobbly target.
        return HitZone.ofView("zone_trash_bin", ctx.baby.getTrashBin(), ctx.baby.sceneGroup())
                .padding(ctx.dp(14));
    }

    @Override
    protected void onSnapAccepted(SnapStep snap, int index, HitZone zone) {
        ctx.sound.play(SoundPoolManager.Sfx.TRASH);
        ctx.baby.setDiaperState(BabyScene.DiaperState.BARE);
        ctx.baby.setBinLidOpen(false);
        ctx.baby.react(BabyScene.Mood.SURPRISED);
        // A second, delayed reaction reads much better than one instant smile.
        postDelayed(new Runnable() {
            @Override
            public void run() {
                ctx.callbacks.onBabyReaction(BabyScene.Mood.HAPPY);
            }
        }, 420L);
    }

    @Override
    public void onZoneChanged(DragController.Draggable draggable, HitZone zone) {
        ctx.baby.setBinLidOpen(zone != null);
    }

    @Override
    public void onDropMissed(DragController.Draggable draggable) {
        ctx.baby.setBinLidOpen(false);
        ctx.baby.shake(ctx.baby.getTrashBin());
        super.onDropMissed(draggable);
    }

    @Override
    protected void onDetach() {
        ctx.baby.setBinLidOpen(false);
        super.onDetach();
    }
}
