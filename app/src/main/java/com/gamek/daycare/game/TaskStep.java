package com.gamek.daycare.game;

import com.gamek.daycare.R;

/**
 * The eleven sequential steps of one daycare round, in the exact order the player meets them.
 *
 * <p>Order is the contract: {@link TaskFlow} simply walks {@code values()} from left to right, and
 * {@link com.gamek.daycare.game.TaskManager} maps each constant onto a {@code GameTask} subclass.
 * To re-order the round or add a step, edit this enum and add one case to
 * {@code TaskManager#createTask}.</p>
 */
public enum TaskStep {

    DIAPER_TO_TRASH(R.string.task_diaper_trash, R.drawable.tool_diaper_dirty),
    FRESH_DIAPER(R.string.task_fresh_diaper, R.drawable.tool_diaper_clean),
    WIPE_NOSE(R.string.task_wipe_nose, R.drawable.tool_tissue),
    RASH_CREAM(R.string.task_rash_cream, R.drawable.tool_rash_cream),
    BABY_POWDER(R.string.task_baby_powder, R.drawable.tool_powder),
    NAIL_CLIPPING(R.string.task_nail_clip, R.drawable.tool_nail_clipper),
    MEDICINE(R.string.task_medicine, R.drawable.tool_medicine_spoon),
    WET_TOWEL(R.string.task_wet_towel, R.drawable.tool_towel),
    HAIR_DRYER(R.string.task_hair_dryer, R.drawable.tool_hair_dryer),
    HAIR_BRUSH(R.string.task_hair_brush, R.drawable.tool_hair_brush),
    PACIFIER(R.string.task_pacifier, R.drawable.tool_pacifier);

    private final int hintStringRes;
    private final int toolDrawableRes;

    TaskStep(int hintStringRes, int toolDrawableRes) {
        this.hintStringRes = hintStringRes;
        this.toolDrawableRes = toolDrawableRes;
    }

    /** Short imperative shown in the HUD bubble and spoken by the hint system. */
    public int getHintStringRes() {
        return hintStringRes;
    }

    /** Artwork the tray hand holds for this step. */
    public int getToolDrawableRes() {
        return toolDrawableRes;
    }

    /** 1-based position, for "Step 4 of 11" style HUD copy. */
    public int getNumber() {
        return ordinal() + 1;
    }

    public boolean isFirst() {
        return ordinal() == 0;
    }

    public boolean isLast() {
        return ordinal() == values().length - 1;
    }

    /** The next step, or {@code null} when the round is over. */
    public TaskStep next() {
        return isLast() ? null : values()[ordinal() + 1];
    }

    public static int count() {
        return values().length;
    }
}
