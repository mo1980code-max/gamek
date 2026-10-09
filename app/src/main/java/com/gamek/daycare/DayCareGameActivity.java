package com.gamek.daycare;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.fragment.app.Fragment;

import com.gamek.daycare.ui.DayCareGameFragment;

/**
 * Single-Activity host for the daycare game.
 *
 * <p>Deliberately thin. Everything the player sees lives in {@link DayCareGameFragment}; the
 * Activity only owns the things an Activity must own:</p>
 * <ul>
 *   <li>locked portrait orientation (also declared in the manifest, so it holds on every device);</li>
 *   <li>immersive fullscreen, re-applied whenever the window regains focus — the system bars come
 *       back on their own after a swipe, and a toddler swipe is exactly that;</li>
 *   <li>the screen-on flag, so the game does not dim mid-round;</li>
 * </ul>
 *
 * <p>Hardware back needs no override: androidx.fragment registers its own back-press callback for
 * any {@code FragmentManager} that has a back stack, so an open mini-game popup pops itself (and the
 * nail-clipping task then re-offers it). With nothing on the stack, back finishes the Activity as
 * usual.</p>
 */
public class DayCareGameActivity extends AppCompatActivity {

    private static final String TAG_GAME_FRAGMENT = "game";

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_daycare_game);
        enterImmersiveMode();

        if (savedInstanceState == null) {
            getSupportFragmentManager()
                    .beginTransaction()
                    .replace(R.id.fragment_container, newGameFragment(), TAG_GAME_FRAGMENT)
                    .commit();
        }
    }

    /**
     * The game fragment is created here rather than referenced by name in XML so that it stays
     * swappable (a level-select build can substitute another fragment without touching the layout).
     */
    @NonNull
    protected Fragment newGameFragment() {
        return new DayCareGameFragment();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            // The bars reappear after a system swipe or a notification shade pull; hide them again.
            enterImmersiveMode();
        }
    }

    /**
     * Hides every system bar and makes them transient, so a swipe reveals them briefly instead of
     * permanently shrinking the play area. {@link WindowInsetsControllerCompat} handles the API 30
     * split internally, which keeps this correct from API 21 up.
     */
    private void enterImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
