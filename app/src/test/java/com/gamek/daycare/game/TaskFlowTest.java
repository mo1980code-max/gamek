package com.gamek.daycare.game;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Unit tests for the sequencing state machine.
 *
 * <p>{@link TaskFlow} and {@link TaskStep} are deliberately free of {@code android.*} imports, so
 * these run on the JVM with no emulator and no Robolectric — {@code ./gradlew test}.</p>
 */
public class TaskFlowTest {

    @Test
    public void startsOnTheFirstStep() {
        TaskFlow flow = new TaskFlow();

        assertSame(TaskStep.DIAPER_TO_TRASH, flow.current());
        assertEquals(0, flow.currentIndex());
        assertEquals(1, flow.currentNumber());
        assertEquals(TaskStep.count(), flow.totalSteps());
        assertFalse(flow.isFinished());
        assertEquals(0f, flow.overallProgress(), 0.0001f);
    }

    @Test
    public void theRoundHasElevenStepsInTheDocumentedOrder() {
        assertEquals(11, TaskStep.count());

        TaskStep[] expected = {
                TaskStep.DIAPER_TO_TRASH,
                TaskStep.FRESH_DIAPER,
                TaskStep.WIPE_NOSE,
                TaskStep.RASH_CREAM,
                TaskStep.BABY_POWDER,
                TaskStep.NAIL_CLIPPING,
                TaskStep.MEDICINE,
                TaskStep.WET_TOWEL,
                TaskStep.HAIR_DRYER,
                TaskStep.HAIR_BRUSH,
                TaskStep.PACIFIER,
        };
        assertArrayEquals(expected, TaskStep.values());
    }

    @Test
    public void walkingEveryStepCompletesExactlyOnce() {
        TaskFlow flow = new TaskFlow();

        for (int i = 0; i < TaskStep.count() - 1; i++) {
            assertEquals("step " + (i + 1) + " should advance",
                    TaskFlow.AdvanceResult.ADVANCED, flow.advance());
            assertFalse(flow.isFinished());
        }

        assertEquals(TaskStep.PACIFIER, flow.current());
        assertEquals(TaskFlow.AdvanceResult.COMPLETED, flow.advance());
        assertTrue(flow.isFinished());
        assertNull("a finished flow has no current step", flow.current());
        assertEquals(1f, flow.overallProgress(), 0.0001f);
    }

    @Test
    public void advancingPastTheEndIsIgnored() {
        TaskFlow flow = new TaskFlow();
        drain(flow);

        assertEquals(TaskFlow.AdvanceResult.ALREADY_FINISHED, flow.advance());
        assertEquals(TaskFlow.AdvanceResult.ALREADY_FINISHED, flow.advance());
        assertTrue(flow.isFinished());
    }

    @Test
    public void overallProgressTracksTheStepIndex() {
        TaskFlow flow = new TaskFlow();

        assertEquals(0f, flow.overallProgress(), 0.0001f);
        flow.advance();
        assertEquals(1f / TaskStep.count(), flow.overallProgress(), 0.0001f);
        flow.advance();
        assertEquals(2f / TaskStep.count(), flow.overallProgress(), 0.0001f);
    }

    @Test
    public void resetReturnsToStepOneAndKeepsTheStepList() {
        TaskFlow flow = new TaskFlow();
        drain(flow);
        assertTrue(flow.isFinished());

        flow.reset();

        assertFalse(flow.isFinished());
        assertSame(TaskStep.DIAPER_TO_TRASH, flow.current());
        assertEquals(1, flow.currentNumber());
        assertEquals(TaskFlow.AdvanceResult.ADVANCED, flow.advance());
        assertSame(TaskStep.FRESH_DIAPER, flow.current());
    }

    @Test
    public void stepNavigationHelpersAgreeWithTheEnumOrder() {
        assertTrue(TaskStep.DIAPER_TO_TRASH.isFirst());
        assertFalse(TaskStep.DIAPER_TO_TRASH.isLast());
        assertSame(TaskStep.FRESH_DIAPER, TaskStep.DIAPER_TO_TRASH.next());

        assertTrue(TaskStep.PACIFIER.isLast());
        assertNull("the last step has no successor", TaskStep.PACIFIER.next());

        assertEquals(6, TaskStep.NAIL_CLIPPING.getNumber());
    }

    @Test
    public void aCustomStepListIsHonoured() {
        TaskFlow flow = new TaskFlow(new TaskStep[]{TaskStep.WIPE_NOSE, TaskStep.PACIFIER});

        assertEquals(2, flow.totalSteps());
        assertSame(TaskStep.WIPE_NOSE, flow.current());
        assertEquals(TaskFlow.AdvanceResult.ADVANCED, flow.advance());
        assertSame(TaskStep.PACIFIER, flow.current());
        assertEquals(TaskFlow.AdvanceResult.COMPLETED, flow.advance());
        assertTrue(flow.isFinished());
    }

    @Test(expected = IllegalArgumentException.class)
    public void anEmptyStepListIsRejected() {
        new TaskFlow(new TaskStep[0]);
    }

    @Test
    public void currentNumberNeverExceedsTheStepCount() {
        TaskFlow flow = new TaskFlow();
        drain(flow);

        assertEquals(TaskStep.count(), flow.currentNumber());
    }

    private static void drain(TaskFlow flow) {
        while (!flow.isFinished()) {
            flow.advance();
        }
    }

    private static void assertArrayEquals(TaskStep[] expected, TaskStep[] actual) {
        assertEquals("step count", expected.length, actual.length);
        for (int i = 0; i < expected.length; i++) {
            assertSame("step " + i, expected[i], actual[i]);
        }
    }
}
