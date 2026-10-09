package com.gamek.daycare.game.task;

import com.gamek.daycare.game.GameTask;
import com.gamek.daycare.game.TaskContext;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.ui.mini.MiniGameFragment;
import com.gamek.daycare.view.BabyScene;

/**
 * Step 6 — the nail-clipping mini-game.
 *
 * <p>The only step with no drag interaction: it hands the screen to
 * {@link com.gamek.daycare.ui.mini.NailClipGameFragment} and waits for the result, which arrives
 * through {@link GameTask#onMiniGameResult}. That keeps the mini-game a genuinely separate,
 * swappable module — replacing it means changing one fragment class and nothing else.</p>
 *
 * <p>{@link #usesTray()} returns {@code false}, so {@code TaskManager} slides the tray out and
 * leaves it out for the whole popup.</p>
 */
public class NailClippingTask extends GameTask {

    /** Small delay so the tray has finished sliding away before the popup covers the screen. */
    private static final long LAUNCH_DELAY_MS = 120L;

    private boolean launchRequested;

    public NailClippingTask(TaskContext ctx) {
        super(TaskStep.NAIL_CLIPPING, ctx);
    }

    @Override
    public boolean usesTray() {
        return false;
    }

    @Override
    protected void onAttach() {
        // Nothing to drag, so there is nothing to register: the mini-game owns the interaction.
        launchRequested = false;
        postDelayed(new Runnable() {
            @Override
            public void run() {
                if (launchRequested) {
                    return;
                }
                launchRequested = true;
                ctx.callbacks.onLaunchMiniGame(NailClippingTask.this, MiniGameFragment.ID_NAIL_CLIP);
            }
        }, LAUNCH_DELAY_MS);
    }

    @Override
    public void onMiniGameResult(boolean success) {
        if (success) {
            ctx.sound.play(com.gamek.daycare.audio.SoundPoolManager.Sfx.SPARKLE);
            ctx.callbacks.onBabyReaction(BabyScene.Mood.HAPPY);
            markComplete();
        } else {
            // Dismissed early: offer it again shortly instead of soft-locking the round.
            launchRequested = false;
            postDelayed(new Runnable() {
                @Override
                public void run() {
                    if (!launchRequested) {
                        launchRequested = true;
                        ctx.callbacks.onLaunchMiniGame(NailClippingTask.this, MiniGameFragment.ID_NAIL_CLIP);
                    }
                }
            }, 600L);
        }
    }

    @Override
    protected void onApplyOutcome() {
        ctx.baby.setNailsClipped(true);
    }

    @Override
    protected void onDetach() {
        launchRequested = true;
        super.onDetach();
    }

    @Override
    public HintMode getHintMode() {
        return HintMode.TAP;
    }
}
