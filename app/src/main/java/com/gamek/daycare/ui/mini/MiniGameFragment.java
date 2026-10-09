package com.gamek.daycare.ui.mini;

import android.content.Context;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

/**
 * Base class for the popup mini-games that a tray task can hand the screen to.
 *
 * <p>Kept deliberately small: a mini-game only has to know its own id and how to report a result.
 * The {@link Host} is the Activity, which forwards the result to
 * {@code TaskManager.onMiniGameFinished} — so a mini-game never talks to the task system directly
 * and can be reused in another round unchanged.</p>
 */
public abstract class MiniGameFragment extends Fragment {

    /** Stable ids, matched by {@code TaskManager} and by the Activity's launcher. */
    public static final String ID_NAIL_CLIP = "mini_nail_clip";

    /** Fragment tag, so the host can tell whether one is already showing. */
    public static final String TAG = "mini_game";

    /** Implemented by {@code DayCareGameActivity}. */
    public interface Host {
        void onMiniGameFinished(String miniGameId, boolean success);

        /** Shared pool, so a mini-game plays the same sounds as the rest of the round. */
        @Nullable
        com.gamek.daycare.audio.SoundPoolManager provideSound();
    }

    private Host host;

    /** The attached host; never {@code null} between {@code onAttach} and {@code onDetach}. */
    @Nullable
    protected Host host() {
        return host;
    }

    /** The id this fragment reports back with. */
    @NonNull
    public abstract String getMiniGameId();

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        if (context instanceof Host) {
            host = (Host) context;
        } else if (getParentFragment() instanceof Host) {
            host = (Host) getParentFragment();
        } else {
            throw new IllegalStateException(
                    "MiniGameFragment must be attached to a " + Host.class.getSimpleName());
        }
    }

    @Override
    public void onDetach() {
        host = null;
        super.onDetach();
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // A mini-game is a popup over a locked-portrait game: no state worth restoring.
        setRetainInstance(false);
    }

    /**
     * Reports the result and closes. Safe to call twice; only the first call reaches the host.
     */
    protected void finishWithResult(boolean success) {
        if (host != null) {
            host.onMiniGameFinished(getMiniGameId(), success);
        }
        dismissSelf();
    }

    /** Pops this fragment off the back stack. */
    protected void dismissSelf() {
        FragmentManager fm = getParentFragmentManager();
        if (fm.isStateSaved()) {
            // Committing now would throw; let the host remove us when it is safe again.
            return;
        }
        fm.popBackStack(TAG, FragmentManager.POP_BACK_STACK_INCLUSIVE);
    }

    /** True when a mini-game is currently added to {@code fm}. */
    public static boolean isShowing(@Nullable FragmentManager fm) {
        if (fm == null) {
            return false;
        }
        Fragment existing = fm.findFragmentByTag(TAG);
        return existing != null && existing.isAdded();
    }
}
