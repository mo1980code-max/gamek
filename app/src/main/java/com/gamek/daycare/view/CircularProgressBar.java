package com.gamek.daycare.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

/**
 * Progress indicator for the timed steps — the hair dryer ring that fills while you hold the dryer
 * over the hair, and the powder meter.
 *
 * <p>Draws either a circular arc or a vertical tube ({@link Mode}), which covers both variants the
 * game design asks for without two separate widgets. Values are set with {@link #setProgress} and
 * can optionally be smoothed, so a per-frame update from the drag controller does not look
 * jittery.</p>
 */
public class CircularProgressBar extends View {

    public enum Mode {
        /** Filling ring, starting at 12 o'clock. */
        CIRCLE,
        /** Filling tube, bottom to top. */
        VERTICAL
    }

    private static final int DEFAULT_TRACK_COLOR = 0x33000000;
    private static final int DEFAULT_PROGRESS_COLOR = 0xFF4FA8FF;
    private static final int DEFAULT_DONE_COLOR = 0xFF4BD6A0;
    private static final float SMOOTH_FACTOR = 0.28f;

    private final Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint progressPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint trackFillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint progressFillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF arcRect = new RectF();

    private Mode mode = Mode.CIRCLE;
    private float targetProgress;
    private float drawnProgress;
    private boolean smoothing = true;
    private boolean showLabel;
    private int progressColor = DEFAULT_PROGRESS_COLOR;
    private int doneColor = DEFAULT_DONE_COLOR;
    private float strokeDp = 12f;
    private float cornerDp = 10f;

    public CircularProgressBar(Context context) {
        this(context, null);
    }

    public CircularProgressBar(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public CircularProgressBar(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        float density = getResources().getDisplayMetrics().density;

        trackPaint.setStyle(Paint.Style.STROKE);
        trackPaint.setStrokeCap(Paint.Cap.ROUND);
        trackPaint.setColor(DEFAULT_TRACK_COLOR);
        trackPaint.setStrokeWidth(strokeDp * density);

        progressPaint.setStyle(Paint.Style.STROKE);
        progressPaint.setStrokeCap(Paint.Cap.ROUND);
        progressPaint.setColor(DEFAULT_PROGRESS_COLOR);
        progressPaint.setStrokeWidth(strokeDp * density);

        labelPaint.setTextAlign(Paint.Align.CENTER);
        labelPaint.setColor(0xFF37474F);
        labelPaint.setFakeBoldText(true);
        labelPaint.setTextSize(16f * density);

        trackFillPaint.setStyle(Paint.Style.FILL);
        trackFillPaint.setColor(DEFAULT_TRACK_COLOR);
        progressFillPaint.setStyle(Paint.Style.FILL);
        progressFillPaint.setColor(DEFAULT_PROGRESS_COLOR);
    }

    public void setMode(Mode value) {
        if (mode != value) {
            mode = value;
            invalidate();
        }
    }

    public Mode getMode() {
        return mode;
    }

    /** 0..1. With smoothing on, the ring eases towards this value over a few frames. */
    public void setProgress(float progress) {
        targetProgress = progress < 0f ? 0f : (progress > 1f ? 1f : progress);
        if (!smoothing) {
            drawnProgress = targetProgress;
        }
        invalidate();
    }

    public float getProgress() {
        return targetProgress;
    }

    /** When true the ring eases towards the value instead of jumping (nicer for per-frame input). */
    public void setSmoothing(boolean value) {
        smoothing = value;
        if (!value) {
            drawnProgress = targetProgress;
        }
        invalidate();
    }

    public void setProgressColor(int color) {
        progressColor = color;
        progressPaint.setColor(color);
        progressFillPaint.setColor(color);
        invalidate();
    }

    public void setTrackColor(int color) {
        trackPaint.setColor(color);
        trackFillPaint.setColor(color);
        invalidate();
    }

    /** Colour the ring switches to at 100%. */
    public void setDoneColor(int color) {
        this.doneColor = color;
    }

    public void setStrokeDp(float dp) {
        strokeDp = dp;
        float px = dp * getResources().getDisplayMetrics().density;
        trackPaint.setStrokeWidth(px);
        progressPaint.setStrokeWidth(px);
        requestLayout();
        invalidate();
    }

    /** Shows "63%" in the middle of the ring. Off by default — toddlers do not read. */
    public void setShowLabel(boolean value) {
        showLabel = value;
        invalidate();
    }

    public void reset() {
        targetProgress = 0f;
        drawnProgress = 0f;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        if (smoothing) {
            float diff = targetProgress - drawnProgress;
            if (Math.abs(diff) > 0.0015f) {
                drawnProgress += diff * SMOOTH_FACTOR;
                // Keep repainting until the eased value catches up.
                postInvalidateOnAnimation();
            } else {
                drawnProgress = targetProgress;
            }
        } else {
            drawnProgress = targetProgress;
        }

        float density = getResources().getDisplayMetrics().density;
        int color = drawnProgress >= 0.999f ? doneColor : progressColor;
        progressPaint.setColor(color);
        progressFillPaint.setColor(color);

        if (mode == Mode.CIRCLE) {
            drawCircle(canvas, density);
        } else {
            drawVertical(canvas, density);
        }

        if (showLabel && mode == Mode.CIRCLE) {
            canvas.drawText(Math.round(drawnProgress * 100) + "%",
                    getWidth() / 2f,
                    getHeight() / 2f - (labelPaint.descent() + labelPaint.ascent()) / 2f,
                    labelPaint);
        }
    }

    private void drawCircle(Canvas canvas, float density) {
        float stroke = strokeDp * density;
        float inset = stroke / 2f + density;
        arcRect.set(inset, inset, getWidth() - inset, getHeight() - inset);

        // Full ring as the track.
        canvas.drawArc(arcRect, 0f, 360f, false, trackPaint);
        if (drawnProgress > 0f) {
            canvas.drawArc(arcRect, -90f, 360f * drawnProgress, false, progressPaint);
        }
    }

    private void drawVertical(Canvas canvas, float density) {
        float radius = cornerDp * density;
        float left = getWidth() * 0.22f;
        float right = getWidth() * 0.78f;
        float top = density * 2f;
        float bottom = getHeight() - density * 2f;

        canvas.drawRoundRect(left, top, right, bottom, radius, radius, trackFillPaint);

        if (drawnProgress > 0f) {
            float fillTop = bottom - (bottom - top) * drawnProgress;
            canvas.drawRoundRect(left, fillTop, right, bottom, radius, radius, progressFillPaint);
        }
    }
}
