package com.gamek.daycare.view;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;

import com.gamek.daycare.R;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * The baby and the room, plus every piece of state the eleven steps read and write.
 *
 * <p>Inflates {@code view_baby_scene.xml} (merge-style: the children are added to this
 * FrameLayout) and exposes semantic setters — {@link #setRunnyNose}, {@link #setRashAmount},
 * {@link #setHairWetness} — instead of letting tasks poke at views. That keeps the artwork layout
 * free to change without touching a single task.</p>
 *
 * <p>All positions are fractional, so the same code works on a 5" phone and a 10" tablet, and the
 * {@link com.gamek.daycare.input.HitZone}s built from {@link #sceneGroup()} line up with the art on
 * every screen.</p>
 */
public class BabyScene extends FrameLayout {

    /** Facial expression / one-shot reaction. */
    public enum Mood {
        NEUTRAL,
        HAPPY,
        SAD,
        SURPRISED,
        GIGGLE
    }

    /** Diaper state machine for steps 1 and 2. */
    public enum DiaperState {
        DIRTY,
        BARE,
        FRESH
    }

    private static final long BLINK_MIN_MS = 2600L;
    private static final long BLINK_MAX_MS = 6200L;
    private static final long BLINK_CLOSED_MS = 130L;
    private static final long MOOD_HOLD_MS = 1400L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    /** Marks the posted reaction steps so they can be cancelled without touching the blink loop. */
    private static final Object GROUP_TOKEN = new Object();
    private final Random random = new Random();

    private ViewGroup sceneGroup;

    private ImageView babyHead;
    private ImageView babyBody;
    private ImageView babyFace;
    private ImageView babyEyelids;
    private ImageView babyNoseRunny;
    private ImageView babyMouth;
    private ImageView babyTears;
    private ImageView babyPacifier;
    private ImageView babyHair;
    private ImageView hairWet;
    private ImageView diaperDirty;
    private ImageView diaperFresh;
    private ImageView stickerLeft;
    private ImageView stickerRight;
    private ImageView powderVeil;
    private ImageView faceDirt;
    private ImageView handLeft;
    private ImageView handRight;
    private ImageView trashBin;
    private ImageView trashBinLid;
    private final ImageView[] rashSpots = new ImageView[3];

    /**
     * Every view in {@code view_baby_scene.xml} is a direct child of {@code scene_inner} — that is
     * what makes the fractional HitZones resolution independent — so there is no head container to
     * animate. The groups below stand in for one: a reaction moves every head-related view by the
     * same amount, which keeps the face glued to the head.
     *
     * <p>Groups only ever animate {@code translationX/Y}. Scale and rotation are already spoken for
     * by individual layers (hair mess, nose drip, pacifier pop), so using translation here means a
     * reaction can never clobber them.</p>
     */
    private final List<ImageView> headGroup = new ArrayList<>(9);
    private final List<ImageView> bodyGroup = new ArrayList<>(12);

    private DiaperState diaperState = DiaperState.DIRTY;
    private float rashAmount = 1f;
    private float powderAmount = 0f;
    private float hairWetness = 1f;
    private float hairMess = 1f;
    private float faceDirtAmount = 1f;
    private boolean nailsClipped;
    private boolean hairShowsMessy = true;
    private boolean blinking;
    private boolean attached;

    private final Runnable blinkRunnable = new Runnable() {
        @Override
        public void run() {
            if (!attached) {
                return;
            }
            blink();
            scheduleBlink();
        }
    };

    private final Runnable revertMoodRunnable = new Runnable() {
        @Override
        public void run() {
            react(Mood.NEUTRAL);
        }
    };

    public BabyScene(Context context) {
        this(context, null);
    }

    public BabyScene(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public BabyScene(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        LayoutInflater.from(context).inflate(R.layout.view_baby_scene, this, true);
        bindViews();
        // The scene is decoration, not a control: never steal a touch from the drag controller.
        setClickable(false);
        setFocusable(false);
    }

    private void bindViews() {
        sceneGroup = findViewById(R.id.scene_inner);
        babyHead = findViewById(R.id.baby_head);
        babyBody = findViewById(R.id.baby_body);
        babyFace = findViewById(R.id.baby_face);
        babyEyelids = findViewById(R.id.baby_eyelids);
        babyNoseRunny = findViewById(R.id.baby_nose_runny);
        babyMouth = findViewById(R.id.baby_mouth);
        babyTears = findViewById(R.id.baby_tears);
        babyPacifier = findViewById(R.id.baby_pacifier);
        babyHair = findViewById(R.id.baby_hair);
        hairWet = findViewById(R.id.hair_wet);
        diaperDirty = findViewById(R.id.diaper_dirty);
        diaperFresh = findViewById(R.id.diaper_fresh);
        stickerLeft = findViewById(R.id.sticker_left);
        stickerRight = findViewById(R.id.sticker_right);
        powderVeil = findViewById(R.id.powder_veil);
        faceDirt = findViewById(R.id.face_dirt);
        handLeft = findViewById(R.id.baby_hand_left);
        handRight = findViewById(R.id.baby_hand_right);
        trashBin = findViewById(R.id.trash_bin);
        trashBinLid = findViewById(R.id.trash_bin_lid);
        rashSpots[0] = findViewById(R.id.rash_spot_1);
        rashSpots[1] = findViewById(R.id.rash_spot_2);
        rashSpots[2] = findViewById(R.id.rash_spot_3);

        buildGroups();
        applyAllState();
    }

    private void buildGroups() {
        headGroup.clear();
        bodyGroup.clear();
        headGroup.add(babyHead);
        headGroup.add(babyFace);
        headGroup.add(babyEyelids);
        headGroup.add(babyNoseRunny);
        headGroup.add(babyMouth);
        headGroup.add(babyTears);
        headGroup.add(babyPacifier);
        headGroup.add(babyHair);
        headGroup.add(hairWet);

        bodyGroup.add(babyBody);
        bodyGroup.add(diaperDirty);
        bodyGroup.add(diaperFresh);
        bodyGroup.add(stickerLeft);
        bodyGroup.add(stickerRight);
        bodyGroup.add(powderVeil);
        bodyGroup.add(handLeft);
        bodyGroup.add(handRight);
        for (ImageView spot : rashSpots) {
            if (spot != null) {
                bodyGroup.add(spot);
            }
        }
    }

    // ---------------------------------------------------------------- accessors used as hit anchors

    /** Container every fractional HitZone is measured against. */
    public ViewGroup sceneGroup() {
        return sceneGroup;
    }

    public ImageView getHead() {
        return babyHead;
    }

    public ImageView getBody() {
        return babyBody;
    }

    public ImageView getFace() {
        return babyFace;
    }

    public ImageView getNose() {
        return babyNoseRunny;
    }

    public ImageView getMouth() {
        return babyMouth;
    }

    public ImageView getHair() {
        return babyHair;
    }

    public ImageView getDiaperDirty() {
        return diaperDirty;
    }

    public ImageView getDiaperFresh() {
        return diaperFresh;
    }

    public ImageView getStickerLeft() {
        return stickerLeft;
    }

    public ImageView getStickerRight() {
        return stickerRight;
    }

    public ImageView getTrashBin() {
        return trashBin;
    }

    public ImageView getPacifier() {
        return babyPacifier;
    }

    public float getRashAmount() {
        return rashAmount;
    }

    public float getHairWetness() {
        return hairWetness;
    }

    public float getHairMess() {
        return hairMess;
    }

    public boolean isNailsClipped() {
        return nailsClipped;
    }

    // ---------------------------------------------------------------- state setters

    /** Resets every layer to the "just arrived at daycare" look. */
    public void resetToInitialState() {
        handler.removeCallbacks(revertMoodRunnable);
        diaperState = DiaperState.DIRTY;
        mood = Mood.SAD;
        rashAmount = 1f;
        powderAmount = 0f;
        hairWetness = 1f;
        hairMess = 1f;
        faceDirtAmount = 1f;
        nailsClipped = false;

        babyPacifier.setAlpha(0f);
        babyPacifier.setScaleX(0.4f);
        babyPacifier.setScaleY(0.4f);
        babyTears.setAlpha(0f);
        resetGroup(headGroup);
        resetGroup(bodyGroup);

        stickerLeft.setAlpha(0f);
        stickerRight.setAlpha(0f);
        stickerLeft.setRotation(0f);
        stickerRight.setRotation(0f);

        handLeft.setImageResource(R.drawable.baby_hand_nails_long);
        handRight.setImageResource(R.drawable.baby_hand_nails_long);

        applyAllState();
        hairShowsMessy = true;
        babyHair.setImageResource(R.drawable.hair_messy);
        setRunnyNose(true, false);
        react(Mood.SAD);
    }

    private void applyAllState() {
        setDiaperState(diaperState, false);
        setRashAmount(rashAmount, false);
        setPowderAmount(powderAmount, false);
        setHairWetness(hairWetness, false);
        setHairMess(hairMess, false);
        setFaceDirt(faceDirtAmount, false);
    }

    public void setDiaperState(DiaperState state) {
        setDiaperState(state, true);
    }

    private void setDiaperState(DiaperState state, boolean animate) {
        diaperState = state;
        long duration = animate ? 220L : 0L;
        switch (state) {
            case DIRTY:
                diaperDirty.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(duration).start();
                diaperFresh.animate().alpha(0f).setDuration(duration).start();
                break;
            case BARE:
                diaperDirty.animate().alpha(0f).scaleX(0.6f).scaleY(0.6f).setDuration(duration).start();
                diaperFresh.animate().alpha(0f).setDuration(duration).start();
                break;
            case FRESH:
                diaperDirty.setAlpha(0f);
                diaperDirty.setScaleX(0.6f);
                diaperDirty.setScaleY(0.6f);
                if (animate) {
                    diaperFresh.setScaleX(0.5f);
                    diaperFresh.setScaleY(0.5f);
                    diaperFresh.animate().alpha(1f).scaleX(1f).scaleY(1f)
                            .setDuration(260L)
                            .setInterpolator(new android.view.animation.OvershootInterpolator(1.6f))
                            .start();
                } else {
                    diaperFresh.setAlpha(1f);
                    diaperFresh.setScaleX(1f);
                    diaperFresh.setScaleY(1f);
                }
                break;
            default:
                break;
        }
    }

    /** Closes one side of the fresh diaper. {@code left} sticker pops in with a small overshoot. */
    public void closeSticker(boolean left) {
        ImageView sticker = left ? stickerLeft : stickerRight;
        sticker.setRotation(left ? -28f : 28f);
        sticker.setScaleX(0.4f);
        sticker.setScaleY(0.4f);
        sticker.animate()
                .alpha(1f)
                .rotation(left ? -6f : 6f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(200L)
                .setInterpolator(new android.view.animation.OvershootInterpolator(2.2f))
                .start();
    }

    public boolean areBothStickersClosed() {
        return stickerLeft.getAlpha() > 0.9f && stickerRight.getAlpha() > 0.9f;
    }

    public void setRunnyNose(boolean visible) {
        setRunnyNose(visible, true);
    }

    /**
     * 1 = a full runny nose, 0 = clean. Used by the tissue step so the drip shrinks while the
     * player wipes instead of vanishing in one jump.
     */
    public void setRunnyNoseAmount(float amount) {
        float value = clamp01(amount);
        babyNoseRunny.animate().cancel();
        babyNoseRunny.setAlpha(value);
        babyNoseRunny.setScaleY(0.4f + value * 0.6f);
    }

    private void setRunnyNose(boolean visible, boolean animate) {
        long duration = animate ? 200L : 0L;
        babyNoseRunny.animate()
                .alpha(visible ? 1f : 0f)
                .scaleX(visible ? 1f : 0.4f)
                .scaleY(visible ? 1f : 0.4f)
                .setDuration(duration)
                .start();
    }

    /** 1 = full rash, 0 = clear skin. The three spots fade out in sequence. */
    public void setRashAmount(float amount) {
        setRashAmount(amount, true);
    }

    private void setRashAmount(float amount, boolean animate) {
        rashAmount = clamp01(amount);
        for (int i = 0; i < rashSpots.length; i++) {
            ImageView spot = rashSpots[i];
            if (spot == null) {
                continue;
            }
            // Stagger the spots so they disappear one after another instead of all at once.
            float threshold = 1f - (i + 1) / (float) (rashSpots.length + 0.5f);
            float target = rashAmount > threshold ? 1f : Math.max(0f, (rashAmount - threshold + 0.34f) / 0.34f);
            if (animate) {
                spot.animate().alpha(target).setDuration(180L).setStartDelay(i * 60L).start();
            } else {
                spot.setAlpha(target);
            }
        }
    }

    /** 0 = no powder, 1 = a nice white veil over the diaper area. */
    public void setPowderAmount(float amount) {
        setPowderAmount(amount, true);
    }

    private void setPowderAmount(float amount, boolean animate) {
        powderAmount = clamp01(amount);
        float target = powderAmount * 0.85f;
        if (animate) {
            powderVeil.animate().alpha(target).setDuration(160L).start();
        } else {
            powderVeil.setAlpha(target);
        }
    }

    /** 1 = soaking wet, 0 = bone dry. Drives the wet overlay and the hair's droop. */
    public void setHairWetness(float wetness) {
        setHairWetness(wetness, true);
    }

    private void setHairWetness(float wetness, boolean animate) {
        hairWetness = clamp01(wetness);
        float overlay = hairWetness * 0.6f;
        if (animate) {
            hairWet.animate().alpha(overlay).setDuration(160L).start();
        } else {
            hairWet.setAlpha(overlay);
        }
    }

    /** 1 = a bird's nest, 0 = neatly combed. Rotates and settles the hair artwork. */
    public void setHairMess(float mess) {
        setHairMess(mess, true);
    }

    private void setHairMess(float mess, boolean animate) {
        hairMess = clamp01(mess);
        float rotation = hairMess * 13f;
        float scaleX = 1f + hairMess * 0.16f;
        float scaleY = 1f - hairMess * 0.10f;
        if (animate) {
            babyHair.animate()
                    .rotation(rotation)
                    .scaleX(scaleX)
                    .scaleY(scaleY)
                    .setDuration(180L)
                    .start();
        } else {
            babyHair.setRotation(rotation);
            babyHair.setScaleX(scaleX);
            babyHair.setScaleY(scaleY);
        }
        // Swap the artwork only when the threshold is crossed: this runs every frame while brushing.
        boolean messy = hairMess > 0.5f;
        if (messy != hairShowsMessy) {
            hairShowsMessy = messy;
            babyHair.setImageResource(messy ? R.drawable.hair_messy : R.drawable.hair_neat);
        }
    }

    /** 1 = covered in food, 0 = a clean face. */
    public void setFaceDirt(float amount) {
        setFaceDirt(amount, true);
    }

    private void setFaceDirt(float amount, boolean animate) {
        faceDirtAmount = clamp01(amount);
        if (animate) {
            faceDirt.animate().alpha(faceDirtAmount).setDuration(160L).start();
        } else {
            faceDirt.setAlpha(faceDirtAmount);
        }
    }

    public void setNailsClipped(boolean clipped) {
        nailsClipped = clipped;
        int res = clipped ? R.drawable.baby_hand_nails_short : R.drawable.baby_hand_nails_long;
        handLeft.setImageResource(res);
        handRight.setImageResource(res);
        if (clipped) {
            pop(handLeft);
            pop(handRight);
        }
    }

    /** Opens the mouth for feeding and pops the pacifier in on the final step. */
    public void setMouthOpen(boolean open) {
        babyMouth.setImageResource(open ? R.drawable.mouth_open : R.drawable.mouth_closed);
    }

    public void showPacifier() {
        babyPacifier.setAlpha(0f);
        babyPacifier.setScaleX(0.4f);
        babyPacifier.setScaleY(0.4f);
        babyPacifier.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(240L)
                .setInterpolator(new android.view.animation.OvershootInterpolator(2f))
                .start();
    }

    // ---------------------------------------------------------------- reactions

    /**
     * Swaps the face, plays the matching body language and — for anything except NEUTRAL and SAD —
     * reverts to neutral after {@link #MOOD_HOLD_MS} so the baby never gets stuck grinning.
     *
     * <p>Body language moves the whole {@link #headGroup} (plus the {@link #bodyGroup} for a hop),
     * never {@code babyHead} on its own: the face, nose, mouth and hair are siblings of the head in
     * the flat scene layout, so animating one view would visually detach it from the rest.</p>
     */
    public void react(Mood target) {
        handler.removeCallbacks(revertMoodRunnable);
        handler.removeCallbacksAndMessages(GROUP_TOKEN);
        setFaceDrawable(target);

        switch (target) {
            case HAPPY:
                // Head lifts while the body hops; the two groups animate disjoint views.
                shiftGroup(headGroup, 0f, -dp(6), 140L);
                hopGroup(bodyGroup, dp(9), 150L);
                animateTears(false);
                handler.postDelayed(revertMoodRunnable, MOOD_HOLD_MS);
                break;
            case GIGGLE:
                shakeGroup(headGroup, 3, dp(5));
                shakeGroup(bodyGroup, 2, dp(3));
                animateTears(false);
                handler.postDelayed(revertMoodRunnable, MOOD_HOLD_MS + 320L);
                break;
            case SURPRISED:
                shiftGroup(headGroup, 0f, -dp(4), 90L);
                animateTears(false);
                handler.postDelayed(revertMoodRunnable, 620L);
                break;
            case SAD:
                shiftGroup(headGroup, 0f, dp(3), 200L);
                animateTears(true);
                break;
            case NEUTRAL:
            default:
                shiftGroup(headGroup, 0f, 0f, 180L);
                shiftGroup(bodyGroup, 0f, 0f, 180L);
                animateTears(false);
                break;
        }
    }

    private void setFaceDrawable(Mood target) {
        int res;
        switch (target) {
            case HAPPY:
            case GIGGLE:
                res = R.drawable.face_happy;
                break;
            case SAD:
                res = R.drawable.face_sad;
                break;
            case SURPRISED:
                res = R.drawable.face_surprised;
                break;
            case NEUTRAL:
            default:
                res = R.drawable.face_neutral;
                break;
        }
        babyFace.setImageResource(res);
    }

    private void animateTears(boolean on) {
        babyTears.animate().cancel();
        babyTears.animate()
                .alpha(on ? 0.9f : 0f)
                .setDuration(on ? 240L : 180L)
                .start();
    }

    // ---------------------------------------------------------------- group animation

    private void cancelGroup(List<ImageView> group) {
        for (int i = 0; i < group.size(); i++) {
            ImageView view = group.get(i);
            if (view != null) {
                view.animate().cancel();
            }
        }
    }

    private void shiftGroup(List<ImageView> group, float tx, float ty, long duration) {
        for (int i = 0; i < group.size(); i++) {
            ImageView view = group.get(i);
            if (view == null) {
                continue;
            }
            view.animate().cancel();
            view.animate()
                    .translationX(tx)
                    .translationY(ty)
                    .setDuration(duration)
                    .start();
        }
    }

    /** Up-and-back hop. The return leg is a posted step so the group cannot drift apart. */
    private void hopGroup(final List<ImageView> group, final float lift, long upMs) {
        shiftGroup(group, 0f, -lift, upMs);
        handler.postAtTime(new Runnable() {
            @Override
            public void run() {
                if (attached) {
                    shiftGroup(group, 0f, 0f, 210L);
                }
            }
        }, GROUP_TOKEN, SystemClock.uptimeMillis() + upMs + 40L);
    }

    /** Side-to-side shake, {@code times} round trips, always ending back at the origin. */
    private void shakeGroup(List<ImageView> group, int times, float amplitude) {
        int steps = times * 2 + 1;
        for (int step = 0; step < steps; step++) {
            final float tx = step == steps - 1 ? 0f : (step % 2 == 0 ? amplitude : -amplitude);
            final List<ImageView> target = group;
            handler.postAtTime(new Runnable() {
                @Override
                public void run() {
                    if (!attached) {
                        return;
                    }
                    for (int i = 0; i < target.size(); i++) {
                        ImageView view = target.get(i);
                        if (view != null) {
                            view.setTranslationX(tx);
                        }
                    }
                }
            }, GROUP_TOKEN, SystemClock.uptimeMillis() + step * 75L);
        }
    }

    /** Scale pop used when a prop is committed (stickers, nails, pacifier). */
    public void pop(View view) {
        if (view == null) {
            return;
        }
        view.animate().cancel();
        view.setScaleX(0.7f);
        view.setScaleY(0.7f);
        view.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(220L)
                .setInterpolator(new android.view.animation.OvershootInterpolator(2.4f))
                .start();
    }

    /** Rejection shake for a target that was hit with the wrong tool. */
    public void shake(View view) {
        if (view == null) {
            return;
        }
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

    // ---------------------------------------------------------------- trash bin

    /** Lifts the bin lid while something is being dragged towards it. */
    public void setBinLidOpen(boolean open) {
        trashBinLid.animate().cancel();
        trashBinLid.animate()
                .rotation(open ? -42f : 0f)
                .translationY(open ? -dp(6) : 0f)
                .setDuration(160L)
                .start();
    }

    /** Swallows a dropped item: shrink + fade towards the bin's mouth. */
    public void swallow(View item) {
        if (item == null) {
            return;
        }
        item.animate()
                .scaleX(0.2f)
                .scaleY(0.2f)
                .alpha(0f)
                .translationY(dp(14))
                .setDuration(240L)
                .start();
    }

    // ---------------------------------------------------------------- blink loop

    private void scheduleBlink() {
        long delay = BLINK_MIN_MS + (long) (random.nextFloat() * (BLINK_MAX_MS - BLINK_MIN_MS));
        handler.postDelayed(blinkRunnable, delay);
    }

    private void blink() {
        if (blinking || !attached) {
            return;
        }
        blinking = true;
        babyEyelids.animate().alpha(1f).setDuration(60L).withEndAction(new Runnable() {
            @Override
            public void run() {
                babyEyelids.animate().alpha(0f).setDuration(80L).withEndAction(new Runnable() {
                    @Override
                    public void run() {
                        blinking = false;
                    }
                }).start();
            }
        }).start();
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        // Pivots are 0 until the first layout pass; set them here so rotations happen around the
        // intended point (hair swings from its roots, the bin lid hinges at its back edge).
        setPivotCenter(babyHair);
        setPivotCenter(diaperFresh);
        setPivotCenter(babyPacifier);
        setPivotCenter(stickerLeft);
        setPivotCenter(stickerRight);
        if (trashBinLid.getWidth() > 0) {
            trashBinLid.setPivotX(trashBinLid.getWidth() * 0.1f);
            trashBinLid.setPivotY(trashBinLid.getHeight());
        }
        for (ImageView spot : rashSpots) {
            setPivotCenter(spot);
        }
    }

    private static void setPivotCenter(View view) {
        if (view != null && view.getWidth() > 0 && view.getHeight() > 0) {
            view.setPivotX(view.getWidth() / 2f);
            view.setPivotY(view.getHeight() / 2f);
        }
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        attached = true;
        scheduleBlink();
    }

    @Override
    protected void onDetachedFromWindow() {
        attached = false;
        handler.removeCallbacksAndMessages(null);
        cancelGroup(headGroup);
        cancelGroup(bodyGroup);
        babyTears.animate().cancel();
        babyEyelids.animate().cancel();
        super.onDetachedFromWindow();
    }

    /** Cancels and zeroes any pending reaction, so a reset cannot inherit a half-finished shake. */
    private void resetGroup(List<ImageView> group) {
        for (int i = 0; i < group.size(); i++) {
            ImageView view = group.get(i);
            if (view == null) {
                continue;
            }
            view.animate().cancel();
            view.setTranslationX(0f);
            view.setTranslationY(0f);
        }
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static float clamp01(float value) {
        return value < 0f ? 0f : (value > 1f ? 1f : value);
    }
}
