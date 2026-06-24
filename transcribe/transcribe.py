#!/usr/bin/env python3
"""
transcribe.py — Whisper-based WAV transcriber with CUDA auto-detection.

Run without arguments to be prompted interactively:
    python transcribe.py

Or pass files directly via CLI:
    python transcribe.py audio.wav
    python transcribe.py audio.wav --model large-v3
    python transcribe.py *.wav --model medium --output-dir transcripts/
    python transcribe.py audio.wav --language en --task translate

Output always goes to ./output_data/ by default.

Requirements:
    pip install openai-whisper
    pip install torch torchvision torchaudio          # CPU
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121  # CUDA 12.1
"""

import argparse
import sys
import time
from pathlib import Path

# Anchor all relative paths to the script's directory, not the shell's CWD.
SCRIPT_DIR = Path(__file__).parent.resolve()
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "output_data"


# ─────────────────────────────────────────────────────────────────────────────
# Device detection
# ─────────────────────────────────────────────────────────────────────────────

def detect_device() -> str:
    """Return 'cuda', 'mps', or 'cpu' based on what's available."""
    try:
        import torch
    except ImportError:
        return "cpu"

    if torch.cuda.is_available():
        name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / 1024 ** 3
        print(f"[device] CUDA GPU detected: {name} ({vram:.1f} GB VRAM) → using CUDA")
        return "cuda"

    # Apple Silicon
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        print("[device] Apple MPS detected → using MPS")
        return "mps"

    print("[device] No GPU detected → falling back to CPU")
    return "cpu"


# ─────────────────────────────────────────────────────────────────────────────
# Transcription
# ─────────────────────────────────────────────────────────────────────────────

def load_model(model_name: str, device: str):
    """Load (and download if needed) the requested Whisper model."""
    try:
        import whisper
    except ImportError:
        print(
            "[error] openai-whisper is not installed.\n"
            "        Run:  pip install openai-whisper",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"[model] Loading whisper/{model_name} on {device} …")
    t0 = time.perf_counter()
    model = whisper.load_model(model_name, device=device)
    print(f"[model] Loaded in {time.perf_counter() - t0:.1f}s")
    return model


def check_ffmpeg() -> None:
    """Warn clearly if ffmpeg is missing (Whisper needs it to decode audio)."""
    import shutil
    if shutil.which("ffmpeg") is None:
        print(
            "\n[error] ffmpeg not found on PATH — Whisper needs it to read audio files.\n"
            "        Install it and make sure it\'s on your PATH:\n"
            "          Windows : winget install ffmpeg   (or choco install ffmpeg)\n"
            "          Mac     : brew install ffmpeg\n"
            "          Linux   : sudo apt install ffmpeg",
            file=sys.stderr,
        )
        sys.exit(1)


def transcribe_file(
        model,
        wav_path: Path,
        language: str | None,
        task: str,
        fp16: bool,
        verbose: bool,
) -> dict:
    """Transcribe a single WAV file and return the Whisper result dict."""
    print(f"\n[transcribe] {wav_path.name}")
    print(f"[transcribe] Full path: {wav_path}")
    t0 = time.perf_counter()

    # Use forward slashes — avoids edge cases with Whisper/ffmpeg on Windows
    path_str = wav_path.as_posix()

    result = model.transcribe(
        path_str,
        language=language,      # None → auto-detect
        task=task,              # "transcribe" or "translate"
        fp16=fp16,              # half-precision; ignored silently on CPU
        verbose=verbose,        # print segments as they're decoded
    )

    elapsed = time.perf_counter() - t0
    duration = result.get("duration") or 0
    rtf = elapsed / duration if duration else 0
    print(
        f"[done] {elapsed:.1f}s wall-clock"
        + (f" | audio {duration:.1f}s | RTF {rtf:.2f}x" if duration else "")
    )
    return result


def write_outputs(result: dict, wav_path: Path, output_dir: Path) -> None:
    """Write .txt and .srt files next to (or in) output_dir."""
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = wav_path.stem

    # ── plain text ───────────────────────────────────────────────────────────
    txt_path = output_dir / f"{stem}.txt"
    txt_path.write_text(result["text"].strip() + "\n", encoding="utf-8")
    print(f"[output] {txt_path}")

    # ── SRT subtitles ────────────────────────────────────────────────────────
    segments = result.get("segments", [])
    if segments:
        srt_path = output_dir / f"{stem}.srt"
        lines: list[str] = []
        for i, seg in enumerate(segments, start=1):
            lines.append(str(i))
            lines.append(f"{_fmt_ts(seg['start'])} --> {_fmt_ts(seg['end'])}")
            lines.append(seg["text"].strip())
            lines.append("")
        srt_path.write_text("\n".join(lines), encoding="utf-8")
        print(f"[output] {srt_path}")


def _fmt_ts(seconds: float) -> str:
    """Format seconds as SRT timestamp HH:MM:SS,mmm."""
    ms = int(seconds * 1000)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1_000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ─────────────────────────────────────────────────────────────────────────────
# Interactive prompt
# ─────────────────────────────────────────────────────────────────────────────

WHISPER_MODELS = ["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"]

# Rough VRAM requirements per model (in GB) — used for advisory warnings only
VRAM_REQUIRED = {
    "tiny": 1, "base": 1, "small": 2, "medium": 5,
    "large": 10, "large-v2": 10, "large-v3": 10,
}


def prompt_for_wav() -> Path:
    """Interactively ask the user for a WAV file path until a valid one is given."""
    print(f"\n┌─ Whisper Transcriber ─────────────────────────────────────┐")
    print(f"│  Script dir : {SCRIPT_DIR}")
    print(f"│  Output dir : {DEFAULT_OUTPUT_DIR}")
    print(f"└────────────────────────────────────────────────────────────┘\n")
    print("Tip: enter a path relative to the script folder, or paste the full absolute path.\n")

    while True:
        raw = input("WAV file path: ").strip()

        # Strip accidental quotes (drag-and-drop on some terminals adds them)
        raw = raw.strip("'\"")

        if not raw:
            print("  [!] Please enter a file path.\n")
            continue

        p = Path(raw).expanduser()

        # Resolve relative paths against the script directory, not the shell CWD
        if not p.is_absolute():
            path = (SCRIPT_DIR / p).resolve()
        else:
            path = p.resolve()

        print(f"  [→] Resolved: {path}")

        if not path.exists():
            print(f"  [!] File not found at that path.\n")
            continue

        if not path.is_file():
            print(f"  [!] That path is a directory, not a file.\n")
            continue

        if path.suffix.lower() != ".wav":
            confirm = input(
                f"  [?] '{path.name}' doesn't end in .wav — try anyway? [y/N]: "
            ).strip().lower()
            if confirm != "y":
                print()
                continue

        return path


def prompt_for_model() -> str:
    """Ask which Whisper model to use, defaulting to 'base'."""
    print("\nModel options (accuracy vs. speed):")
    descriptions = {
        "tiny":     "~32M params  — fastest, least accurate",
        "base":     "~74M params  — good balance  [default]",
        "small":    "~244M params — better accuracy",
        "medium":   "~769M params — high accuracy, needs ~5 GB VRAM",
        "large-v3": "~1.5B params — best accuracy, needs ~10 GB VRAM",
    }
    for name, desc in descriptions.items():
        print(f"  {name:<12} {desc}")

    while True:
        raw = input("\nModel [base]: ").strip().lower() or "base"
        if raw in WHISPER_MODELS:
            return raw
        print(f"  [!] Invalid choice. Pick from: {', '.join(WHISPER_MODELS)}")


# ─────────────────────────────────────────────────────────────────────────────
# CLI (optional — lets the script still be used non-interactively)
# ─────────────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Transcribe WAV files with OpenAI Whisper + optional CUDA acceleration.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("files", nargs="*", type=Path, help="WAV file(s) to transcribe (omit to be prompted)")
    p.add_argument(
        "--model", "-m", default=None, choices=WHISPER_MODELS,
        help="Whisper model size (default: base, or prompted interactively).",
    )
    p.add_argument(
        "--language", "-l", default=None,
        help="Language code (e.g. 'en', 'es'). Omit to auto-detect.",
    )
    p.add_argument(
        "--task", "-t", default="transcribe", choices=["transcribe", "translate"],
        help="'transcribe' keeps original language; 'translate' → English.",
    )
    p.add_argument(
        "--output-dir", "-o", type=Path, default=DEFAULT_OUTPUT_DIR,
        help=f"Directory for output files (default: {DEFAULT_OUTPUT_DIR}).",
    )
    p.add_argument(
        "--device", "-d", default="auto", choices=["auto", "cuda", "cpu", "mps"],
        help="Compute device (default: auto-detect).",
    )
    p.add_argument(
        "--no-fp16", action="store_true",
        help="Disable half-precision (useful if you see NaN outputs on some GPUs).",
    )
    p.add_argument(
        "--verbose", "-v", action="store_true",
        help="Print each decoded segment to stdout as it's processed.",
    )
    return p


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def run(wav_files: list[Path], model_name: str, output_dir: Path,
        language: str | None, task: str, device: str, fp16: bool, verbose: bool) -> None:
    """Core pipeline: detect device → load model → transcribe → write outputs."""

    # ── optional VRAM advisory ────────────────────────────────────────────────
    try:
        import torch
        if device == "cuda" and torch.cuda.is_available():
            vram_gb = torch.cuda.get_device_properties(0).total_memory / 1024 ** 3
            required = VRAM_REQUIRED.get(model_name, 0)
            if required > vram_gb:
                print(
                    f"[warn] Model '{model_name}' needs ~{required} GB VRAM "
                    f"but GPU has {vram_gb:.1f} GB. Consider a smaller model or CPU."
                )
    except Exception:
        pass

    check_ffmpeg()
    print(f"[info] {len(wav_files)} file(s) to transcribe → {output_dir}/")
    model = load_model(model_name, device)

    errors: list[tuple[Path, str]] = []
    for wav in wav_files:
        try:
            result = transcribe_file(
                model=model,
                wav_path=wav,
                language=language,
                task=task,
                fp16=fp16,
                verbose=verbose,
            )
            write_outputs(result, wav, output_dir)
        except Exception as exc:
            print(f"[error] {wav.name}: {exc}", file=sys.stderr)
            errors.append((wav, str(exc)))

    print(f"\n[summary] {len(wav_files) - len(errors)}/{len(wav_files)} succeeded")
    if errors:
        for path, msg in errors:
            print(f"  ✗ {path.name}: {msg}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    interactive = not args.files  # no files passed → interactive mode

    # ── resolve WAV files ─────────────────────────────────────────────────────
    if interactive:
        wav_files = [prompt_for_wav()]
    else:
        wav_files = []
        for p in args.files:
            if p.is_file():
                wav_files.append(p)
            else:
                wav_files.extend(Path(".").glob(str(p)))
        wav_files = sorted(set(wav_files))
        if not wav_files:
            print("[error] No WAV files found.", file=sys.stderr)
            sys.exit(1)

    # ── resolve model ─────────────────────────────────────────────────────────
    if interactive and args.model is None:
        model_name = prompt_for_model()
    else:
        model_name = args.model or "base"

    # ── resolve device ────────────────────────────────────────────────────────
    device = detect_device() if args.device == "auto" else args.device
    fp16 = (device == "cuda") and not args.no_fp16

    # ── run ───────────────────────────────────────────────────────────────────
    run(
        wav_files=wav_files,
        model_name=model_name,
        output_dir=args.output_dir,
        language=args.language,
        task=args.task,
        device=device,
        fp16=fp16,
        verbose=args.verbose,
    )


if __name__ == "__main__":
    main()