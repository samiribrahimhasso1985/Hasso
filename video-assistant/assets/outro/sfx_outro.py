"""Synthesized sound design for the animated outro (no samples, no licensing issues).

Timeline matches outro_animated.html (6.0 s):
  0.0-6.0  drone      low D/A bed (Mesopotamian-feeling open fifth), swells and fades
  0.0-5.5  sand       soft granular dust under the moving frieze
  0.3-1.9  riser      filtered-noise whoosh rising into the reveal
  1.9      impact     deep cinematic hit as the calligraphy reveal completes
  2.0-3.2  shimmer    bright chimes following the golden sheen
  2.6/3.1/3.6 taps    soft "clay tablet" taps as each Sumerian word appears

Writes separate stems (for a DaVinci SFX track) and a mixed stereo WAV.
Usage: python sfx_outro.py <out_dir>
"""

from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
DUR = 6.0
N = int(SR * DUR)
rng = np.random.default_rng(7)  # fixed seed: same sound every render
t = np.arange(N) / SR


def env(a, b, attack=0.05, release=0.3):
    """0..1 envelope active between a and b seconds with smooth edges."""
    e = np.clip((t - a) / max(attack, 1e-4), 0, 1) * np.clip((b - t) / max(release, 1e-4), 0, 1)
    return e ** 2 * (3 - 2 * e)  # smoothstep


def lowpass(x, cutoff):
    """Simple one-pole low-pass, cutoff may be an array (time-varying)."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def reverb(x, seconds=2.2, mix=0.35, seed=1):
    """Convolution with a synthetic exponentially decaying noise impulse."""
    n = int(SR * seconds)
    r = np.random.default_rng(seed)
    ir = r.standard_normal(n) * np.exp(-6.9 * np.arange(n) / n)  # -60 dB at end
    ir = lowpass(ir, 6000); ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + n
    wet = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]
    return (1 - mix) * x + mix * wet


def norm(x, peak=1.0):
    m = np.abs(x).max()
    return x / m * peak if m > 0 else x


# ---------------------------------------------------------------- stems
def drone():
    f = [73.42, 110.0, 146.83]  # D2, A2, D3
    x = sum(np.sin(2 * np.pi * fr * t + p) * g
            for fr, p, g in zip(f, (0, 1.3, 2.1), (1.0, 0.55, 0.25)))
    x += 0.15 * np.sin(2 * np.pi * 73.6 * t)                 # slow beating = movement
    x *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.35 * t)
    return reverb(x * env(0.0, DUR, attack=1.2, release=1.0), 2.5, 0.3)


def sand():
    grains = np.zeros(N)
    for _ in range(1400):                                    # sparse dust grains
        i = rng.integers(0, N - 200); L = rng.integers(20, 120)
        grains[i:i + L] += rng.standard_normal(L) * np.hanning(L) * rng.uniform(.2, 1)
    hiss = highpass(lowpass(rng.standard_normal(N), 7000), 1800) * 0.25
    x = highpass(grains, 2500) + hiss
    return x * env(0.0, 5.5, attack=0.8, release=0.8)


def riser():
    a, b = 0.3, 1.9
    k = np.clip((t - a) / (b - a), 0, 1)
    noise = rng.standard_normal(N)
    x = lowpass(noise, 300 + 6000 * k ** 2) - lowpass(noise, 120 + 2500 * k ** 2)
    x *= k ** 2.2 * (t < b + 0.02)
    return reverb(x, 1.2, 0.25, seed=2)


def impact(at=1.9):
    d = np.clip(t - at, 0, None); on = t >= at
    f = 38 + 50 * np.exp(-d * 18)                            # pitch drop 88 -> 38 Hz
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-d * 2.8) * on
    crack = lowpass(rng.standard_normal(N), 2500) * np.exp(-d * 35) * on * 0.6
    return reverb(boom + crack, 3.0, 0.4, seed=3)


def shimmer(a=2.0, b=3.2):
    x = np.zeros(N)
    notes = [1174.66, 1567.98, 1760.0, 2349.32, 2637.02]     # D6 G6 A6 D7 E7
    for i, fr in enumerate(notes):
        st = a + i * (b - a - 0.4) / len(notes)
        d = np.clip(t - st, 0, None)
        x += (np.sin(2 * np.pi * fr * t) + 0.3 * np.sin(2 * np.pi * fr * 2.01 * t)) \
            * np.exp(-d * 4) * (t >= st) * np.clip(d / 0.004, 0, 1)
    return reverb(x, 2.5, 0.55, seed=4)


def taps(times=(2.6, 3.1, 3.6)):
    x = np.zeros(N)
    for k, st in enumerate(times):
        d = np.clip(t - st, 0, None); on = t >= st
        body = np.sin(2 * np.pi * (210 - 15 * k) * t) * np.exp(-d * 30)
        click = highpass(rng.standard_normal(N), 1500) * np.exp(-d * 140)
        x += (body + 0.5 * click) * on
    return reverb(x, 1.0, 0.3, seed=5)


STEMS = {  # name: (generator, mix gain, stereo pan -1..1)
    "drone":   (drone,   0.40,  0.0),
    "sand":    (sand,    0.10,  0.0),
    "riser":   (riser,   0.35,  0.0),
    "impact":  (impact,  0.95,  0.0),
    "shimmer": (shimmer, 0.18,  0.2),
    "taps":    (taps,    0.30, -0.1),
}


def write_wav(path: Path, data: np.ndarray):
    data = np.clip(data, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(data.shape[1] if data.ndim == 2 else 1)
        w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main(out_dir: str):
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    mix = np.zeros((N, 2))
    for name, (fn, gain, pan) in STEMS.items():
        x = norm(fn())
        write_wav(out / f"sfx_outro_{name}.wav", x * 0.9)
        lr = np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)])
        mix += np.outer(x * gain, lr)
        print("stem", name)
    mix *= np.clip((DUR - t) / 0.25, 0, 1)[:, None]         # clean tail at 6.0 s
    write_wav(out / "sfx_outro_mix.wav", norm(mix, 0.89))
    print("mix written")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "sfx")
