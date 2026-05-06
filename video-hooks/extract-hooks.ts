import { execSync } from "child_process";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

dotenv.config();

const INPUT = process.argv[2];

if (!INPUT) {
  console.error("❌ Provide video file");
  process.exit(1);
}

const baseName = path.basename(INPUT, path.extname(INPUT));

const ROOT = path.join(process.cwd(), "video-hooks");

const INPUT_DIR = path.join(ROOT, "input", baseName);
const OUTPUT_DIR = path.join(ROOT, "output", baseName);

const AUDIO = path.join(OUTPUT_DIR, "audio.wav");
const TRANSCRIPT = path.join(OUTPUT_DIR, "transcript.txt");
const CLIPS_DIR = path.join(OUTPUT_DIR, "clips");

fs.mkdirSync(INPUT_DIR, { recursive: true });
fs.mkdirSync(CLIPS_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * COPY INPUT INTO FOLDER (clean workflow)
 */
const FINAL_INPUT = path.join(INPUT_DIR, "original.mp4");
if (!fs.existsSync(FINAL_INPUT)) {
  fs.copyFileSync(INPUT, FINAL_INPUT);
}

/**
 * AUDIO
 */
function extractAudio() {
  console.log("🎧 audio...");

  return new Promise((resolve, reject) => {
    ffmpeg(FINAL_INPUT)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .save(AUDIO)
      .on("end", resolve)
      .on("error", reject);
  });
}

/**
 * TRANSCRIBE
 */
function transcribe() {
  console.log("🧠 whisper...");

  execSync(
    `/opt/homebrew/Cellar/whisper-cpp/1.8.4/bin/whisper-cli \
    -f "${AUDIO}" \
    -m video-hooks/models/ggml-base.bin \
    -otxt \
    -of "${OUTPUT_DIR}/transcript"`,
    { stdio: "inherit" }
  );

  return fs.readFileSync(TRANSCRIPT, "utf-8");
}

/**
 * VIRAL SCORE
 */
function score(text: string) {
  const words = ["you", "why", "stop", "secret", "mistake", "don’t", "now"];
  let s = 0;

  const t = text.toLowerCase();

  words.forEach(w => {
    if (t.includes(w)) s += 2;
  });

  if (text.length < 120) s += 3;

  return s;
}

/**
 * HOOKS
 */
function extract(text: string) {
  const lines = text.split("\n").filter(Boolean);

  return lines
    .map((l, i) => ({
      text: l,
      score: score(l),
      index: i
    }))
    .filter(x => x.score > 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * CUT
 */
function cut(index: number) {
  const out = path.join(CLIPS_DIR, `clip_${index}.mp4`);

  execSync(
    `ffmpeg -y -i "${FINAL_INPUT}" -ss ${index * 4} -to ${index * 4 + 6} -c:v libx264 -c:a aac "${out}"`,
    { stdio: "inherit" }
  );
}

/**
 * MAIN
 */
(async () => {
  await extractAudio();

  const text = transcribe();
  fs.writeFileSync(TRANSCRIPT, text);

  const hooks = extract(text);

  console.log("🔥 VIRAL:");

  hooks.forEach((h, i) => {
    console.log(i + 1, h.text, "score:", h.score);
  });

  hooks.forEach((_, i) => cut(i + 1));

  console.log("🚀 DONE:", OUTPUT_DIR);
})();