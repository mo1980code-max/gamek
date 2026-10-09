package com.gamek.daycare.view;

import android.content.Context;
import android.util.AttributeSet;
import android.view.Gravity;
import android.view.animation.OvershootInterpolator;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.gamek.daycare.R;

import java.util.ArrayList;
import java.util.List;

/**
 * Top HUD: one dot per step, filling left to right, plus a "Step 4 / 11" label.
 *
 * <p>Builds its own children, so the host layout only needs the single view. The dot count comes
 * from {@link #setTotalSteps} which reads {@code TaskStep.count()}, so adding a step to the enum
 * updates the HUD automatically.</p>
 */
public class TaskProgressHud extends LinearLayout {

    private final List<ImageView> dots = new ArrayList<>(12);
    private LinearLayout dotsRow;
    private TextView label;

    private int total;
    private int completed;

    public TaskProgressHud(Context context) {
        this(context, null);
    }

    public TaskProgressHud(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public TaskProgressHud(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        setOrientation(VERTICAL);
        setGravity(Gravity.CENTER_HORIZONTAL);
        buildChildren();
    }

    private void buildChildren() {
        dotsRow = new LinearLayout(getContext());
        dotsRow.setOrientation(HORIZONTAL);
        dotsRow.setGravity(Gravity.CENTER);
        LayoutParams rowLp = new LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        rowLp.gravity = Gravity.CENTER_HORIZONTAL;
        addView(dotsRow, rowLp);

        label = new TextView(getContext());
        label.setGravity(Gravity.CENTER);
        label.setTextColor(0xFF6D4C41);
        label.setTextSize(13f);
        label.setTypeface(label.getTypeface(), android.graphics.Typeface.BOLD);
        LayoutParams labelLp = new LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        labelLp.gravity = Gravity.CENTER_HORIZONTAL;
        labelLp.topMargin = dp(3);
        addView(label, labelLp);
    }

    /** Creates {@code count} dots, clearing any previous set. */
    public void setTotalSteps(int count) {
        total = Math.max(0, count);
        dotsRow.removeAllViews();
        dots.clear();
        int size = dp(11);
        int gap = dp(4);
        for (int i = 0; i < total; i++) {
            ImageView dot = new ImageView(getContext());
            dot.setImageResource(R.drawable.hud_dot_empty);
            dot.setScaleType(ImageView.ScaleType.FIT_CENTER);
            LayoutParams lp = new LayoutParams(size, size);
            lp.leftMargin = i == 0 ? 0 : gap;
            dotsRow.addView(dot, lp);
            dots.add(dot);
        }
        completed = 0;
        updateLabel();
    }

    /** Marks the step that just finished; {@code oneBasedStep} is the step number, not an index. */
    public void setCompletedSteps(int oneBasedStep) {
        int target = Math.max(0, Math.min(total, oneBasedStep));
        while (completed < target) {
            ImageView dot = dots.get(completed);
            dot.setImageResource(R.drawable.hud_dot_filled);
            popDot(dot);
            completed++;
        }
        while (completed > target) {
            completed--;
            dots.get(completed).setImageResource(R.drawable.hud_dot_empty);
        }
        updateLabel();
    }

    private void popDot(ImageView dot) {
        dot.setScaleX(0.4f);
        dot.setScaleY(0.4f);
        dot.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(260L)
                .setInterpolator(new OvershootInterpolator(3f))
                .start();
    }

    private void updateLabel() {
        if (label == null) {
            return;
        }
        int shown = Math.min(completed + 1, Math.max(1, total));
        label.setText(getResources().getString(R.string.hud_step_format, shown, Math.max(1, total)));
    }

    public void reset() {
        setCompletedSteps(0);
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
