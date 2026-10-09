package com.gamek.daycare.view;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ObjectAnimator;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.gamek.daycare.R;
import com.gamek.daycare.audio.SoundPoolManager;

/**
 * The three-star level-complete celebration.
 *
 * <p>A full-screen overlay rather than a {@code Dialog}: it has to sit above the game, animate its
 * own confetti and never be dismissed by an accidental back press. Shown by the Activity when
 * {@code TaskManager} reports the round finished.</p>
 *
 * <p>Sequence: dim fades in → panel overshoots to full size → the three stars pop one after
 * another (each with its own ding and its own confetti burst) → the buttons slide up.</p>
 */
public class CompletionOverlay extends FrameLayout {

    private static final long DIM_DURATION = 220L;
    private static final long PANEL_DURATION = 420L;
    private static final long STAR_STAGGER = 260L;
    private static final long STAR_POP_DURATION = 380L;
    private static final long HIDE_DURATION = 220L;

    public interface Listener {
        void onPlayAgain();

        void onHome();
    }

    private final Handler handler = new Handler(Looper.getMainLooper());

    private View dim;
    private View panel;
    private LinearLayout content;
    private final ImageView[] stars = new ImageView[3];
    private TextView btnHome;
    private TextView btnPlayAgain;
    private ParticleEmitterView confetti;

    private SoundPoolManager sound;
    private Listener listener;
    private boolean showing;

    public CompletionOverlay(Context context) {
        this(context, null);
    }

    public CompletionOverlay(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public CompletionOverlay(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        LayoutInflater.from(context).inflate(R.layout.view_completion, this, true);
        bind();
        setVisibility(GONE);
        // Swallow every touch so the game underneath cannot be played through the celebration.
        setClickable(true);
        setFocusable(true);
    }

    private void bind() {
        dim = findViewById(R.id.complete_dim);
        panel = findViewById(R.id.complete_panel);
        content = findViewById(R.id.complete_content);
        stars[0] = findViewById(R.id.star_1);
        stars[1] = findViewById(R.id.star_2);
        stars[2] = findViewById(R.id.star_3);
        btnHome = findViewById(R.id.btn_home);
        btnPlayAgain = findViewById(R.id.btn_play_again);
        confetti = findViewById(R.id.complete_confetti);

        btnPlayAgain.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                press(v);
                if (listener != null) {
                    listener.onPlayAgain();
                }
            }
        });
        btnHome.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                press(v);
                if (listener != null) {
                    listener.onHome();
                }
            }
        });
    }

    public void setSound(SoundPoolManager sound) {
        this.sound = sound;
    }

    public void setListener(Listener listener) {
        this.listener = listener;
    }

    public boolean isShowing() {
        return showing;
    }

    /**
     * Runs the celebration.
     *
     * @param earnedStars 0..3 — the rest stay as empty outlines
     */
    public void show(int earnedStars) {
        if (showing) {
            return;
        }
        showing = true;
        handler.removeCallbacksAndMessages(null);
        setVisibility(VISIBLE);
        bringToFront();

        int stars = Math.max(0, Math.min(3, earnedStars));

        // Start state.
        dim.setAlpha(0f);
        panel.setScaleX(0.4f);
        panel.setScaleY(0.4f);
        panel.setAlpha(0f);
        content.setAlpha(0f);
        content.setTranslationY(dp(16));
        for (ImageView star : stars) {
            star.setImageResource(R.drawable.star_empty);
            star.setScaleX(0f);
            star.setScaleY(0f);
            star.setRotation(-40f);
            star.setAlpha(1f);
        }
        btnHome.setAlpha(0f);
        btnPlayAgain.setAlpha(0f);
        btnHome.setTranslationY(dp(14));
        btnPlayAgain.setTranslationY(dp(14));
        confetti.clear();

        panel.setPivotX(panel.getWidth() / 2f);
        panel.setPivotY(panel.getHeight() / 2f);

        dim.animate().alpha(1f).setDuration(DIM_DURATION).start();
        panel.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(PANEL_DURATION)
                .setInterpolator(new OvershootInterpolator(1.5f))
                .start();
        content.animate().alpha(1f).translationY(0f).setDuration(300L).setStartDelay(120L).start();

        if (sound != null) {
            sound.play(SoundPoolManager.Sfx.LEVEL_COMPLETE);
        }

        for (int i = 0; i < stars; i++) {
            scheduleStarPop(i, 340L + i * STAR_STAGGER);
        }

        // Buttons arrive once the stars are done, so the player cannot tap through the celebration.
        long buttonsAt = 340L + stars * STAR_STAGGER + 120L;
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                revealButtons();
            }
        }, buttonsAt);

        // Confetti lasts longer than the stars: a burst per star plus a rain over the whole panel.
        confetti.celebrate();
    }

    private void scheduleStarPop(final int index, long delay) {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                popStar(index);
            }
        }, delay);
    }

    private void popStar(int index) {
        ImageView star = stars[index];
        if (star == null) {
            return;
        }
        star.setImageResource(R.drawable.star_filled);
        star.setPivotX(star.getWidth() / 2f);
        star.setPivotY(star.getHeight() / 2f);
        star.animate()
                .scaleX(1f)
                .scaleY(1f)
                .rotation(0f)
                .setDuration(STAR_POP_DURATION)
                .setInterpolator(new OvershootInterpolator(2.8f))
                .start();

        if (sound != null) {
            sound.play(SoundPoolManager.Sfx.STAR);
        }
        if (confetti != null && confetti.getWidth() > 0) {
            int[] location = new int[2];
            star.getLocationInWindow(location);
            int[] self = new int[2];
            confetti.getLocationInWindow(self);
            float fx = (location[0] + star.getWidth() / 2f - self[0]) / (float) confetti.getWidth();
            float fy = (location[1] + star.getHeight() / 2f - self[1]) / (float) confetti.getHeight();
            confetti.burst(fx, fy, 18, ParticleEmitterView.CONFETTI_COLORS,
                    ParticleEmitterView.Shape.STAR, 90f, 300f, 8f, 900f);
        }
    }

    private void revealButtons() {
        btnPlayAgain.animate().alpha(1f).translationY(0f).setDuration(240L)
                .setInterpolator(new OvershootInterpolator(1.4f)).start();
        btnHome.animate().alpha(1f).translationY(0f).setDuration(240L).setStartDelay(70L)
                .setInterpolator(new OvershootInterpolator(1.4f)).start();
    }

    /** Fades the celebration out; safe to call when it is not showing. */
    public void hide() {
        if (!showing) {
            return;
        }
        showing = false;
        handler.removeCallbacksAndMessages(null);
        confetti.stopConfettiRain();

        ObjectAnimator fade = ObjectAnimator.ofFloat(this, "alpha", 1f, 0f);
        fade.setDuration(HIDE_DURATION);
        fade.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                setVisibility(GONE);
                setAlpha(1f);
                confetti.clear();
            }
        });
        fade.start();
    }

    /** Cancels every pending animation and callback. Call from the host's onDestroy. */
    public void release() {
        handler.removeCallbacksAndMessages(null);
        for (ImageView star : stars) {
            if (star != null) {
                star.animate().cancel();
            }
        }
        if (panel != null) {
            panel.animate().cancel();
        }
        if (dim != null) {
            dim.animate().cancel();
        }
        if (confetti != null) {
            confetti.clear();
        }
    }

    private void press(View view) {
        view.animate().cancel();
        view.setScaleX(0.92f);
        view.setScaleY(0.92f);
        view.animate().scaleX(1f).scaleY(1f).setDuration(160L)
                .setInterpolator(new OvershootInterpolator(2f)).start();
        if (sound != null) {
            sound.play(SoundPoolManager.Sfx.POP);
        }
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
