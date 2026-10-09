package com.gamek.daycare.view;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;

import com.gamek.daycare.R;
import com.gamek.daycare.input.DragDropHelper;
import com.gamek.daycare.input.HitZone;

/**
 * The idle hint: a bouncing pointing hand that appears when the player has not done anything for
 * {@link #DEFAULT_IDLE_DELAY_MS} (4 s) and flies from the tray tool towards the current target.
 *
 * <p>It asks a {@link Provider} — normally the {@code TaskManager} — where to point, so it never
 * needs to know which of the eleven steps is running. Two modes are supported:</p>
 * <ul>
 *   <li>{@code DRAG} — the hand travels tool → target, bounces there, then fades out;</li>
 *   <li>{@code TAP} — the hand just bounces in place over the thing to tap (diaper stickers,
 *       rash spots).</li>
 * </ul>
 *
 * <p>A pulsing ring is shown on the target while the hand is up, which is what makes the hint
 * readable for pre-readers. The whole cycle repeats for as long as the player stays idle.</p>
 */
public final class HintController {

    /** Inactivity threshold before the first hint, per the game design. */
    public static final long DEFAULT_IDLE_DELAY_MS = 4_000L;

    /** How often the controller checks whether the player has gone idle. */
    private static final long POLL_INTERVAL_MS = 350L;
    private static final long TRAVEL_DURATION_MS = 620L;
    private static final long BOUNCE_DURATION_MS = 380L;
    private static final int BOUNCES = 3;
    private static final long FADE_DURATION_MS = 220L;
    /** Gap between two hint cycles while the player keeps ignoring the game. */
    private static final long REPEAT_GAP_MS = 1_600L;

    private static final int HAND_SIZE_DP = 78;
    private static final int RING_SIZE_DP = 104;

    /** Where the hint should point. Implemented by {@code TaskManager}. */
    public interface Provider {
        /** False while a celebration, a mini-game or a transition is running. */
        boolean isHintAllowed();

        /** View the hand flies from — usually the tool in the tray. May be {@code null}. */
        View getHintSource();

        /** View the hand flies to. May be {@code null} when {@link #getHintZone()} is used. */
        View getHintTargetView();

        /** Fallback target when there is no view to point at. May be {@code null}. */
        HitZone getHintZone();

        /** Drag-style or tap-style hint. */
        com.gamek.daycare.game.GameTask.HintMode getHintMode();
    }

    /** Supplies "has the player been idle?" — normally the {@code DragController}. */
    public interface IdleSource {
        boolean isIdleFor(long millis);
    }

    private final ViewGroup layer;
    private Provider provider;
    private final IdleSource idleSource;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Rect scratch = new Rect();

    private long idleDelayMs = DEFAULT_IDLE_DELAY_MS;
    private boolean running;
    private boolean showing;
    private boolean destroyed;

    private ImageView hand;
    private ImageView ring;
    private ObjectAnimator bounce;
    private android.animation.AnimatorSet travel;
    private android.animation.AnimatorSet ringPulseSet;

    private final Runnable poll = new Runnable() {
        @Override
        public void run() {
            if (destroyed || !running) {
                return;
            }
            if (!showing && shouldShowNow()) {
                show();
            } else {
                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        }
    };

    private final Runnable restartAfterCycle = new Runnable() {
        @Override
        public void run() {
            if (destroyed || !running) {
                return;
            }
            showing = false;
            handler.postDelayed(poll, POLL_INTERVAL_MS);
        }
    };

    /**
     * @param idleSource supplies "has the player been idle?" — normally the DragController
     */
    public HintController(ViewGroup layer, IdleSource idleSource) {
        this.layer = layer;
        this.idleSource = idleSource;
        if (layer != null) {
            layer.setClipChildren(false);
        }
    }

    /**
     * Sets what to point at. Wired after construction because the provider is normally the
     * {@code TaskManager}, which itself takes this controller as a dependency.
     */
    public void setProvider(Provider provider) {
        this.provider = provider;
    }

    public void setIdleDelay(long millis) {
        this.idleDelayMs = millis;
    }

    /** Starts watching for inactivity. Cheap: one delayed message every 350 ms. */
    public void start() {
        if (destroyed || running) {
            return;
        }
        running = true;
        handler.removeCallbacks(poll);
        handler.postDelayed(poll, POLL_INTERVAL_MS);
    }

    public void stop() {
        running = false;
        hide();
        handler.removeCallbacks(poll);
        handler.removeCallbacks(restartAfterCycle);
    }

    /** Called on every touch so an in-progress hint cycle is abandoned immediately. */
    public void onUserInteraction() {
        if (showing) {
            hide();
            handler.removeCallbacks(restartAfterCycle);
            showing = false;
        }
        handler.removeCallbacks(poll);
        if (running && !destroyed) {
            handler.postDelayed(poll, POLL_INTERVAL_MS);
        }
    }

    public void onDestroy() {
        destroyed = true;
        stop();
        handler.removeCallbacksAndMessages(null);
        cancelAnimations();
        if (hand != null && hand.getParent() == layer) {
            layer.removeView(hand);
        }
        if (ring != null && ring.getParent() == layer) {
            layer.removeView(ring);
        }
        hand = null;
        ring = null;
    }

    private boolean shouldShowNow() {
        if (provider == null || !provider.isHintAllowed()) {
            return false;
        }
        return idleSource == null || idleSource.isIdleFor(idleDelayMs);
    }

    // ---------------------------------------------------------------- views

    private void ensureViews() {
        if (hand == null) {
            hand = new ImageView(layer.getContext());
            hand.setImageResource(R.drawable.hint_hand);
            hand.setScaleType(ImageView.ScaleType.FIT_CENTER);
            hand.setAlpha(0f);
            int size = dp(HAND_SIZE_DP);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(size, size);
            layer.addView(hand, lp);
        }
        if (ring == null) {
            ring = new ImageView(layer.getContext());
            ring.setImageResource(R.drawable.hint_ring);
            ring.setScaleType(ImageView.ScaleType.FIT_CENTER);
            ring.setAlpha(0f);
            int size = dp(RING_SIZE_DP);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(size, size);
            layer.addView(ring, lp);
        }
    }

    // ---------------------------------------------------------------- show / hide

    private void show() {
        if (layer == null || layer.getWidth() == 0) {
            handler.postDelayed(poll, POLL_INTERVAL_MS);
            return;
        }
        ensureViews();

        float[] target = resolveTargetPoint();
        if (target == null) {
            // Nothing to point at yet (e.g. the zone has no size) — try again later.
            handler.postDelayed(poll, POLL_INTERVAL_MS);
            return;
        }
        showing = true;

        float tx = target[0];
        float ty = target[1];
        com.gamek.daycare.game.GameTask.HintMode mode = provider.getHintMode();

        placeRing(tx, ty);
        pulseRing();

        if (mode == com.gamek.daycare.game.GameTask.HintMode.TAP) {
            placeHand(tx, ty);
            hand.setAlpha(0f);
            hand.animate().alpha(1f).setDuration(FADE_DURATION_MS).start();
            startBounce(tx, ty);
            return;
        }

        float[] source = resolveSourcePoint(tx, ty);
        placeHand(source[0], source[1]);
        hand.setAlpha(0f);
        hand.animate().alpha(1f).setDuration(120L).start();
        travelThenBounce(source[0], source[1], tx, ty);
    }

    private void travelThenBounce(float fromX, float fromY, final float toX, final float toY) {
        cancelAnimations();
        ObjectAnimator x = ObjectAnimator.ofFloat(hand, "translationX", fromX, toX);
        ObjectAnimator y = ObjectAnimator.ofFloat(hand, "translationY", fromY, toY);
        x.setDuration(TRAVEL_DURATION_MS);
        y.setDuration(TRAVEL_DURATION_MS);
        x.setInterpolator(new OvershootInterpolator(1.1f));
        y.setInterpolator(new OvershootInterpolator(1.1f));
        x.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                // Keep the ring glued to the hand while it travels, then let it settle on target.
                float t = animation.getAnimatedFraction();
                if (ring != null) {
                    ring.setAlpha(Math.min(1f, t * 1.6f) * 0.9f);
                }
            }
        });
        android.animation.AnimatorSet set = new android.animation.AnimatorSet();
        set.playTogether(x, y);
        set.addListener(new android.animation.AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(android.animation.Animator animation) {
                if (!showing || destroyed) {
                    return;
                }
                startBounce(toX, toY);
            }
        });
        set.start();
        travel = set;
    }

    /** The signature "boing boing" towards the target. */
    private void startBounce(float anchorX, float anchorY) {
        if (hand == null || destroyed) {
            return;
        }
        cancelBounce();
        bounce = ObjectAnimator.ofFloat(hand, "translationY", anchorY, anchorY - dp(20));
        bounce.setDuration(BOUNCE_DURATION_MS);
        bounce.setRepeatCount(BOUNCES);
        bounce.setRepeatMode(ValueAnimator.REVERSE);
        bounce.setInterpolator(new OvershootInterpolator(2.6f));
        bounce.addListener(new android.animation.AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(android.animation.Animator animation) {
                finishCycle();
            }

            // No onAnimationCancel override: Animator.cancel() also fires onAnimationEnd, and the
            // callers that cancel (hide/onUserInteraction) remove the listeners first so a
            // cancelled bounce cannot schedule another hint cycle.
        });
        bounce.start();
    }

    private void finishCycle() {
        if (destroyed) {
            return;
        }
        if (hand != null) {
            hand.animate().alpha(0f).setDuration(FADE_DURATION_MS).start();
        }
        if (ring != null) {
            ring.animate().alpha(0f).setDuration(FADE_DURATION_MS).start();
        }
        cancelBounce();
        stopRingPulse();
        handler.removeCallbacks(restartAfterCycle);
        handler.postDelayed(restartAfterCycle, REPEAT_GAP_MS);
    }

    public void hide() {
        cancelAnimations();
        if (hand != null) {
            hand.animate().cancel();
            hand.setAlpha(0f);
        }
        if (ring != null) {
            ring.animate().cancel();
            ring.setAlpha(0f);
        }
    }

    private void placeHand(float centerX, float centerY) {
        if (hand == null) {
            return;
        }
        // The fingertip sits in the drawable's upper-left third, so offset the view down-right.
        hand.setTranslationX(centerX - hand.getWidth() * 0.28f);
        hand.setTranslationY(centerY - hand.getHeight() * 0.22f);
    }

    private void placeRing(float centerX, float centerY) {
        if (ring == null) {
            return;
        }
        ring.setTranslationX(centerX - ring.getWidth() / 2f);
        ring.setTranslationY(centerY - ring.getHeight() / 2f);
        ring.setScaleX(0.8f);
        ring.setScaleY(0.8f);
    }

    private void pulseRing() {
        if (ring == null) {
            return;
        }
        stopRingPulse();
        ObjectAnimator sx = ObjectAnimator.ofFloat(ring, "scaleX", 0.75f, 1.15f);
        ObjectAnimator sy = ObjectAnimator.ofFloat(ring, "scaleY", 0.75f, 1.15f);
        ObjectAnimator alpha = ObjectAnimator.ofFloat(ring, "alpha", 0.85f, 0.25f);
        sx.setDuration(760L);
        sy.setDuration(760L);
        alpha.setDuration(760L);
        sx.setRepeatCount(ValueAnimator.INFINITE);
        sy.setRepeatCount(ValueAnimator.INFINITE);
        alpha.setRepeatCount(ValueAnimator.INFINITE);
        android.animation.AnimatorSet set = new android.animation.AnimatorSet();
        set.playTogether(sx, sy, alpha);
        set.start();
        ringPulseSet = set;
    }

    private void stopRingPulse() {
        if (ringPulseSet != null) {
            ringPulseSet.cancel();
            ringPulseSet = null;
        }
    }

    private void cancelBounce() {
        if (bounce != null) {
            bounce.removeAllListeners();
            bounce.cancel();
            bounce = null;
        }
    }

    private void cancelAnimations() {
        cancelBounce();
        stopRingPulse();
        if (travel != null) {
            travel.cancel();
            travel = null;
        }
    }

    // ---------------------------------------------------------------- target resolution

    /** Center of the thing to point at, in {@code layer} coordinates; {@code null} if unknown. */
    private float[] resolveTargetPoint() {
        View targetView = provider.getHintTargetView();
        if (targetView != null && targetView.getWidth() > 0 && isOnScreen(targetView)) {
            DragDropHelper.rectIn(targetView, layer, scratch);
            return new float[]{scratch.centerX(), scratch.centerY()};
        }
        HitZone zone = provider.getHintZone();
        if (zone != null) {
            ViewGroup space = zone.getSpace();
            if (space != null && space.getWidth() > 0) {
                Rect bounds = zone.getBounds();
                if (!bounds.isEmpty()) {
                    // Zone bounds are in the zone's space; shift them into the layer's space.
                    DragDropHelper.rectIn(space, layer, scratch);
                    int dx = scratch.left;
                    int dy = scratch.top;
                    return new float[]{bounds.centerX() + dx, bounds.centerY() + dy};
                }
            }
            View anchor = zone.getAnchor();
            if (anchor != null && anchor.getWidth() > 0) {
                DragDropHelper.rectIn(anchor, layer, scratch);
                return new float[]{scratch.centerX(), scratch.centerY()};
            }
        }
        return null;
    }

    /** Where the hand starts from: the tray tool when there is one, else just off-target. */
    private float[] resolveSourcePoint(float targetX, float targetY) {
        View source = provider.getHintSource();
        if (source != null && source.getWidth() > 0 && source.getAlpha() > 0.1f && isOnScreen(source)) {
            DragDropHelper.rectIn(source, layer, scratch);
            return new float[]{scratch.centerX(), scratch.centerY()};
        }
        return new float[]{targetX + dp(70), targetY + dp(110)};
    }

    private boolean isOnScreen(View view) {
        return view.getVisibility() == View.VISIBLE
                && view.getWidth() > 0
                && view.getHeight() > 0
                && view.getGlobalVisibleRect(new Rect());
    }

    private int dp(float value) {
        return Math.round(value * layer.getResources().getDisplayMetrics().density);
    }
}
