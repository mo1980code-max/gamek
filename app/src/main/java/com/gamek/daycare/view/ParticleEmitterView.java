package com.gamek.daycare.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.util.AttributeSet;
import android.view.Choreographer;
import android.view.View;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Dependency-free particle layer: confetti for the level-complete celebration, powder for the
 * baby-powder step, warm-air wisps for the hair dryer and sparkles for successful drops.
 *
 * <p>Particles are pooled (no allocation per frame), driven by {@link Choreographer} so the emitter
 * is synced to the display refresh, and the whole thing stops itself when it has nothing left to
 * draw — an idle {@code ParticleEmitterView} costs zero CPU and does not invalidate.</p>
 *
 * <p>Coordinates are given as fractions of the view (0..1) so tasks never need to know the screen
 * size.</p>
 */
public class ParticleEmitterView extends View {

    public enum Shape {
        CIRCLE,
        RECT,
        STAR,
        DROP
    }

    /** Celebration palette — bright primaries on a pastel background. */
    public static final int[] CONFETTI_COLORS = {
            0xFFFF5A7E, 0xFFFFC24B, 0xFF4BD6A0, 0xFF4FA8FF, 0xFFB57BFF, 0xFFFFF176
    };

    private static final int POOL_SIZE = 420;
    private static final float GRAVITY_DP = 900f;
    private static final long RAIN_INTERVAL_MS = 90L;

    private final List<Particle> pool = new ArrayList<>(POOL_SIZE);
    private final List<Particle> active = new ArrayList<>(POOL_SIZE);
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path starPath = new Path();
    private final Random random = new Random();

    private float gravityPx;
    private boolean running;
    private long lastFrameNanos;
    private boolean raining;
    private long rainUntil;

    private final Choreographer.FrameCallback frameCallback = new Choreographer.FrameCallback() {
        @Override
        public void doFrame(long frameTimeNanos) {
            if (!running) {
                return;
            }
            step(frameTimeNanos);
            if (!active.isEmpty() || raining) {
                Choreographer.getInstance().postFrameCallback(this);
            } else {
                running = false;
            }
        }
    };

    private final Runnable rainTick = new Runnable() {
        @Override
        public void run() {
            if (!raining) {
                return;
            }
            if (System.currentTimeMillis() < rainUntil) {
                spawnConfettiRow(3);
                postDelayed(this, RAIN_INTERVAL_MS);
            } else {
                raining = false;
            }
        }
    };

    public ParticleEmitterView(Context context) {
        this(context, null);
    }

    public ParticleEmitterView(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public ParticleEmitterView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        gravityPx = GRAVITY_DP * getResources().getDisplayMetrics().density;
        paint.setStyle(Paint.Style.FILL);
        buildStarPath();
        for (int i = 0; i < POOL_SIZE; i++) {
            pool.add(new Particle());
        }
        // Particles only: never intercept a touch meant for the drag controller.
        setClickable(false);
        setFocusable(false);
    }

    /** Unit 5-point star, reused for every star particle via canvas scaling. */
    private void buildStarPath() {
        starPath.reset();
        float outer = 1f;
        float inner = 0.44f;
        for (int i = 0; i < 10; i++) {
            float radius = (i % 2 == 0) ? outer : inner;
            double angle = Math.PI / 2 * -1 + i * Math.PI / 5;
            float x = (float) Math.cos(angle) * radius;
            float y = (float) Math.sin(angle) * radius;
            if (i == 0) {
                starPath.moveTo(x, y);
            } else {
                starPath.lineTo(x, y);
            }
        }
        starPath.close();
    }

    // ---------------------------------------------------------------- public API

    /** Radial burst — used on a successful drop and for the celebration's first firework. */
    public void burst(float xFraction, float yFraction, int count, int[] colors, Shape shape,
                      float minSpeedDp, float maxSpeedDp, float sizeDp, float lifetimeMs) {
        if (getWidth() == 0 || getHeight() == 0) {
            return;
        }
        float x = xFraction * getWidth();
        float y = yFraction * getHeight();
        float density = getResources().getDisplayMetrics().density;
        for (int i = 0; i < count; i++) {
            Particle p = obtain();
            if (p == null) {
                return;
            }
            double angle = random.nextDouble() * Math.PI * 2;
            float speed = density * (minSpeedDp + random.nextFloat() * (maxSpeedDp - minSpeedDp));
            p.x = x;
            p.y = y;
            p.vx = (float) Math.cos(angle) * speed;
            p.vy = (float) Math.sin(angle) * speed;
            p.ax = 0f;
            p.ay = gravityPx * 0.55f;
            p.drag = 0.985f;
            p.size = density * sizeDp * (0.6f + random.nextFloat() * 0.8f);
            p.rotation = random.nextFloat() * 360f;
            p.vr = (random.nextFloat() - 0.5f) * 720f;
            p.life = 0f;
            p.maxLife = lifetimeMs * (0.75f + random.nextFloat() * 0.5f) / 1000f;
            p.color = colors[random.nextInt(colors.length)];
            p.shape = shape;
            active.add(p);
        }
        ensureRunning();
    }

    /** Small celebratory sparkle at a fraction of the view — the "correct drop" accent. */
    public void sparkle(float xFraction, float yFraction) {
        burst(xFraction, yFraction, 8, new int[]{0xFFFFFFFF, 0xFFFFF176, 0xFFB3E5FC},
                Shape.STAR, 40f, 130f, 7f, 520f);
    }

    /**
     * Continuous downward dust, used for the baby powder. Emits a few particles per call, so the
     * task just calls it from its per-frame progress hook while the bottle is over the baby.
     */
    public void emitPowder(float xFraction, float yFraction, float widthFraction, int count) {
        if (getWidth() == 0 || getHeight() == 0) {
            return;
        }
        float density = getResources().getDisplayMetrics().density;
        float cx = xFraction * getWidth();
        float cy = yFraction * getHeight();
        float spread = widthFraction * getWidth();
        for (int i = 0; i < count; i++) {
            Particle p = obtain();
            if (p == null) {
                return;
            }
            p.x = cx + (random.nextFloat() - 0.5f) * spread;
            p.y = cy + (random.nextFloat() - 0.5f) * density * 10f;
            p.vx = (random.nextFloat() - 0.5f) * density * 26f;
            p.vy = density * (18f + random.nextFloat() * 40f);
            p.ax = 0f;
            p.ay = gravityPx * 0.18f;
            p.drag = 0.99f;
            p.size = density * (2.5f + random.nextFloat() * 3.5f);
            p.rotation = 0f;
            p.vr = 0f;
            p.life = 0f;
            p.maxLife = 0.9f + random.nextFloat() * 0.5f;
            p.color = random.nextBoolean() ? 0xE6FFFFFF : 0xCCF3F6FF;
            p.shape = Shape.CIRCLE;
            active.add(p);
        }
        ensureRunning();
    }

    /** Upward warm-air wisps for the hair dryer. */
    public void emitWarmAir(float xFraction, float yFraction, int count) {
        if (getWidth() == 0 || getHeight() == 0) {
            return;
        }
        float density = getResources().getDisplayMetrics().density;
        float cx = xFraction * getWidth();
        float cy = yFraction * getHeight();
        for (int i = 0; i < count; i++) {
            Particle p = obtain();
            if (p == null) {
                return;
            }
            p.x = cx + (random.nextFloat() - 0.5f) * density * 26f;
            p.y = cy + (random.nextFloat() - 0.5f) * density * 12f;
            p.vx = (random.nextFloat() - 0.5f) * density * 40f;
            p.vy = -density * (60f + random.nextFloat() * 70f);
            p.ax = 0f;
            p.ay = -gravityPx * 0.05f;
            p.drag = 0.97f;
            p.size = density * (4f + random.nextFloat() * 6f);
            p.rotation = 0f;
            p.vr = 0f;
            p.life = 0f;
            p.maxLife = 0.55f + random.nextFloat() * 0.35f;
            p.color = random.nextBoolean() ? 0x66FFF3D6 : 0x55FFFFFF;
            p.shape = Shape.CIRCLE;
            active.add(p);
        }
        ensureRunning();
    }

    /** Confetti rain across the top of the screen for {@code durationMs}. */
    public void startConfettiRain(long durationMs) {
        raining = true;
        rainUntil = System.currentTimeMillis() + durationMs;
        spawnConfettiRow(26);
        removeCallbacks(rainTick);
        postDelayed(rainTick, RAIN_INTERVAL_MS);
        ensureRunning();
    }

    public void stopConfettiRain() {
        raining = false;
        removeCallbacks(rainTick);
    }

    /** The full level-complete trigger: a big burst plus a few seconds of confetti rain. */
    public void celebrate() {
        burst(0.5f, 0.42f, 60, CONFETTI_COLORS, Shape.RECT, 180f, 520f, 9f, 1900f);
        burst(0.28f, 0.5f, 34, CONFETTI_COLORS, Shape.STAR, 140f, 420f, 11f, 1600f);
        burst(0.72f, 0.5f, 34, CONFETTI_COLORS, Shape.CIRCLE, 140f, 420f, 8f, 1600f);
        startConfettiRain(2600L);
    }

    /** Removes every particle immediately (used when the round restarts). */
    public void clear() {
        stopConfettiRain();
        for (int i = 0; i < active.size(); i++) {
            release(active.get(i));
        }
        active.clear();
        invalidate();
    }

    // ---------------------------------------------------------------- simulation

    private void spawnConfettiRow(int count) {
        if (getWidth() == 0) {
            return;
        }
        float density = getResources().getDisplayMetrics().density;
        for (int i = 0; i < count; i++) {
            Particle p = obtain();
            if (p == null) {
                return;
            }
            p.x = random.nextFloat() * getWidth();
            p.y = -density * 14f;
            p.vx = (random.nextFloat() - 0.5f) * density * 60f;
            p.vy = density * (90f + random.nextFloat() * 150f);
            p.ax = 0f;
            p.ay = gravityPx * 0.25f;
            p.drag = 0.995f;
            p.size = density * (5f + random.nextFloat() * 6f);
            p.rotation = random.nextFloat() * 360f;
            p.vr = (random.nextFloat() - 0.5f) * 540f;
            p.life = 0f;
            p.maxLife = 2.4f + random.nextFloat() * 1.2f;
            p.color = CONFETTI_COLORS[random.nextInt(CONFETTI_COLORS.length)];
            p.shape = random.nextBoolean() ? Shape.RECT : Shape.CIRCLE;
            active.add(p);
        }
    }

    private void ensureRunning() {
        if (!running) {
            running = true;
            lastFrameNanos = Choreographer.getInstance().getFrameTimeNanos();
            Choreographer.getInstance().postFrameCallback(frameCallback);
        }
    }

    private void step(long frameTimeNanos) {
        float dt = (frameTimeNanos - lastFrameNanos) / 1_000_000_000f;
        lastFrameNanos = frameTimeNanos;
        // Clamp so a backgrounded frame does not teleport every particle across the screen.
        if (dt <= 0f || dt > 0.05f) {
            dt = 0.016f;
        }

        int h = getHeight();
        for (int i = active.size() - 1; i >= 0; i--) {
            Particle p = active.get(i);
            p.life += dt;
            if (p.life >= p.maxLife || (h > 0 && p.y - p.size > h)) {
                active.remove(i);
                release(p);
                continue;
            }
            p.vx = (p.vx + p.ax * dt) * p.drag;
            p.vy = (p.vy + p.ay * dt) * p.drag;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rotation += p.vr * dt;
            // Confetti flutters: a horizontal sway that depends on nothing but time.
            if (p.shape == Shape.RECT) {
                p.x += (float) Math.sin(p.life * 7.5f + p.rotation * 0.02f) * p.size * 0.22f;
            }
        }
        invalidate();
    }

    // ---------------------------------------------------------------- drawing

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (active.isEmpty()) {
            return;
        }
        for (int i = 0; i < active.size(); i++) {
            Particle p = active.get(i);
            float t = p.life / p.maxLife;
            // Fade in quickly, out over the last third of the lifetime.
            int alpha = t < 0.1f
                    ? (int) (Color.alpha(p.color) * (t / 0.1f))
                    : (int) (Color.alpha(p.color) * (1f - Math.max(0f, (t - 0.65f) / 0.35f)));
            paint.setColor(p.color);
            paint.setAlpha(Math.max(0, Math.min(255, alpha)));

            switch (p.shape) {
                case CIRCLE:
                    canvas.drawCircle(p.x, p.y, p.size * 0.5f, paint);
                    break;
                case DROP:
                    canvas.drawOval(p.x - p.size * 0.35f, p.y - p.size * 0.6f,
                            p.x + p.size * 0.35f, p.y + p.size * 0.6f, paint);
                    break;
                case RECT:
                    canvas.save();
                    canvas.translate(p.x, p.y);
                    canvas.rotate(p.rotation);
                    // Squashing the height over time reads as a tumbling paper strip.
                    float squash = 0.35f + 0.65f * (float) Math.abs(Math.cos(p.life * 6f));
                    canvas.drawRect(-p.size * 0.5f, -p.size * squash, p.size * 0.5f, p.size * squash, paint);
                    canvas.restore();
                    break;
                case STAR:
                    canvas.save();
                    canvas.translate(p.x, p.y);
                    canvas.rotate(p.rotation);
                    canvas.scale(p.size, p.size);
                    canvas.drawPath(starPath, paint);
                    canvas.restore();
                    break;
                default:
                    break;
            }
        }
    }

    // ---------------------------------------------------------------- pooling

    private Particle obtain() {
        if (!pool.isEmpty()) {
            return pool.remove(pool.size() - 1);
        }
        // Pool exhausted (a very heavy celebration): drop the particle rather than allocate.
        return null;
    }

    private void release(Particle p) {
        if (pool.size() < POOL_SIZE) {
            pool.add(p);
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        running = false;
        Choreographer.getInstance().removeFrameCallback(frameCallback);
        stopConfettiRain();
        super.onDetachedFromWindow();
    }

    private static final class Particle {
        float x;
        float y;
        float vx;
        float vy;
        float ax;
        float ay;
        float drag;
        float size;
        float rotation;
        float vr;
        float life;
        float maxLife;
        int color;
        Shape shape;
    }
}
