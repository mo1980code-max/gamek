package com.gamek.daycare.input;

import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;

/**
 * A rectangular target zone on the baby / scene that a dragged tool can be dropped into.
 *
 * <p>A zone can be bound to a {@link View} (its bounds then follow the view automatically, even
 * while it animates), defined as fixed pixels inside a container, or defined as a fraction of a
 * container so the same task code works on every screen size.</p>
 *
 * <p>Zones can be padded — toddler-sized targets need to be forgiving — and enabled/disabled while
 * a task runs, e.g. the diaper stickers only become valid once the fresh diaper has been placed.</p>
 */
public final class HitZone {

    private final String id;

    private View anchor;
    private ViewGroup space;

    private final Rect manual = new Rect();
    private final Rect bounds = new Rect();

    private boolean fraction;
    private float fLeft;
    private float fTop;
    private float fRight;
    private float fBottom;

    private int padding;
    private boolean enabled = true;

    private HitZone(String id) {
        this.id = id;
    }

    /** Zone that tracks {@code anchor}; bounds are reported in {@code space}'s coordinates. */
    public static HitZone ofView(String id, View anchor, ViewGroup space) {
        HitZone zone = new HitZone(id);
        zone.anchor = anchor;
        if (space != null) {
            zone.space = space;
        } else if (anchor != null && anchor.getParent() instanceof ViewGroup) {
            zone.space = (ViewGroup) anchor.getParent();
        }
        return zone;
    }

    /** Zone with fixed pixel bounds inside {@code space}. */
    public static HitZone ofRect(String id, ViewGroup space, int left, int top, int right, int bottom) {
        HitZone zone = new HitZone(id);
        zone.space = space;
        zone.manual.set(left, top, right, bottom);
        return zone;
    }

    /**
     * Zone defined as a fraction (0..1) of {@code space}. Preferred for anything positioned on the
     * baby, because the baby artwork is laid out with proportional margins.
     */
    public static HitZone ofFraction(String id, ViewGroup space,
                                     float leftF, float topF, float rightF, float bottomF) {
        HitZone zone = new HitZone(id);
        zone.space = space;
        zone.fraction = true;
        zone.fLeft = leftF;
        zone.fTop = topF;
        zone.fRight = rightF;
        zone.fBottom = bottomF;
        return zone;
    }

    public String getId() {
        return id;
    }

    /** Adds (or subtracts, when negative) tolerance around the real bounds, in px. */
    public HitZone padding(int px) {
        this.padding = px;
        return this;
    }

    public HitZone enabled(boolean value) {
        this.enabled = value;
        return this;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public View getAnchor() {
        return anchor;
    }

    public ViewGroup getSpace() {
        return space;
    }

    /**
     * Recomputes and returns the current bounds in {@code space}'s coordinate system, including
     * padding. The returned Rect is owned by this zone — copy it if you need to keep it.
     */
    public Rect getBounds() {
        if (anchor != null && space != null) {
            DragDropHelper.rectIn(anchor, space, bounds);
        } else if (fraction && space != null) {
            int w = space.getWidth();
            int h = space.getHeight();
            bounds.set(Math.round(fLeft * w), Math.round(fTop * h),
                    Math.round(fRight * w), Math.round(fBottom * h));
        } else {
            bounds.set(manual);
        }
        if (padding != 0) {
            DragDropHelper.inflate(bounds, padding);
        }
        return bounds;
    }

    public boolean contains(int x, int y) {
        return getBounds().contains(x, y);
    }

    @Override
    public String toString() {
        return "HitZone{" + id + ", enabled=" + enabled + '}';
    }
}
