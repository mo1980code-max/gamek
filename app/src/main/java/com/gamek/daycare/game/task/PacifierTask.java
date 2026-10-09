package com.gamek.daycare.game.task;

import com.gamek.daycare.R;
import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

/**
 * Step 11 — the pacifier goes in the mouth, and the round is over.
 *
 * <p>The final snap pops the pacifier artwork into place on the baby, closes the mouth and gets the
 * giggle reaction; {@code TaskManager} then runs the three-star celebration.</p>
 */
public class PacifierTask extends SnapSequenceTask {

    public PacifierTask(TaskContext ctx) {
        super(TaskStep.PACIFIER, ctx, snaps(
                SnapStep.builder(R.drawable.tool_pacifier)
                        .scale(1f)
                        .focus(0.5f, 0.62f)
                        .magnet(0.46f)
                        .build()));
    }

    @Override
    protected HitZone createZone(SnapStep snap, int index) {
        // The mouth is small, so the zone is padded generously — the last step should never feel
        // like the hardest one.
        return HitZone.ofView("zone_pacifier_mouth", ctx.baby.getMouth(), ctx.baby.sceneGroup())
                .padding(ctx.dp(18));
    }

    @Override
    protected void onSnapAccepted(SnapStep snap, int index, HitZone zone) {
        ctx.sound.play(SoundPoolManager.Sfx.POP);
        ctx.baby.setMouthOpen(true);
        ctx.baby.showPacifier();
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.showPacifier();
        ctx.baby.setMouthOpen(false);
        ctx.baby.react(BabyScene.Mood.GIGGLE);
    }

    @Override
    protected long completionDelay(SnapStep snap, int index) {
        // Let the pacifier pop and the giggle land before the celebration takes over.
        return 380L;
    }
}
