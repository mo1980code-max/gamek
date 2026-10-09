package com.gamek.daycare.view;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ObjectAnimator;
import android.content.Context;
import android.util.AttributeSet;
import android.view.ViewPropertyAnimator;
import android.view.animation.AccelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;

/**
 * The sliding tray with the hand that holds the current tool.
 *
 * <p>Lives in the bottom-right of the screen, docked off-screen (bottom + end margins push it out of
 * view in XML) and animated in with {@link ViewPropertyAnimator} + an overshoot interpolator, so it
 * arrives with a small bounce instead of stopping dead. The exact travel distance is measured from
 * the laid-out size, which is why the same code works on any screen.</p>
 *
 * <p>{@link #slideIn(int, Callback)} also swaps the held artwork, so a task transition is one call:
 * slide out the old tool, slide in the new one.</p>
 */
public class TrayController extends FrameLayout {

    /** How long the tray takes to travel between its docked and hidden positions. */
    private static final long SLIDE_IN_DURATION = 420L;
    private static final long SLIDE_OUT_DURATION = 300L;
    private static final float OVERSHOOT = 1.5f;
    private static final long TOOL_POP_DURATION = 220L;

    /** Notified when a slide finishes, so the task manager can start the next step. */
    public interface Callback {
        void onFinished();
    }

    private ImageView toolView;

    private float hiddenX;
    private float hiddenY;
    private float shownX;
    private float shownY;
    private boolean measured;
    private boolean visible;

    private ViewPropertyAnimator currentAnimation;

    public TrayController(Context context) {
        this(context, null);
    }

    public TrayController(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public TrayController(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        setClipChildren(false);
        setClipToPadding(false);
    }

    @Override
    protected void onFinishInflate() {
        super.onFinishInflate();
        toolView = findViewById(R.id.tray_tool);
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        if (w <= 0 || h <= 0) {
            return;
        }
        // Docked = where the layout puts us (translation 0). Hidden = far enough bottom-right that
        // nothing peeks on screen, including the tool that overhangs the panel.
        shownX = 0f;
        shownY = 0f;
        hiddenX = w + dp(24);
        hiddenY = h + dp(24);

        measured = true;
        if (toolView != null) {
            toolView.setPivotX(toolView.getWidth() / 2f);
            toolView.setPivotY(toolView.getHeight());
        }
        if (!visible) {
            setTranslationX(hiddenX);
            setTranslationY(hiddenY);
        }
    }

    /** The tool currently held by the hand; this is the view the drag controller lifts. */
    public ImageView getToolView() {
        return toolView;
    }

    /** True while the tray is docked on screen rather than hidden off it. */
    public boolean isVisible() {
        return visible;
    }

    /** Swaps the held artwork without moving the tray. {@code pop} plays a small scale bounce. */
    public void setTool(int drawableRes, float scale, boolean pop) {
        if (toolView == null) {
            return;
        }
        toolView.animate().cancel();
        toolView.setImageResource(drawableRes);
        toolView.setScaleX(scale);
        toolView.setScaleY(scale);
        toolView.setAlpha(1f);
        toolView.setRotation(0f);
        toolView.setVisibility(VISIBLE);
        if (pop) {
            toolView.setScaleX(scale * 0.5f);
            toolView.setScaleY(scale * 0.5f);
            toolView.animate()
                    .scaleX(scale)
                    .scaleY(scale)
                    .setDuration(TOOL_POP_DURATION)
                    .setInterpolator(new OvershootInterpolator(2.4f))
                    .start();
        }
    }

    /**
     * Slides the tray in from the bottom-right, already holding {@code drawableRes}.
     * The callback runs on the animation thread's end, so it is safe to start the task from it.
     */
    public void slideIn(int drawableRes, Callback callback) {
        setTool(drawableRes, 1f, false);
        slideIn(callback);
    }

    public void slideIn(Callback callback) {
        if (!measured) {
            // Not laid out yet: show immediately rather than animating from a bogus offset.
            setTranslationX(shownX);
            setTranslationY(shownY);
            visible = true;
            if (callback != null) {
                callback.onFinished();
            }
            return;
        }
        cancelCurrent();
        visible = true;
        setAlpha(1f);
        currentAnimation = animate()
                .translationX(shownX)
                .translationY(shownY)
                .setDuration(SLIDE_IN_DURATION)
                .setInterpolator(new OvershootInterpolator(OVERSHOOT))
                .setListener(new EndListener(callback));
        currentAnimation.start();
    }

    /** Slides the tray out to the bottom-right; the callback fires when it is fully gone. */
    public void slideOut(Callback callback) {
        if (!measured || !visible) {
            visible = false;
            if (callback != null) {
                callback.onFinished();
            }
            return;
        }
        cancelCurrent();
        final Callback onComplete = callback;
        currentAnimation = animate()
                .translationX(hiddenX)
                .translationY(hiddenY)
                .setDuration(SLIDE_OUT_DURATION)
                .setInterpolator(new AccelerateInterpolator(1.3f))
                .setListener(new EndListener(new Callback() {
                    @Override
                    public void onFinished() {
                        visible = false;
                        if (onComplete != null) {
                            onComplete.onFinished();
                        }
                    }
                }));
        currentAnimation.start();
    }

    /** Quick "here I am" nudge used by the hint system when the player has not grabbed the tool. */
    public void nudge() {
        if (!visible || !measured) {
            return;
        }
        if (toolView != null) {
            toolView.animate().cancel();
            toolView.animate()
                    .rotation(-9f)
                    .setDuration(110L)
                    .withEndAction(new Runnable() {
                        @Override
                        public void run() {
                            toolView.animate().rotation(0f).setDuration(160L).start();
                        }
                    })
                    .start();
        }
        ObjectAnimator animator = ObjectAnimator.ofFloat(this, "translationY",
                getTranslationY(), getTranslationY() - dp(10), getTranslationY());
        animator.setDuration(320L);
        animator.start();
    }

    /** Hides the tray immediately (used when the celebration overlay takes over). */
    public void hideImmediately() {
        cancelCurrent();
        visible = false;
        if (measured) {
            setTranslationX(hiddenX);
            setTranslationY(hiddenY);
        }
    }

    private void cancelCurrent() {
        if (currentAnimation != null) {
            currentAnimation.setListener(null);
            currentAnimation.cancel();
            currentAnimation = null;
        }
        animate().setListener(null);
    }

    /**
     * {@code ViewPropertyAnimator.setListener} also fires {@code onAnimationCancel} when a newer
     * animation replaces this one, which would run the callback twice. This listener only forwards
     * a genuine end.
     */
    private static final class EndListener extends AnimatorListenerAdapter {

        private final Callback callback;
        private boolean fired;

        EndListener(Callback callback) {
            this.callback = callback;
        }

        @Override
        public void onAnimationEnd(Animator animation) {
            // A replaced animation fires onAnimationCancel, not onAnimationEnd, so the callback
            // can never run twice for the same slide.
            if (fired) {
                return;
            }
            fired = true;
            if (callback != null) {
                callback.onFinished();
            }
        }
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    /** Cancels any running slide. Called from the host's onDestroy. */
    public void release() {
        cancelCurrent();
        if (toolView != null) {
            toolView.animate().cancel();
        }
    }
}
