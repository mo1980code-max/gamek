package com.gamek.daycare.ui.mini;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.OvershootInterpolator;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.gamek.daycare.R;
import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.view.ParticleEmitterView;

/**
 * Task 6 mini-game: clip five nails.
 *
 * <p>Tap a nail and the clippers swing over to it, snip, and the nail swaps to its short artwork.
 * When all five are done the button unlocks, confetti fires and the game closes itself with a
 * success result — the close button before that point reports failure, which makes the task offer
 * the popup again instead of skipping the step.</p>
 */
public class NailClipGameFragment extends MiniGameFragment {

    private static final int NAIL_COUNT = 5;
    private static final long CLIP_TRAVEL_MS = 170L;
    private static final long SNIP_MS = 90L;
    private static final long AUTO_CLOSE_MS = 1_050L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ImageView[] nailViews = new ImageView[NAIL_COUNT];
    private final boolean[] clipped = new boolean[NAIL_COUNT];
    private final ImageView[] dots = new ImageView[NAIL_COUNT];

    private View dim;
    private View card;
    private ImageView clippers;
    private TextView doneButton;
    private ParticleEmitterView fx;

    private SoundPoolManager sound;
    private boolean animating;
    private boolean allDone;
    private boolean resultSent;

    @NonNull
    @Override
    public String getMiniGameId() {
        return ID_NAIL_CLIP;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_nail_clip, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        dim = view.findViewById(R.id.nail_dim);
        card = view.findViewById(R.id.nail_card);
        clippers = view.findViewById(R.id.nail_clippers);
        doneButton = view.findViewById(R.id.nail_done);
        fx = view.findViewById(R.id.nail_fx);

        nailViews[0] = view.findViewById(R.id.nail_1);
        nailViews[1] = view.findViewById(R.id.nail_2);
        nailViews[2] = view.findViewById(R.id.nail_3);
        nailViews[3] = view.findViewById(R.id.nail_4);
        nailViews[4] = view.findViewById(R.id.nail_5);

        buildProgressDots(view.findViewById(R.id.nail_progress));

        for (int i = 0; i < NAIL_COUNT; i++) {
            final int index = i;
            nailViews[i].setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    clipNail(index);
                }
            });
        }

        doneButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (allDone) {
                    sendResult(true);
                } else {
                    // Not finished yet: a little shake says "keep going" better than a dialog.
                    shake(doneButton);
                    play(SoundPoolManager.Sfx.WRONG, 0.4f, 1f);
                }
            }
        });

        view.findViewById(R.id.nail_close).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                play(SoundPoolManager.Sfx.POP, 0.7f, 1f);
                sendResult(false);
            }
        });

        sound = provideSoundSafely();
        playEntrance();
    }

    private SoundPoolManager provideSoundSafely() {
        Host host = host();
        return host != null ? host.provideSound() : null;
    }

    private void buildProgressDots(LinearLayout row) {
        int size = Math.round(11 * getResources().getDisplayMetrics().density);
        int gap = Math.round(5 * getResources().getDisplayMetrics().density);
        for (int i = 0; i < NAIL_COUNT; i++) {
            ImageView dot = new ImageView(requireContext());
            dot.setImageResource(R.drawable.hud_dot_empty);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
            lp.leftMargin = i == 0 ? 0 : gap;
            row.addView(dot, lp);
            dots[i] = dot;
        }
    }

    private void playEntrance() {
        dim.setAlpha(0f);
        card.setScaleX(0.6f);
        card.setScaleY(0.6f);
        card.setAlpha(0f);
        dim.animate().alpha(1f).setDuration(200L).start();
        card.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(320L)
                .setInterpolator(new OvershootInterpolator(1.5f))
                .start();
        play(SoundPoolManager.Sfx.WHOOSH, 0.6f, 1f);
    }

    /** Swings the clippers to nail #index and snips. */
    private void clipNail(final int index) {
        if (animating || allDone || clipped[index]) {
            return;
        }
        final ImageView nail = nailViews[index];
        if (nail == null || nail.getWidth() == 0) {
            return;
        }
        animating = true;

        // Nails and clippers share the same ConstraintLayout, so getX/getY are directly comparable.
        float targetX = nail.getX() + nail.getWidth() / 2f - clippers.getWidth() / 2f;
        float targetY = nail.getY() + nail.getHeight() / 2f - clippers.getHeight() * 0.28f;

        clippers.setAlpha(1f);
        clippers.animate()
                .x(targetX)
                .y(targetY)
                .rotation(-14f)
                .setDuration(CLIP_TRAVEL_MS)
                .setInterpolator(new OvershootInterpolator(1.2f))
                .withEndAction(new Runnable() {
                    @Override
                    public void run() {
                        snip(index, nail);
                    }
                })
                .start();
    }

    private void snip(final int index, final ImageView nail) {
        clippers.animate()
                .scaleX(0.84f)
                .scaleY(0.84f)
                .setDuration(SNIP_MS)
                .withEndAction(new Runnable() {
                    @Override
                    public void run() {
                        clippers.animate().scaleX(1f).scaleY(1f).setDuration(120L).start();

                        play(SoundPoolManager.Sfx.SNIP);
                        nail.setImageResource(R.drawable.nail_short);
                        pop(nail);
                        emitSparkleAt(nail);

                        clipped[index] = true;
                        updateDots();
                        animating = false;

                        if (isAllClipped()) {
                            onAllClipped();
                        }
                    }
                })
                .start();
    }

    private boolean isAllClipped() {
        for (boolean value : clipped) {
            if (!value) {
                return false;
            }
        }
        return true;
    }

    private void onAllClipped() {
        allDone = true;
        play(SoundPoolManager.Sfx.CELEBRATE);
        doneButton.setAlpha(1f);
        doneButton.setClickable(true);
        pop(doneButton);

        clippers.animate().alpha(0f).setDuration(220L).start();
        if (fx != null && fx.getWidth() > 0) {
            fx.burst(0.5f, 0.45f, 34, ParticleEmitterView.CONFETTI_COLORS,
                    ParticleEmitterView.Shape.STAR, 130f, 380f, 9f, 1200f);
        }

        // Close on its own: a toddler should not have to find the button.
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                sendResult(true);
            }
        }, AUTO_CLOSE_MS);
    }

    private void updateDots() {
        int done = 0;
        for (int i = 0; i < NAIL_COUNT; i++) {
            if (clipped[i]) {
                done++;
            }
            if (dots[i] != null) {
                dots[i].setImageResource(clipped[i]
                        ? R.drawable.hud_dot_filled
                        : R.drawable.hud_dot_empty);
            }
        }
        if (done > 0) {
            play(SoundPoolManager.Sfx.POP, 0.5f, 1f + done * 0.06f);
        }
    }

    private void emitSparkleAt(View nail) {
        if (fx == null || fx.getWidth() == 0 || nail.getWidth() == 0) {
            return;
        }
        int[] location = new int[2];
        nail.getLocationInWindow(location);
        int[] self = new int[2];
        fx.getLocationInWindow(self);
        float fxRatio = (location[0] + nail.getWidth() / 2f - self[0]) / (float) fx.getWidth();
        float fyRatio = (location[1] + nail.getHeight() / 2f - self[1]) / (float) fx.getHeight();
        fx.sparkle(fxRatio, fyRatio);
    }

    /** Reports the result at most once, then closes. */
    private void sendResult(boolean success) {
        if (resultSent) {
            return;
        }
        resultSent = true;
        handler.removeCallbacksAndMessages(null);
        finishWithResult(success);
    }

    private void play(SoundPoolManager.Sfx sfx) {
        play(sfx, 1f, 1f);
    }

    private void play(SoundPoolManager.Sfx sfx, float volume, float rate) {
        if (sound != null && sfx != null) {
            sound.play(sfx, volume, rate);
        }
    }

    private void pop(View view) {
        view.animate().cancel();
        view.setScaleX(0.7f);
        view.setScaleY(0.7f);
        view.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(240L)
                .setInterpolator(new OvershootInterpolator(2.6f))
                .start();
    }

    private void shake(View view) {
        view.animate().cancel();
        view.animate()
                .translationX(dp(6)).setDuration(50L)
                .withEndAction(new Runnable() {
                    @Override
                    public void run() {
                        view.animate().translationX(-dp(6)).setDuration(50L)
                                .withEndAction(new Runnable() {
                                    @Override
                                    public void run() {
                                        view.animate().translationX(0f).setDuration(50L).start();
                                    }
                                })
                                .start();
                    }
                })
                .start();
    }

    private float dp(float value) {
        return value * getResources().getDisplayMetrics().density;
    }

    @Override
    public void onDestroyView() {
        // Dismissed without a result — e.g. the back button popped the popup. Report failure so the
        // nail-clipping task offers the mini-game again instead of waiting forever.
        if (!resultSent) {
            resultSent = true;
            Host host = host();
            if (host != null) {
                host.onMiniGameFinished(getMiniGameId(), false);
            }
        }
        handler.removeCallbacksAndMessages(null);
        if (clippers != null) {
            clippers.animate().cancel();
        }
        if (card != null) {
            card.animate().cancel();
        }
        if (fx != null) {
            fx.clear();
        }
        super.onDestroyView();
    }
}
