package com.gamek.daycare.game.task;

import com.gamek.daycare.R;
import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;

/**
 * Step 2 — put on a fresh diaper, then close the two side stickers.
 *
 * <p>Three snaps in one step: the tray keeps its position and only swaps the artwork it holds, so
 * the whole thing reads as a single continuous action. Because only the current snap's zone is ever
 * registered with the drag controller, the stickers cannot be closed before the diaper is on — the
 * sequencing falls out of the registration instead of needing extra guards.</p>
 */
public class FreshDiaperTask extends SnapSequenceTask {

    public FreshDiaperTask(TaskContext ctx) {
        super(TaskStep.FRESH_DIAPER, ctx, snaps(
                SnapStep.builder(R.drawable.tool_diaper_clean)
                        .scale(1f)
                        .magnet(0.36f)
                        .build(),
                SnapStep.builder(R.drawable.diaper_sticker)
                        .scale(1f)
                        .focus(0.5f, 0.5f)
                        .magnet(0.45f)
                        .build(),
                SnapStep.builder(R.drawable.diaper_sticker)
                        .scale(1f)
                        .focus(0.5f, 0.5f)
                        .magnet(0.45f)
                        .build()));
    }

    @Override
    protected HitZone createZone(SnapStep snap, int index) {
        switch (index) {
            case 0:
                // The fresh-diaper artwork is invisible until it is placed, but it is already laid
                // out, so its bounds are exactly the right target.
                return HitZone.ofView("zone_diaper", ctx.baby.getDiaperFresh(), ctx.baby.sceneGroup())
                        .padding(ctx.dp(16));
            case 1:
                return HitZone.ofView("zone_sticker_left",
                                ctx.baby.getStickerLeft(), ctx.baby.sceneGroup())
                        .padding(ctx.dp(18));
            case 2:
            default:
                return HitZone.ofView("zone_sticker_right",
                                ctx.baby.getStickerRight(), ctx.baby.sceneGroup())
                        .padding(ctx.dp(18));
        }
    }

    @Override
    protected void onSnapAccepted(SnapStep snap, int index, HitZone zone) {
        switch (index) {
            case 0:
                ctx.sound.play(SoundPoolManager.Sfx.POP);
                ctx.baby.setDiaperState(BabyScene.DiaperState.FRESH);
                ctx.baby.react(BabyScene.Mood.SURPRISED);
                break;
            case 1:
                ctx.sound.play(SoundPoolManager.Sfx.STICKER);
                ctx.baby.closeSticker(true);
                break;
            case 2:
            default:
                ctx.sound.play(SoundPoolManager.Sfx.STICKER);
                ctx.baby.closeSticker(false);
                break;
        }
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setDiaperState(BabyScene.DiaperState.FRESH);
        if (!ctx.baby.areBothStickersClosed()) {
            ctx.baby.closeSticker(true);
            ctx.baby.closeSticker(false);
        }
    }
}
