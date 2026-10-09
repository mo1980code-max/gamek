package com.gamek.daycare.game;

/**
 * Pure state machine for "which step is the player on".
 *
 * <p>Deliberately free of any {@code android.*} import so it can be unit-tested on the JVM
 * (see {@code app/src/test/.../TaskFlowTest.java}) and so the tray/hint/audio layers can reason
 * about progress without touching views.</p>
 */
public final class TaskFlow {

    /** Outcome of a request to move on to the next step. */
    public enum AdvanceResult {
        /** There is a next step and it is now current. */
        ADVANCED,
        /** The last step just finished; the level is complete. */
        COMPLETED,
        /** The flow was already finished; ignored. */
        ALREADY_FINISHED
    }

    private final TaskStep[] steps;
    private int index;
    private boolean finished;

    public TaskFlow() {
        this(TaskStep.values());
    }

    public TaskFlow(TaskStep[] steps) {
        if (steps == null || steps.length == 0) {
            throw new IllegalArgumentException("A TaskFlow needs at least one step");
        }
        this.steps = steps.clone();
        this.index = 0;
        this.finished = false;
    }

    /** The step the player is currently on, or {@code null} once the flow is finished. */
    public TaskStep current() {
        return finished ? null : steps[index];
    }

    /** 0-based position in the flow. */
    public int currentIndex() {
        return index;
    }

    /** 1-based position, clamped for display while finished. */
    public int currentNumber() {
        return Math.min(index + 1, steps.length);
    }

    public int totalSteps() {
        return steps.length;
    }

    /** 0..1 completion of the whole round; 1.0 once the last step is done. */
    public float overallProgress() {
        if (finished) {
            return 1f;
        }
        return (float) index / steps.length;
    }

    public boolean isFinished() {
        return finished;
    }

    public boolean isFirstStep() {
        return index == 0 && !finished;
    }

    /** Marks the current step done and moves on. Idempotent once finished. */
    public AdvanceResult advance() {
        if (finished) {
            return AdvanceResult.ALREADY_FINISHED;
        }
        if (index >= steps.length - 1) {
            finished = true;
            return AdvanceResult.COMPLETED;
        }
        index++;
        return AdvanceResult.ADVANCED;
    }

    /** Back to step 1, keeping the same step list (used by "Play again"). */
    public void reset() {
        index = 0;
        finished = false;
    }

    @Override
    public String toString() {
        return finished
                ? "TaskFlow{finished, " + steps.length + " steps}"
                : "TaskFlow{step " + currentNumber() + "/" + steps.length + " = " + current() + '}';
    }
}
