package com.gamek.daycare.audio;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.SoundPool;
import android.os.Build;
import android.util.Log;
import android.util.SparseIntArray;

import com.gamek.daycare.R;

/**
 * Tiny SoundPool wrapper for the game's short effects.
 *
 * <p>Why not {@code MediaPlayer}: these cues are 0.1–1.0 s, fire many times per second and must
 * overlap (pop + baby coo + sparkle on a single successful drop). {@link SoundPool} decodes them
 * into memory once and plays them with minimal latency.</p>
 *
 * <p>Streams are loaded asynchronously; {@link #play} before a load completes is a silent no-op
 * rather than a crash, which matters because the first task starts as soon as the tray slides in.</p>
 *
 * <pre>
 *   SoundPoolManager sfx = SoundPoolManager.create(context);   // in onCreate
 *   sfx.play(Sfx.POP);                                          // anywhere
 *   sfx.pause(); sfx.resume();                                  // onPause / onResume
 *   sfx.release();                                              // onDestroy
 * </pre>
 */
public final class SoundPoolManager {

    private static final String TAG = "SoundPoolManager";

    /** Everything the game can play. One enum constant == one file in {@code res/raw}. */
    public enum Sfx {
        POP(R.raw.sfx_pop, 1.0f),
        PICKUP(R.raw.sfx_pickup, 0.9f),
        SNAP(R.raw.sfx_snap, 1.0f),
        SPARKLE(R.raw.sfx_sparkle, 0.85f),
        WRONG(R.raw.sfx_wrong, 0.8f),
        WHOOSH(R.raw.sfx_whoosh, 0.7f),

        WIPE(R.raw.sfx_wipe, 0.8f),
        POWDER(R.raw.sfx_powder, 0.8f),
        DRYER(R.raw.sfx_dryer, 0.75f),
        SNIP(R.raw.sfx_snip, 1.0f),
        SIP(R.raw.sfx_sip, 0.9f),
        STICKER(R.raw.sfx_sticker, 0.9f),
        TRASH(R.raw.sfx_trash, 0.9f),
        BRUSH(R.raw.sfx_brush, 0.7f),

        BABY_COO(R.raw.sfx_baby_coo, 1.0f),
        BABY_GIGGLE(R.raw.sfx_baby_giggle, 1.0f),
        BABY_CRY(R.raw.sfx_baby_cry, 0.9f),

        STAR(R.raw.sfx_star, 1.0f),
        CELEBRATE(R.raw.sfx_celebrate, 1.0f),
        LEVEL_COMPLETE(R.raw.sfx_level_complete, 1.0f);

        final int resId;
        final float defaultVolume;

        Sfx(int resId, float defaultVolume) {
            this.resId = resId;
            this.defaultVolume = defaultVolume;
        }
    }

    private static final int MAX_STREAMS = 6;

    private final SoundPool pool;
    private final SparseIntArray loadedIds = new SparseIntArray(Sfx.values().length);

    private boolean muted;
    private float masterVolume = 1f;
    private int dryerStreamId;

    private SoundPoolManager(Context context) {
        this.pool = buildPool(context);
    }

    public static SoundPoolManager create(Context context) {
        SoundPoolManager manager = new SoundPoolManager(context.getApplicationContext());
        manager.loadAll(context.getApplicationContext());
        return manager;
    }

    @SuppressWarnings("deprecation")
    private static SoundPool buildPool(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            return new SoundPool.Builder()
                    .setMaxStreams(MAX_STREAMS)
                    .setAudioAttributes(attributes)
                    .build();
        }
        // minSdk is 21 so this branch is defensive only.
        return new SoundPool(MAX_STREAMS, AudioManager.STREAM_MUSIC, 0);
    }

    private void loadAll(final Context context) {
        pool.setOnLoadCompleteListener(new SoundPool.OnLoadCompleteListener() {
            @Override
            public void onLoadComplete(SoundPool soundPool, int sampleId, int status) {
                if (status != 0) {
                    Log.w(TAG, "Failed to load sampleId=" + sampleId + " status=" + status);
                    return;
                }
            }
        });
        for (Sfx sfx : Sfx.values()) {
            int sampleId = pool.load(context, sfx.resId, 1);
            loadedIds.put(sfx.resId, sampleId);
        }
    }

    /** Plays at the effect's default volume. */
    public void play(Sfx sfx) {
        play(sfx, sfx.defaultVolume, 1f);
    }

    /** Plays at an explicit volume, ignoring the global mute only when {@code force} is set. */
    public void play(Sfx sfx, float volume, float rate) {
        play(sfx, volume, rate, false);
    }

    public void play(Sfx sfx, float volume, float rate, boolean force) {
        if (sfx == null || pool == null || (muted && !force)) {
            return;
        }
        int sampleId = loadedIds.get(sfx.resId, 0);
        if (sampleId == 0) {
            return;
        }
        float v = clamp01(volume * masterVolume);
        int streamId = pool.play(sampleId, v, v, 1, 0, clampRate(rate));
        if (streamId == 0) {
            Log.w(TAG, "play() returned no stream for " + sfx);
        }
    }

    /**
     * Starts the hair-dryer loop. Safe to call repeatedly — an already running loop is left alone
     * so the sound does not stutter while the progress ring fills.
     */
    public void startDryerLoop() {
        if (muted || pool == null) {
            return;
        }
        if (dryerStreamId != 0) {
            return;
        }
        int sampleId = loadedIds.get(Sfx.DRYER.resId, 0);
        if (sampleId == 0) {
            return;
        }
        float v = clamp01(Sfx.DRYER.defaultVolume * masterVolume);
        dryerStreamId = pool.play(sampleId, v, v, 2, -1, 1f);
    }

    public void stopDryerLoop() {
        if (dryerStreamId != 0 && pool != null) {
            pool.stop(dryerStreamId);
            dryerStreamId = 0;
        }
    }

    /** Convenience for the drag controller's {@code PickupSfx} hook. */
    public boolean isMuted() {
        return muted;
    }

    public void setMuted(boolean value) {
        if (muted == value) {
            return;
        }
        muted = value;
        if (value) {
            stopDryerLoop();
            if (pool != null) {
                pool.autoPause();
            }
        } else if (pool != null) {
            pool.autoResume();
        }
    }

    public void toggleMute() {
        setMuted(!muted);
    }

    /** 0..1, scales every effect. */
    public void setMasterVolume(float volume) {
        this.masterVolume = clamp01(volume);
    }

    public void pause() {
        stopDryerLoop();
        if (pool != null) {
            pool.autoPause();
        }
    }

    public void resume() {
        if (pool != null && !muted) {
            pool.autoResume();
        }
    }

    /** Must be called from {@code onDestroy} — a SoundPool holds native resources. */
    public void release() {
        stopDryerLoop();
        if (pool != null) {
            pool.release();
        }
        loadedIds.clear();
    }

    private static float clamp01(float value) {
        return value < 0f ? 0f : (value > 1f ? 1f : value);
    }

    private static float clampRate(float rate) {
        return rate < 0.5f ? 0.5f : (rate > 2f ? 2f : rate);
    }
}
