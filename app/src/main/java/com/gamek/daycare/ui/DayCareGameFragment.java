package com.gamek.daycare.ui;

import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import com.gamek.daycare.R;
import com.gamek.daycare.audio.SoundPoolManager;
import com.gamek.daycare.game.TaskManager;
import com.gamek.daycare.game.TaskStep;
import com.gamek.daycare.input.DragController;
import com.gamek.daycare.ui.mini.MiniGameFragment;
import com.gamek.daycare.ui.mini.NailClipGameFragment;
import com.gamek.daycare.view.BabyScene;
import com.gamek.daycare.view.CompletionOverlay;
import com.gamek.daycare.view.HintController;
import com.gamek.daycare.view.ParticleEmitterView;
import com.gamek.daycare.view.TaskProgressHud;
import com.gamek.daycare.view.TrayController;

/**
 * The game screen. One fragment, one round.
 *
 * <p>Its job is wiring, not logic: it builds the {@link DragController}, the {@link HintController}
 * and the {@link TaskManager}, hands them the views they need, and implements the two host
 * interfaces — {@link TaskManager.Host} for things only a Fragment can do (show the celebration,
 * add a mini-game fragment) and {@link MiniGameFragment.Host} for mini-game results.</p>
 *
 * <p>All eleven steps live in {@code TaskManager}; nothing here changes when a step is added.</p>
 */
public class DayCareGameFragment extends Fragment implements TaskManager.Host, MiniGameFragment.Host {

    private FrameLayout root;
    private FrameLayout dragLayer;
    private FrameLayout hintLayer;
    private BabyScene baby;
    private TrayController tray;
    private ParticleEmitterView fx;
    private TaskProgressHud hud;
    private ProgressBar stepProgress;
    private TextView hintText;
    private CompletionOverlay completionOverlay;
    private ImageView soundButton;

    private DragController dragController;
    private HintController hintController;
    private TaskManager taskManager;
    private SoundPoolManager sound;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_daycare_game, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        bindViews(view);
        buildControllers();
        wireUi();

        // The tray measures its own hidden offset during layout, so the first slide-in has to wait
        // one frame or it would snap into place instead of animating.
        root.post(new Runnable() {
            @Override
            public void run() {
                if (taskManager != null && isAdded()) {
                    taskManager.start();
                }
            }
        });
    }

    private void bindViews(@NonNull View view) {
        root = view.findViewById(R.id.game_root);
        dragLayer = view.findViewById(R.id.drag_layer);
        hintLayer = view.findViewById(R.id.hint_layer);
        baby = view.findViewById(R.id.baby_scene);
        tray = view.findViewById(R.id.tray);
        fx = view.findViewById(R.id.fx_layer);
        hud = view.findViewById(R.id.task_hud);
        stepProgress = view.findViewById(R.id.step_progress);
        hintText = view.findViewById(R.id.hint_text);
        completionOverlay = view.findViewById(R.id.completion_overlay);
        soundButton = view.findViewById(R.id.btn_sound);
    }

    private void buildControllers() {
        sound = SoundPoolManager.create(requireContext());

        dragController = new DragController(root, dragLayer);
        dragController.setPickupSfx(new DragController.PickupSfx() {
            @Override
            public void onPickup() {
                sound.play(SoundPoolManager.Sfx.PICKUP);
            }

            @Override
            public void onZoneEnter() {
                // Quiet tick on entering a target: enough to confirm the hit without shouting.
                sound.play(SoundPoolManager.Sfx.POP, 0.4f, 1.25f);
            }

            @Override
            public void onDrop() {
                sound.play(SoundPoolManager.Sfx.SNAP);
            }
        });
        dragController.setHaptics(new DragController.Haptics() {
            @Override
            public void tick() {
                if (root != null) {
                    root.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY,
                            HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING);
                }
            }
        });
        dragController.setInteractionListener(new DragController.InteractionListener() {
            @Override
            public void onInteraction() {
                if (hintController != null) {
                    hintController.onUserInteraction();
                }
            }
        });
        // The controller owns every touch that no child consumed; the root must be clickable for
        // MOVE/UP to keep arriving (see the note in fragment_daycare_game.xml).
        root.setOnTouchListener(dragController);

        // The drag controller already tracks the last touch, so it is the idle source; adapting it
        // here keeps the input package free of any dependency on the view package.
        hintController = new HintController(hintLayer, new HintController.IdleSource() {
            @Override
            public boolean isIdleFor(long millis) {
                return dragController.isIdleFor(millis);
            }
        });
        taskManager = new TaskManager(this, root, dragLayer, hintLayer, baby,
                dragController, tray, fx, hud, sound, hintController);
        hintController.setProvider(taskManager);
        completionOverlay.setSound(sound);
    }

    private void wireUi() {
        completionOverlay.setListener(new CompletionOverlay.Listener() {
            @Override
            public void onPlayAgain() {
                completionOverlay.hide();
                if (taskManager != null) {
                    taskManager.restart();
                }
            }

            @Override
            public void onHome() {
                completionOverlay.hide();
                if (getActivity() != null) {
                    getActivity().finish();
                }
            }
        });

        soundButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sound.toggleMute();
                updateSoundIcon();
                if (!sound.isMuted()) {
                    sound.play(SoundPoolManager.Sfx.POP);
                }
            }
        });

        root.findViewById(R.id.btn_restart).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sound.play(SoundPoolManager.Sfx.POP);
                completionOverlay.hide();
                taskManager.restart();
            }
        });

        updateSoundIcon();
    }

    private void updateSoundIcon() {
        soundButton.setImageResource(sound.isMuted() ? R.drawable.ic_sound_off : R.drawable.ic_sound_on);
    }

    // ---------------------------------------------------------------- lifecycle

    @Override
    public void onResume() {
        super.onResume();
        sound.resume();
        if (taskManager != null) {
            taskManager.resume();
        }
    }

    @Override
    public void onPause() {
        if (taskManager != null) {
            taskManager.pause();
        }
        sound.pause();
        super.onPause();
    }

    @Override
    public void onDestroyView() {
        if (taskManager != null) {
            taskManager.destroy();
            taskManager = null;
        }
        if (hintController != null) {
            hintController.onDestroy();
            hintController = null;
        }
        if (completionOverlay != null) {
            completionOverlay.release();
        }
        if (root != null) {
            root.setOnTouchListener(null);
        }
        if (dragController != null) {
            dragController.unregisterAll();
            dragController = null;
        }
        if (tray != null) {
            tray.release();
        }
        sound.release();
        sound = null;
        super.onDestroyView();
    }

    // ---------------------------------------------------------------- TaskManager.Host

    @Override
    public void showCompletion(int stars) {
        completionOverlay.show(stars);
    }

    @Override
    public void launchMiniGame(String miniGameId) {
        FragmentManager fm = getChildFragmentManager();
        if (fm.isStateSaved() || MiniGameFragment.isShowing(fm)) {
            return;
        }
        MiniGameFragment fragment = createMiniGame(miniGameId);
        if (fragment == null) {
            return;
        }
        fm.beginTransaction()
                .add(R.id.mini_game_container, fragment, MiniGameFragment.TAG)
                .addToBackStack(MiniGameFragment.TAG)
                .commit();
    }

    /** Mini-game registry: add a case here when a new popup game is written. */
    @Nullable
    private MiniGameFragment createMiniGame(String miniGameId) {
        if (MiniGameFragment.ID_NAIL_CLIP.equals(miniGameId)) {
            return new NailClipGameFragment();
        }
        return null;
    }

    @Override
    public boolean isMiniGameShowing() {
        return MiniGameFragment.isShowing(getChildFragmentManager());
    }

    @Override
    public void onStepProgress(TaskStep step, float progress) {
        if (stepProgress == null) {
            return;
        }
        int value = Math.round(Math.max(0f, Math.min(1f, progress)) * 100f);
        if (stepProgress.getProgress() != value) {
            stepProgress.setProgress(value);
        }
    }

    @Override
    public void onHintTextChanged(CharSequence text) {
        if (hintText == null) {
            return;
        }
        hintText.setText(text);
        // Small pop so the eye is drawn to the new instruction.
        hintText.animate().cancel();
        hintText.setScaleX(0.86f);
        hintText.setScaleY(0.86f);
        hintText.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(260L)
                .setInterpolator(new OvershootInterpolator(2.2f))
                .start();
    }

    // ---------------------------------------------------------------- MiniGameFragment.Host

    @Override
    public void onMiniGameFinished(String miniGameId, boolean success) {
        if (taskManager != null) {
            taskManager.onMiniGameFinished(miniGameId, success);
        }
    }

    @Nullable
    @Override
    public SoundPoolManager provideSound() {
        return sound;
    }
}
