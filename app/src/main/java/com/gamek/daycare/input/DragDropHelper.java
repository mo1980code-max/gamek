package com.gamek.daycare.input;

import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;

import java.util.List;

/**
 * Coordinate-space helpers used by every hit test in the game.
 *
 * <p>A dragged tool lives in the top-most {@code DragLayer} while its targets live deep inside the
 * baby scene. Both rectangles are converted into the space of their nearest common ancestor before
 * {@link Rect#intersects} is called, so collision detection stays correct no matter how the views
 * are nested, translated or scaled.</p>
 *
 * <p>{@link ViewGroup#offsetDescendantRectToMyCoords} ignores {@code translationX/Y} (and is only
 * defined for real descendants), so {@link #rectIn} walks the chain itself and adds the translation
 * of every view on the way up. That matters a lot here: the whole game animates views with
 * translations.</p>
 */
public final class DragDropHelper {

    private DragDropHelper() {
    }

    /**
     * Returns the bounds of {@code view} expressed in {@code space}'s coordinate system,
     * including translation of {@code view} and of every ancestor between the two.
     *
     * @param out optional Rect to recycle; a new one is allocated when {@code null}.
     */
    public static Rect rectIn(View view, ViewGroup space, Rect out) {
        Rect rect = out != null ? out : new Rect();
        if (view == null) {
            rect.setEmpty();
            return rect;
        }
        rect.set(0, 0, view.getWidth(), view.getHeight());
        if (view == space) {
            return rect;
        }

        int dx = 0;
        int dy = 0;
        View current = view;
        while (current != null) {
            dx += current.getLeft() + Math.round(current.getTranslationX());
            dy += current.getTop() + Math.round(current.getTranslationY());
            ViewParent parent = current.getParent();
            if (parent == space || !(parent instanceof View)) {
                break;
            }
            current = (View) parent;
        }
        rect.offset(dx, dy);
        return rect;
    }

    /** True when {@code descendant} is {@code ancestor} itself or lives inside it. */
    public static boolean isDescendantOf(View descendant, ViewGroup ancestor) {
        if (descendant == null || ancestor == null) {
            return false;
        }
        if (descendant == ancestor) {
            return true;
        }
        ViewParent parent = descendant.getParent();
        while (parent != null) {
            if (parent == ancestor) {
                return true;
            }
            parent = parent.getParent();
        }
        return false;
    }

    /** Grows {@code rect} on all sides (negative {@code by} shrinks it). */
    public static void inflate(Rect rect, int by) {
        if (rect != null) {
            rect.inset(-by, -by);
        }
    }

    /** Overlap area in px²; 0 when the rects do not intersect. */
    public static int overlapArea(Rect a, Rect b) {
        if (a == null || b == null || !Rect.intersects(a, b)) {
            return 0;
        }
        return (Math.min(a.right, b.right) - Math.max(a.left, b.left))
                * (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    }

    /**
     * Picks the best target for {@code dragged} out of {@code zones}.
     *
     * <p>Scoring: a zone whose <em>center</em> is covered by the dragged rect always beats a zone
     * that merely overlaps — that is what makes "drop the pacifier in the mouth" feel precise
     * instead of lucky — and ties are broken by overlap area. Disabled and empty zones are
     * skipped. Returns {@code null} when nothing is hit.</p>
     */
    public static HitZone bestHit(Rect dragged, List<HitZone> zones) {
        if (dragged == null || zones == null || zones.isEmpty()) {
            return null;
        }
        int cx = dragged.centerX();
        int cy = dragged.centerY();

        HitZone best = null;
        long bestScore = Long.MIN_VALUE;
        for (int i = 0; i < zones.size(); i++) {
            HitZone zone = zones.get(i);
            if (zone == null || !zone.isEnabled()) {
                continue;
            }
            Rect target = zone.getBounds();
            if (target == null || target.isEmpty() || !Rect.intersects(dragged, target)) {
                continue;
            }
            boolean coversCenter = target.contains(cx, cy);
            long score = (coversCenter ? 1L << 40 : 0L) + overlapArea(dragged, target);
            if (score > bestScore) {
                bestScore = score;
                best = zone;
            }
        }
        return best;
    }
}
