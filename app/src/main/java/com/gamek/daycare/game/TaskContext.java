package com.gamek.daycare.game;

import android.content.Context;
import android.view.View;
import android.view.ViewGroup;

import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.input.HitZone;
import com.gamek.daycare.view.BabyScene;
import com.gamek.daycare.view.ParticleEmitterView;
import com.gamek.daycare.view.TrayController;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Everything a {@link GameTask} is allowed to touch, bundled in one object.
 *
 * <p>Tasks never call {@code findViewById} and never reach into the Activity: they are handed this
 * context by {@link TaskManager}, which keeps them small, reusable and testable in isolation. It
 * also gives one obvious place to look when you want to know what a step can affect.</p>
 */
public final class TaskContext {

    /** Callbacks a task uses to talk back to the manager. */
    public interface Callbacks {
        /** The step is solved — the manager will celebrate and advance. */
        void onTaskCompleted(GameTask task);

        /** Per-step progress, 0..1, mirrored on the HUD ring. */
        void onTaskProgress(GameTask task, float progress);

        /**
         * Asks the Activity to show a blocking mini-game (nail clipping). The task stays paused
         * until the Activity calls {@code TaskManager.onMiniGameFinished(id, success)}.
         *
         * @param miniGameId stable id, e.g. {@link com.gamek.daycare.ui.mini.MiniGameFragment#ID_NAIL_CLIP}
         */
        void onLaunchMiniGame(GameTask task, String miniGameId);

        /** True while a mini-game fragment is on screen; tasks use it to avoid double-launching. */
        boolean isMiniGameShowing();

        /** Requests a one-shot confetti burst at a point in the FX layer. */
        void onBurstRequested(float xFraction, float yFraction);

        /** Baby reaction helper, so every task triggers the same face + sound pair. */
        void onBabyReaction(BabyScene.Mood mood);
    }

    public final Context context;
    public final ViewGroup root;
    public final ViewGroup dragLayer;
    public final ViewGroup hintLayer;
    public final BabyScene baby;
    public final DragController drag;
    public final TrayController tray;
    public final ParticleEmitterView fx;
    public final SoundPoolManager sound;
    public final Callbacks callbacks;
    public final float density;

    public TaskContext(Context context,
                       ViewGroup root,
                       ViewGroup dragLayer,
                       ViewGroup hintLayer,
                       BabyScene baby,
                       DragController drag,
                       TrayController tray,
                       ParticleEmitterView fx,
                       SoundPoolManager sound,
                       Callbacks callbacks) {
        this.context = context;
        this.root = root;
        this.dragLayer = dragLayer;
        this.hintLayer = hintLayer;
        this.baby = baby;
        this.drag = drag;
        this.tray = tray;
        this.fx = fx;
        this.sound = sound;
        this.callbacks = callbacks;
        this.density = context.getResources().getDisplayMetrics().density;
    }

    public int dp(float value) {
        return Math.round(value * density);
    }

    /** Convenience: a single-element zone list, which is what most steps need. */
    public static List<HitZone> zones(HitZone zone) {
        return Collections.singletonList(zone);
    }

    public static List<HitZone> zones(HitZone first, HitZone second) {
        return Arrays.asList(first, second);
    }

    /** The tool view the tray hand is currently holding. */
    public View toolView() {
        return tray != null ? tray.getToolView() : null;
    }
}
