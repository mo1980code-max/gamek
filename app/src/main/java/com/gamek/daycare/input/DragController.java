package com.gamek.daycare.input;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.ImageView;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The single {@link View.OnTouchListener} that drives every drag interaction in the game.
 *
 * <h3>Wiring</h3>
 * <pre>
 *   // in the layout: the root FrameLayout must be android:clickable="true" so that touches which
 *   // no child handled still reach this listener for the whole gesture.
 *   root.setOnTouchListener(dragController);
 * </pre>
 * Buttons and tap targets inside the root keep working: a child that handles {@code ACTION_DOWN}
 * consumes the gesture before it ever bubbles up to the root.
 *
 * <h3>Drag lifecycle</h3>
 * <ol>
 *   <li>{@link #registerDraggable} marks a view (the tool held by the tray hand) as draggable and
 *       declares which {@link HitZone}s it may be dropped on.</li>
 *   <li>{@code ACTION_DOWN} inside that view arms a pickup. Once the finger travels past the system
 *       touch slop the drag starts: a <em>ghost</em> {@link ImageView} is created in the drag layer,
 *       the source tool is hidden, a pop SFX plays and the tool "lifts" (scale 1.12 + velocity tilt).</li>
 *   <li>{@code ACTION_MOVE} repositions the ghost inside a pre-draw pass (so motion is frame-synced
 *       and never tears) and runs {@link DragDropHelper#bestHit} — i.e. {@code Rect.intersects} —
 *       against every active zone.</li>
 *   <li>{@code ACTION_UP} resolves through the task's {@link DropBehavior}:
 *       <ul>
 *         <li>{@code SNAP_AND_RELEASE} — animate onto the target and finish, or
 *             {@link #animateSnapBack} into the tray hand when nothing was hit;</li>
 *         <li>{@code SNAP_AND_STICK} — land on the target, then keep the session alive in
 *             <em>sticky standby</em> so the player can rub / wipe / hold until the gesture fills.</li>
 *       </ul></li>
 * </ol>
 *
 * <p>Sticky standby is what makes "drag the tissue, then wipe the nose" work with more than one
 * swipe: lifting the finger never aborts the step, it just parks the tool on the target.</p>
 */
public final class DragController implements View.OnTouchListener {

    /** What happens when the tool is released over a valid zone. */
    public enum DropBehavior {
        /** Snap onto the target and end the drag (dirty diaper → bin, pacifier → mouth, …). */
        SNAP_AND_RELEASE,
        /** Snap onto the target, then keep the session alive until the gesture completes. */
        SNAP_AND_STICK
    }

    /** The gesture a sticky drag must perform before the step counts as done. */
    public enum Gesture {
        NONE,
        /** Back-and-forth rubbing in any direction (rash cream, wet towel). */
        RUB_FREE,
        /** Back-and-forth rubbing along X (tissue on the nose). */
        RUB_HORIZONTAL,
        /** Back-and-forth rubbing along Y (hair brush). */
        RUB_VERTICAL,
        /** Keeping the tool inside the zone for a duration (hair dryer, powder). */
        HOLD
    }

    /** Callbacks a task receives while the player manipulates its tool. */
    public interface Listener {
        /** Finger went down on a registered draggable view, before the slop was exceeded. */
        void onPickupArmed(Draggable draggable, float rawX, float rawY);

        /** The drag started; the ghost now follows the finger. */
        void onDragStarted(Draggable draggable, View ghost);

        /** The ghost entered {@code zone}, or {@code null} when it left every zone. */
        void onZoneChanged(Draggable draggable, HitZone zone);

        /** Progress of a sticky gesture, 0..1. Only fired for {@link DropBehavior#SNAP_AND_STICK}. */
        void onGestureProgress(Draggable draggable, float progress);

        /**
         * The tool settled on a valid zone (or a sticky gesture filled up).
         *
         * @return {@code true} when the drop solved the step. When {@code false} the tool snaps back
         *         into the tray and the hint system re-fires a little later.
         */
        boolean onDropOnTarget(Draggable draggable, HitZone zone);

        /** Released over nothing useful — the snap-back animation is already running. */
        void onDropMissed(Draggable draggable);

        /** Snap-back finished; the source tool is visible in the tray again. */
        void onSnapBackFinished(Draggable draggable);
    }

    /** No-op implementation so tasks only override what they care about. */
    public static class SimpleListener implements Listener {
        @Override public void onPickupArmed(Draggable draggable, float rawX, float rawY) { }
        @Override public void onDragStarted(Draggable draggable, View ghost) { }
        @Override public void onZoneChanged(Draggable draggable, HitZone zone) { }
        @Override public void onGestureProgress(Draggable draggable, float progress) { }
        @Override public boolean onDropOnTarget(Draggable draggable, HitZone zone) { return false; }
        @Override public void onDropMissed(Draggable draggable) { }
        @Override public void onSnapBackFinished(Draggable draggable) { }
    }

    /** A registered draggable tool. */
    public static final class Draggable {
        private final String id;
        private final View view;
        private final List<HitZone> zones = new ArrayList<>(2);
        private DropBehavior behavior = DropBehavior.SNAP_AND_RELEASE;
        private Gesture gesture = Gesture.NONE;
        private float gestureTarget = 1f;
        private long holdDuration = 1500L;
        private float snapScale = 1f;
        private float focusX = 0.5f;
        private float focusY = 0.5f;
        private int snapOffsetX;
        private int snapOffsetY;
        private float magnet = 0.22f;
        private Listener listener;

        Draggable(String id, View view) {
            this.id = id;
            this.view = view;
        }

        /** Identity, for a {@link Listener} that handles several tools. */
        public String getId() { return id; }

        /** The tray tool this draggable was registered with. */
        public View getView() { return view; }
    }

    /** Builder-style configuration for {@link #registerDraggable}. */
    public static final class Options {
        private DropBehavior behavior = DropBehavior.SNAP_AND_RELEASE;
        private Gesture gesture = Gesture.NONE;
        private float gestureTargetPx = -1f;
        private long holdDuration = 1500L;
        private float snapScale = 1f;
        private float focusX = 0.5f;
        private float focusY = 0.5f;
        private int snapOffsetX;
        private int snapOffsetY;
        private float magnet = 0.22f;
        private Listener listener;

        public Options behavior(DropBehavior value) { this.behavior = value; return this; }
        public Options gesture(Gesture value) { this.gesture = value; return this; }
        /** Rub distance that fills the gesture; defaults to a density-scaled per-gesture value. */
        public Options gestureTargetPx(float px) { this.gestureTargetPx = px; return this; }
        public Options holdDuration(long ms) { this.holdDuration = ms; return this; }
        public Options snapScale(float value) { this.snapScale = value; return this; }
        /** Point of the tool that must land on the target, as a fraction of its own size. */
        public Options focus(float xFraction, float yFraction) {
            this.focusX = xFraction;
            this.focusY = yFraction;
            return this;
        }
        public Options snapOffset(int dxPx, int dyPx) {
            this.snapOffsetX = dxPx;
            this.snapOffsetY = dyPx;
            return this;
        }
        /** 0 disables the pull towards the zone center; 1 would teleport the tool there. */
        public Options magnet(float value) { this.magnet = value; return this; }
        public Options listener(Listener value) { this.listener = value; return this; }
    }

    /** Lets the game plug its SoundPool in without the controller depending on it. */
    public interface PickupSfx {
        void onPickup();

        void onZoneEnter();

        void onDrop();
    }

    public interface Haptics {
        void tick();
    }

    /** Fired on every {@code ACTION_DOWN}, whether or not it started a drag. */
    public interface InteractionListener {
        void onInteraction();
    }

    // ---------------------------------------------------------------- config

    private static final float LIFT_SCALE = 1.12f;
    private static final float MAX_TILT_DEG = 11f;
    private static final long SNAP_DURATION = 170L;
    private static final long SNAP_BACK_DURATION = 280L;
    /** Safety net: a sticky gesture that goes nowhere is released after this long. */
    private static final long GESTURE_TIMEOUT_MS = 20_000L;
    /** How fast a HOLD ring bleeds back down when the tool leaves the target (~60 fps). */
    private static final float HOLD_DECAY_PER_FRAME = 0.012f;

    private final ViewGroup root;
    private final ViewGroup dragLayer;
    private final Map<String, Draggable> draggables = new HashMap<>(4);
    private final Rect ghostRect = new Rect();
    private final Rect scratch = new Rect();
    private final int touchSlop;

    private Listener globalListener;
    private PickupSfx pickupSfx;
    private Haptics haptics;
    private InteractionListener interactionListener;
    private boolean enabled = true;
    private long lastInteractionAt;

    private Draggable pending;
    private float downX;
    private float downY;
    private Session session;

    private final ViewTreeObserver.OnPreDrawListener preDraw = new ViewTreeObserver.OnPreDrawListener() {
        @Override
        public boolean onPreDraw() {
            Session s = session;
            if (s == null) {
                return true;
            }
            if (s.pendingMove && s.ghost != null) {
                s.pendingMove = false;
                placeGhost(s, s.wantX, s.wantY);
            }
            if (s.finished) {
                return true;
            }
            // Two cases need a frame tick rather than touch events:
            //  1. a parked (sticky) tool must keep tracking the zone underneath it;
            //  2. a HOLD gesture must keep filling while the finger is perfectly still — a
            //     stationary finger produces no ACTION_MOVE events at all.
            Draggable d = s.draggable;
            boolean holdWhileDragging = !s.sticky && s.fingerDown
                    && d.behavior == DropBehavior.SNAP_AND_STICK
                    && d.gesture == Gesture.HOLD;
            if (s.sticky || holdWhileDragging) {
                tickSticky(s);
            }
            return true;
        }
    };

    public DragController(ViewGroup root, ViewGroup dragLayer) {
        this.root = root;
        this.dragLayer = dragLayer;
        this.touchSlop = ViewConfiguration.get(root.getContext()).getScaledTouchSlop();
        this.lastInteractionAt = System.currentTimeMillis();
    }

    public void setGlobalListener(Listener listener) { this.globalListener = listener; }
    public void setPickupSfx(PickupSfx sfx) { this.pickupSfx = sfx; }
    public void setHaptics(Haptics value) { this.haptics = value; }

    public void setInteractionListener(InteractionListener value) { this.interactionListener = value; }

    /** Master switch — freezes input while a celebration or a mini-game is on screen. */
    public void setEnabled(boolean value) {
        this.enabled = value;
        if (!value) {
            cancelDrag(false);
        }
    }

    public boolean isDragging() { return session != null; }

    /** Timestamp of the last touch the controller saw; drives the idle-hint system. */
    public long getLastInteractionTime() { return lastInteractionAt; }

    public boolean isIdleFor(long millis) {
        return System.currentTimeMillis() - lastInteractionAt >= millis;
    }

    // ---------------------------------------------------------------- registration

    public Draggable registerDraggable(String id, View view, List<HitZone> zones, Options options) {
        unregisterDraggable(id);
        Draggable draggable = new Draggable(id, view);
        if (zones != null) {
            for (int i = 0; i < zones.size(); i++) {
                HitZone zone = zones.get(i);
                if (zone != null) {
                    draggable.zones.add(zone);
                }
            }
        }
        Options opts = options != null ? options : new Options();
        draggable.behavior = opts.behavior;
        draggable.gesture = opts.gesture;
        draggable.holdDuration = opts.holdDuration;
        draggable.snapScale = opts.snapScale;
        draggable.focusX = opts.focusX;
        draggable.focusY = opts.focusY;
        draggable.snapOffsetX = opts.snapOffsetX;
        draggable.snapOffsetY = opts.snapOffsetY;
        draggable.magnet = opts.magnet;
        draggable.listener = opts.listener;
        draggable.gestureTarget = opts.gestureTargetPx > 0f
                ? opts.gestureTargetPx
                : defaultGestureTarget(draggable.gesture);
        draggables.put(id, draggable);
        return draggable;
    }

    public void unregisterDraggable(String id) {
        Draggable existing = draggables.remove(id);
        if (existing != null && session != null && session.draggable == existing) {
            cancelDrag(false);
        }
    }

    public void unregisterAll() {
        cancelDrag(false);
        draggables.clear();
    }

    /** Live zones of the running session — the hint system aims at the first enabled one. */
    public List<HitZone> getActiveZones() {
        if (session != null) {
            return session.draggable.zones;
        }
        for (Draggable draggable : draggables.values()) {
            if (!draggable.zones.isEmpty()) {
                return draggable.zones;
            }
        }
        return null;
    }

    private float defaultGestureTarget(Gesture gesture) {
        float density = root.getResources().getDisplayMetrics().density;
        switch (gesture) {
            case RUB_HORIZONTAL: return 380f * density;
            case RUB_VERTICAL:  return 460f * density;
            case RUB_FREE:       return 520f * density;
            default:             return 1f;
        }
    }

    // ---------------------------------------------------------------- touch entry point

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        lastInteractionAt = System.currentTimeMillis();
        if (event.getActionMasked() == MotionEvent.ACTION_DOWN && interactionListener != null) {
            // Any touch anywhere counts as "the player is awake", so a visible hint hides at once
            // instead of finishing its bounce.
            interactionListener.onInteraction();
        }
        if (!enabled) {
            return false;
        }
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                return onDown(event);
            case MotionEvent.ACTION_MOVE:
                return onMoveEvent(event);
            case MotionEvent.ACTION_UP:
                return onUp(event);
            case MotionEvent.ACTION_CANCEL:
                if (session != null) {
                    cancelDrag(true);
                }
                pending = null;
                return true;
            default:
                return false;
        }
    }

    private boolean onDown(MotionEvent event) {
        downX = event.getX();
        downY = event.getY();

        Session s = session;
        if (s != null) {
            if (!s.sticky || s.finished) {
                return false;
            }
            // Sticky standby: re-grab the parked tool wherever the finger lands.
            s.fingerDown = true;
            s.holdAnchorAt = 0L;
            s.grabDX = s.ghost != null ? s.ghost.getWidth() * s.draggable.focusX : s.grabDX;
            s.grabDY = s.ghost != null ? s.ghost.getHeight() * s.draggable.focusY : s.grabDY;
            s.rubLastX = ghostCenterX(s);
            s.rubLastY = ghostCenterY(s);
            return true;
        }

        if (draggables.isEmpty()) {
            return false;
        }
        int x = Math.round(event.getX());
        int y = Math.round(event.getY());
        for (Draggable draggable : draggables.values()) {
            View view = draggable.view;
            if (view == null || view.getVisibility() != View.VISIBLE || view.getAlpha() < 0.1f) {
                continue;
            }
            DragDropHelper.rectIn(view, root, scratch);
            scratch.inset(-touchSlop, -touchSlop); // forgiving grab area
            if (scratch.contains(x, y)) {
                pending = draggable;
                notifyPickupArmed(draggable, event.getRawX(), event.getRawY());
                return true;
            }
        }
        return false;
    }

    private boolean onMoveEvent(MotionEvent event) {
        Session s = session;
        if (s != null && !s.finished) {
            onMove(s, event);
            return true;
        }
        if (pending != null && passedSlop(event)) {
            startDrag(event);
            return true;
        }
        return false;
    }

    private boolean onUp(MotionEvent event) {
        Session s = session;
        boolean wasBusy = s != null || pending != null;
        pending = null;
        if (s == null || s.finished) {
            return wasBusy;
        }
        if (s.draggable.behavior == DropBehavior.SNAP_AND_STICK && s.draggable.gesture != Gesture.NONE) {
            // Park the tool on its target and wait for the next swipe. HOLD gestures keep filling
            // only while the finger is down, which is exactly what "hold the dryer there" means.
            if (s.currentZone == null) {
                s.currentZone = DragDropHelper.bestHit(ghostRect, s.draggable.zones);
            }
            if (s.currentZone == null) {
                notifyDropMissed(s.draggable);
                animateSnapBack(s);
            } else if (!s.sticky) {
                beginSticky(s, s.currentZone);
            } else {
                // Already parked: the finger just lifted, so a HOLD ring starts bleeding down.
                s.fingerDown = false;
                s.holdAnchorAt = 0L;
            }
            return true;
        }
        resolveDrop(s);
        return true;
    }

    private boolean passedSlop(MotionEvent event) {
        float dx = event.getX() - downX;
        float dy = event.getY() - downY;
        return dx * dx + dy * dy > touchSlop * touchSlop;
    }

    // ---------------------------------------------------------------- session

    /** Mutable per-drag state. */
    private static final class Session {
        Draggable draggable;
        ImageView ghost;
        int ghostW;
        int ghostH;
        /** Where the finger grabbed the tool, in drag-layer coordinates. */
        float grabDX;
        float grabDY;
        /** Desired top-left of the ghost; applied on the next pre-draw pass. */
        int wantX;
        int wantY;
        boolean pendingMove;
        /** Tool center in root coordinates at the last move — used for rub distance. */
        float rubLastX;
        float rubLastY;
        boolean sticky;
        boolean fingerDown;
        boolean finished;

        HitZone currentZone;
        float rubAccum;
        int lastDirX;
        int lastDirY;
        float lastLayerX;
        float lastLayerY;
        float smoothedVX;
        float holdProgress;
        long holdAnchorAt;
        long stickyStartAt;
        ValueAnimator snapAnimator;

        /** Tool center in the drag layer, for the snap-back flight. */
        int homeX;
        int homeY;
    }

    private void startDrag(MotionEvent event) {
        Draggable draggable = pending;
        pending = null;
        if (draggable == null || draggable.view == null || session != null) {
            return;
        }

        Session s = new Session();
        s.draggable = draggable;
        s.fingerDown = true;
        s.stickyStartAt = System.currentTimeMillis();

        View source = draggable.view;
        s.ghostW = Math.max(1, source.getWidth());
        s.ghostH = Math.max(1, source.getHeight());

        ImageView ghost = new ImageView(dragLayer.getContext());
        ghost.setScaleType(source instanceof ImageView
                ? ((ImageView) source).getScaleType()
                : ImageView.ScaleType.FIT_CENTER);
        Drawable drawable = source instanceof ImageView
                ? ((ImageView) source).getDrawable()
                : source.getBackground();
        ghost.setImageDrawable(drawable != null ? drawable.mutate() : null);
        ghost.setLayoutParams(new ViewGroup.LayoutParams(s.ghostW, s.ghostH));
        ghost.setPivotX(s.ghostW * draggable.focusX);
        ghost.setPivotY(s.ghostH * draggable.focusY);
        ghost.setScaleX(LIFT_SCALE);
        ghost.setScaleY(LIFT_SCALE);
        s.ghost = ghost;

        // Remember where the tool lives in the tray so it can fly back there.
        DragDropHelper.rectIn(source, dragLayer, scratch);
        s.homeX = scratch.centerX();
        s.homeY = scratch.centerY();

        dragLayer.addView(ghost);
        source.setAlpha(0f);

        s.grabDX = draggable.focusX * s.ghostW;
        s.grabDY = draggable.focusY * s.ghostH;

        session = s;
        dragLayer.getViewTreeObserver().addOnPreDrawListener(preDraw);

        float layerX = toLayerX(event.getX());
        float layerY = toLayerY(event.getY());
        s.lastLayerX = layerX;
        s.lastLayerY = layerY;
        s.rubLastX = layerX;
        s.rubLastY = layerY;
        placeGhost(s, Math.round(layerX - s.grabDX), Math.round(layerY - s.grabDY));

        if (pickupSfx != null) {
            pickupSfx.onPickup();
        }
        if (haptics != null) {
            haptics.tick();
        }
        notifyDragStarted(draggable, ghost);
    }

    private float toLayerX(float rootX) {
        return rootX + root.getLeft() - dragLayer.getLeft() + root.getTranslationX() - dragLayer.getTranslationX();
    }

    private float toLayerY(float rootY) {
        return rootY + root.getTop() - dragLayer.getTop() + root.getTranslationY() - dragLayer.getTranslationY();
    }

    /** Positions the ghost by explicit layout (so its hit rect is exact) and clamps it on screen. */
    private void placeGhost(Session s, int x, int y) {
        ImageView ghost = s.ghost;
        if (ghost == null || ghost.getParent() == null) {
            return;
        }
        int w = Math.max(1, dragLayer.getWidth());
        int h = Math.max(1, dragLayer.getHeight());
        int minX = -(s.ghostW / 2);
        int minY = -(s.ghostH / 2);
        int maxX = Math.max(minX, w - s.ghostW / 2);
        int maxY = Math.max(minY, h - s.ghostH / 2);
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));
        s.wantX = x;
        s.wantY = y;
        ghost.layout(x, y, x + s.ghostW, y + s.ghostH);
        ghostRect.set(x, y, x + s.ghostW, y + s.ghostH);
    }

    private float ghostCenterX(Session s) {
        return s.wantX + s.ghostW / 2f;
    }

    private float ghostCenterY(Session s) {
        return s.wantY + s.ghostH / 2f;
    }

    private void onMove(Session s, MotionEvent event) {
        float layerX = toLayerX(event.getX());
        float layerY = toLayerY(event.getY());
        Draggable draggable = s.draggable;

        if (s.sticky) {
            // Only count movement while the finger is actually down on the parked tool.
            moveGhostTo(s, layerX, layerY);
            updateGesture(s, layerX, layerY);
            return;
        }

        // Tilt from smoothed horizontal velocity: cheap, and it sells "held by a hand".
        float vx = layerX - s.lastLayerX;
        s.smoothedVX = s.smoothedVX * 0.6f + vx * 0.4f;
        float tilt = Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, s.smoothedVX * 0.9f));
        if (s.ghost != null) {
            s.ghost.setRotation(-tilt);
        }
        s.lastLayerX = layerX;
        s.lastLayerY = layerY;

        moveGhostTo(s, layerX, layerY);
        updateHit(s);

        // A SNAP_AND_STICK gesture keeps filling while the finger is still down, so the player never
        // has to release and press again to finish a step:
        //   - HOLD (hair dryer, powder) fills from the frame tick, because a perfectly still finger
        //     produces no ACTION_MOVE events at all;
        //   - RUB_* (tissue, cream, towel, brush) accumulate from the movement itself.
        // Rub distance is only counted once the tool is inside its zone, and only on direction
        // reversals for the axis-locked gestures, so the approach drag cannot solve the step.
        if (!s.finished && draggable.behavior == DropBehavior.SNAP_AND_STICK) {
            if (draggable.gesture == Gesture.HOLD) {
                tickSticky(s);
            } else if (draggable.gesture != Gesture.NONE && s.currentZone != null) {
                updateGesture(s, layerX, layerY);
            }
        }
    }

    private void moveGhostTo(Session s, float layerX, float layerY) {
        s.pendingMove = true;
        s.wantX = Math.round(layerX - s.grabDX);
        s.wantY = Math.round(layerY - s.grabDY);
        placeGhost(s, s.wantX, s.wantY);
    }

    /** Runs {@code Rect.intersects} against every active zone and reports enter/exit transitions. */
    private void updateHit(Session s) {
        HitZone best = DragDropHelper.bestHit(ghostRect, s.draggable.zones);
        if (best != s.currentZone) {
            s.currentZone = best;
            if (best != null) {
                if (haptics != null) {
                    haptics.tick();
                }
                if (pickupSfx != null) {
                    pickupSfx.onZoneEnter();
                }
            }
            notifyZoneChanged(s.draggable, best);
        }
        applyMagnet(s, best);
    }

    /**
     * Pulls the ghost towards the zone center by {@code magnet} of the remaining distance. The pull
     * is applied to the desired position rather than to the ghost directly, so the finger still
     * feels like it is in charge.
     */
    private void applyMagnet(Session s, HitZone zone) {
        float magnet = s.draggable.magnet;
        if (zone == null || magnet <= 0f) {
            return;
        }
        Rect bounds = zone.getBounds();
        float targetX = bounds.centerX() + s.draggable.snapOffsetX - s.grabDX;
        float targetY = bounds.centerY() + s.draggable.snapOffsetY - s.grabDY;
        float pullX = (targetX - s.wantX) * magnet;
        float pullY = (targetY - s.wantY) * magnet;
        if (Math.abs(pullX) < 0.5f && Math.abs(pullY) < 0.5f) {
            return;
        }
        s.pendingMove = true;
        placeGhost(s, Math.round(s.wantX + pullX), Math.round(s.wantY + pullY));
    }

    // ---------------------------------------------------------------- sticky gestures

    private void beginSticky(Session s, HitZone zone) {
        s.sticky = true;
        s.fingerDown = false;
        s.stickyStartAt = System.currentTimeMillis();
        s.holdAnchorAt = 0L;
        s.rubLastX = ghostCenterX(s);
        s.rubLastY = ghostCenterY(s);
        s.currentZone = zone;
        animateSnapTo(s, zone, false);
    }

    /**
     * Accumulates rub distance for the RUB_* gestures. Reached both while the tool is still being
     * dragged (as soon as it enters its zone) and after it has been parked on the target, so one
     * continuous wiping motion is enough to finish a step. HOLD gestures go through
     * {@link #tickSticky} instead.
     */
    private void updateGesture(Session s, float layerX, float layerY) {
        if (s.finished) {
            return;
        }
        Draggable draggable = s.draggable;
        Gesture gesture = draggable.gesture;

        // Keep tracking the zone under the tool: the player may drag it off target.
        HitZone zone = DragDropHelper.bestHit(ghostRect, draggable.zones);
        if (zone != s.currentZone) {
            s.currentZone = zone;
            notifyZoneChanged(draggable, zone);
        }
        boolean inside = zone != null;

        switch (gesture) {
            case RUB_HORIZONTAL: {
                float dx = layerX - s.rubLastX;
                s.rubLastX = layerX;
                s.rubLastY = layerY;
                if (inside) {
                    accumulateDirectional(s, Math.round(dx), 0, Math.abs(dx));
                }
                break;
            }
            case RUB_VERTICAL: {
                float dy = layerY - s.rubLastY;
                s.rubLastX = layerX;
                s.rubLastY = layerY;
                if (inside) {
                    accumulateDirectional(s, 0, Math.round(dy), Math.abs(dy));
                }
                break;
            }
            case RUB_FREE: {
                float dx = layerX - s.rubLastX;
                float dy = layerY - s.rubLastY;
                s.rubLastX = layerX;
                s.rubLastY = layerY;
                if (inside) {
                    s.rubAccum += (float) Math.hypot(dx, dy);
                }
                break;
            }
            case HOLD:
            default:
                s.rubLastX = layerX;
                s.rubLastY = layerY;
                break;
        }

        float progress = gestureProgress(s);
        notifyGestureProgress(draggable, progress);
        if (progress >= 1f) {
            completeGesture(s);
        } else if (System.currentTimeMillis() - s.stickyStartAt > GESTURE_TIMEOUT_MS) {
            // Nothing is happening — hand the tool back rather than soft-locking the step.
            animateSnapBack(s);
        }
    }

    /**
     * Per-frame tick for a parked (sticky) tool. This is what lets a HOLD gesture — the hair dryer
     * progress ring, the powder sprinkle — fill up while the finger is perfectly still, and it lets
     * progress bleed back off when the finger lifts or drifts away from the target.
     */
    private void tickSticky(Session s) {
        Draggable draggable = s.draggable;
        Gesture gesture = draggable.gesture;

        HitZone zone = DragDropHelper.bestHit(ghostRect, draggable.zones);
        if (zone != s.currentZone) {
            s.currentZone = zone;
            notifyZoneChanged(draggable, zone);
        }
        boolean inside = zone != null && s.fingerDown;

        if (gesture == Gesture.HOLD) {
            long now = System.currentTimeMillis();
            float total = Math.max(0.05f, draggable.holdDuration / 1000f);
            if (inside) {
                if (s.holdAnchorAt == 0L) {
                    s.holdAnchorAt = now;
                }
                float dt = (now - s.holdAnchorAt) / 1000f;
                s.holdAnchorAt = now;
                s.holdProgress = Math.min(1f, s.holdProgress + dt / total);
            } else {
                s.holdAnchorAt = 0L;
                // Bleed the ring back down instead of freezing it, so "hold it there" is real.
                s.holdProgress = Math.max(0f, s.holdProgress - HOLD_DECAY_PER_FRAME);
            }
        } else if (!inside) {
            // Rub gestures never lose accumulated distance, but they do time out.
            s.holdAnchorAt = 0L;
        }

        float progress = gestureProgress(s);
        notifyGestureProgress(draggable, progress);
        if (progress >= 1f) {
            completeGesture(s);
        } else if (System.currentTimeMillis() - s.stickyStartAt > GESTURE_TIMEOUT_MS) {
            animateSnapBack(s);
        }
    }

    /** Normalised 0..1 progress of the running sticky gesture. */
    private float gestureProgress(Session s) {
        if (s.draggable.gesture == Gesture.HOLD) {
            return Math.max(0f, Math.min(1f, s.holdProgress));
        }
        if (s.draggable.gesture == Gesture.NONE) {
            return 1f;
        }
        return Math.max(0f, Math.min(1f, s.rubAccum / Math.max(1f, s.draggable.gestureTarget)));
    }

    /**
     * Counts distance only when the movement direction flips, which turns "wipe" into a real
     * back-and-forth gesture instead of one long swipe in a single direction.
     */
    private void accumulateDirectional(Session s, int dirX, int dirY, float magnitude) {
        if (magnitude < 1.5f) {
            return;
        }
        boolean axisX = dirX != 0;
        int dir = axisX ? dirX : dirY;
        int last = axisX ? s.lastDirX : s.lastDirY;
        if (last != 0 && Integer.signum(dir) != Integer.signum(last)) {
            s.rubAccum += magnitude;
        }
        if (axisX) {
            s.lastDirX = dir;
        } else {
            s.lastDirY = dir;
        }
    }

    private void completeGesture(Session s) {
        if (s.finished) {
            return;
        }
        s.finished = true;
        if (pickupSfx != null) {
            pickupSfx.onDrop();
        }
        HitZone zone = s.currentZone != null
                ? s.currentZone
                : DragDropHelper.bestHit(ghostRect, s.draggable.zones);
        boolean solved = notifyDrop(s.draggable, zone);
        if (solved) {
            popGhost(s.ghost);
            endSession(s);
        } else {
            animateSnapBack(s);
        }
    }

    // ---------------------------------------------------------------- drop resolution

    private void resolveDrop(Session s) {
        s.finished = true;
        HitZone zone = s.currentZone != null
                ? s.currentZone
                : DragDropHelper.bestHit(ghostRect, s.draggable.zones);

        if (zone == null) {
            notifyDropMissed(s.draggable);
            animateSnapBack(s);
            return;
        }
        animateSnapTo(s, zone, true);
    }

    /** Flies the ghost onto the zone center, then either fires the drop or keeps it sticky. */
    private void animateSnapTo(final Session s, final HitZone zone, final boolean fireDrop) {
        final ImageView ghost = s.ghost;
        if (ghost == null || ghost.getParent() == null) {
            if (fireDrop) {
                boolean solved = notifyDrop(s.draggable, zone);
                if (solved) {
                    endSession(s);
                } else {
                    restoreSource(s.draggable);
                    endSession(s);
                }
            }
            return;
        }

        Rect bounds = zone.getBounds();
        final int toX = bounds.centerX() + s.draggable.snapOffsetX - s.ghostW / 2;
        final int toY = bounds.centerY() + s.draggable.snapOffsetY - s.ghostH / 2;
        final int fromX = s.wantX;
        final int fromY = s.wantY;

        ValueAnimator animator = ValueAnimator.ofFloat(0f, 1f);
        animator.setDuration(SNAP_DURATION);
        animator.setInterpolator(new OvershootInterpolator(1.1f));
        animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float t = (float) animation.getAnimatedValue();
                placeGhost(s, Math.round(fromX + (toX - fromX) * t), Math.round(fromY + (toY - fromY) * t));
                float scale = LIFT_SCALE + (s.draggable.snapScale - LIFT_SCALE) * t;
                ghost.setScaleX(scale);
                ghost.setScaleY(scale);
                ghost.setRotation(ghost.getRotation() * (1f - t));
            }
        });
        animator.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                if (s.snapAnimator == animation) {
                    s.snapAnimator = null;
                }
                if (pickupSfx != null) {
                    pickupSfx.onDrop();
                }
                if (!fireDrop) {
                    return; // sticky: session lives on, driven by updateGesture()
                }
                boolean solved = notifyDrop(s.draggable, zone);
                if (solved) {
                    popGhost(ghost);
                    endSession(s);
                } else {
                    animateSnapBack(s);
                }
            }

            @Override
            public void onAnimationCancel(Animator animation) {
                if (s.snapAnimator == animation) {
                    s.snapAnimator = null;
                }
            }
        });
        s.snapAnimator = animator;
        animator.start();
    }

    /**
     * The snap-back: the tool flies home into the tray hand along a shallow arc, shrinks back to
     * 1.0 on the way, and the source view fades in again when it lands.
     */
    public void animateSnapBack(final Session s) {
        if (s == null) {
            return;
        }
        s.finished = true;
        final ImageView ghost = s.ghost;
        final Draggable draggable = s.draggable;

        if (ghost == null || ghost.getParent() == null) {
            restoreSource(draggable);
            endSession(s);
            notifySnapBackFinished(draggable);
            return;
        }

        final int fromX = s.wantX;
        final int fromY = s.wantY;
        final int toX = s.homeX - s.ghostW / 2;
        final int toY = s.homeY - s.ghostH / 2;

        ValueAnimator animator = ValueAnimator.ofFloat(0f, 1f);
        animator.setDuration(SNAP_BACK_DURATION);
        animator.setInterpolator(new DecelerateInterpolator(1.4f));
        animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                float t = (float) animation.getAnimatedValue();
                placeGhost(s, Math.round(fromX + (toX - fromX) * t), Math.round(fromY + (toY - fromY) * t));
                // Shallow arc so the flight does not look robotic.
                ghost.setTranslationY((float) (-Math.sin(t * Math.PI) * s.ghostH * 0.18f));
                float scale = LIFT_SCALE + (1f - LIFT_SCALE) * t;
                ghost.setScaleX(scale);
                ghost.setScaleY(scale);
                ghost.setRotation(0f);
            }
        });
        animator.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                if (s.snapAnimator == animation) {
                    s.snapAnimator = null;
                }
                removeGhost(ghost);
                restoreSource(draggable);
                endSession(s);
                notifySnapBackFinished(draggable);
            }

            @Override
            public void onAnimationCancel(Animator animation) {
                if (s.snapAnimator == animation) {
                    s.snapAnimator = null;
                }
                removeGhost(ghost);
                restoreSource(draggable);
                endSession(s);
            }
        });
        s.snapAnimator = animator;
        animator.start();
    }

    /** Aborts the running drag; {@code snapBack} flies the tool home instead of deleting it. */
    public void cancelDrag(boolean snapBack) {
        Session s = session;
        pending = null;
        if (s == null) {
            return;
        }
        if (s.finished) {
            // Already resolved: a drop is animating (pop on success, flight home on a miss) and its
            // own callback will end the session. Tearing it down here would delete the ghost before
            // the success pop is ever drawn — which is exactly what happens when TaskManager freezes
            // input the instant a step is solved.
            return;
        }
        if (snapBack && !s.finished) {
            animateSnapBack(s);
            return;
        }
        s.finished = true;
        if (s.snapAnimator != null) {
            s.snapAnimator.cancel();
            s.snapAnimator = null;
        }
        removeGhost(s.ghost);
        restoreSource(s.draggable);
        endSession(s);
    }

    private void restoreSource(Draggable draggable) {
        if (draggable != null && draggable.view != null) {
            draggable.view.animate().alpha(1f).setDuration(120L).start();
        }
    }

    private void popGhost(ImageView ghost) {
        if (ghost == null) {
            return;
        }
        ghost.animate()
                .scaleX(1.3f).scaleY(1.3f).alpha(0f).rotation(0f).translationY(0f)
                .setDuration(170L)
                .setInterpolator(new DecelerateInterpolator())
                .withEndAction(new Runnable() {
                    @Override
                    public void run() {
                        removeGhost(ghost);
                    }
                })
                .start();
    }

    private void removeGhost(ImageView ghost) {
        if (ghost != null && ghost.getParent() == dragLayer) {
            dragLayer.removeView(ghost);
        }
    }

    private void endSession(Session s) {
        if (session == s) {
            session = null;
            dragLayer.getViewTreeObserver().removeOnPreDrawListener(preDraw);
        }
    }

    // ---------------------------------------------------------------- listener fan-out

    private void notifyPickupArmed(Draggable d, float rawX, float rawY) {
        if (d.listener != null) {
            d.listener.onPickupArmed(d, rawX, rawY);
        }
        if (globalListener != null) {
            globalListener.onPickupArmed(d, rawX, rawY);
        }
    }

    private void notifyDragStarted(Draggable d, View ghost) {
        if (d.listener != null) {
            d.listener.onDragStarted(d, ghost);
        }
        if (globalListener != null) {
            globalListener.onDragStarted(d, ghost);
        }
    }

    private void notifyZoneChanged(Draggable d, HitZone zone) {
        if (d.listener != null) {
            d.listener.onZoneChanged(d, zone);
        }
        if (globalListener != null) {
            globalListener.onZoneChanged(d, zone);
        }
    }

    private void notifyGestureProgress(Draggable d, float progress) {
        if (d.listener != null) {
            d.listener.onGestureProgress(d, progress);
        }
        if (globalListener != null) {
            globalListener.onGestureProgress(d, progress);
        }
    }

    private boolean notifyDrop(Draggable d, HitZone zone) {
        boolean solved = d.listener != null && d.listener.onDropOnTarget(d, zone);
        if (!solved && globalListener != null) {
            solved = globalListener.onDropOnTarget(d, zone);
        }
        return solved;
    }

    private void notifyDropMissed(Draggable d) {
        if (d.listener != null) {
            d.listener.onDropMissed(d);
        }
        if (globalListener != null) {
            globalListener.onDropMissed(d);
        }
    }

    private void notifySnapBackFinished(Draggable d) {
        if (d.listener != null) {
            d.listener.onSnapBackFinished(d);
        }
        if (globalListener != null) {
            globalListener.onSnapBackFinished(d);
        }
    }
}
