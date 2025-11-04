// ✅ app.js — v0.7.1 Stable (GPT-5 개인화 + 동적 운동 루틴 + 카메라 대응)

let video, overlay, ctx, detector;
let running = false;
let currentExercise = null;
let repCount = 0;
let lastPhase = 'up';
let accuracyAvg = [];
let voiceOn = true;

const API_BASE = "";

/* ========== 공통 기능 ========== */
function speak(msg) {
  if (!voiceOn) return;
  const u = new SpeechSynthesisUtterance(msg);
  u.lang = "ko-KR";
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
}

function setFeedback(msg, level = 'ok') {
  const el = document.getElementById('feedback');
  if (!el) return;
  el.textContent = msg;
  el.className = level;
  if (level !== 'ok') speak(msg);
}

/* ========== 카메라 & 모델 ========== */
async function initDetector() {
  const model = poseDetection.SupportedModels.MoveNet;
  detector = await poseDetection.createDetector(model, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  });
}

async function startCamera() {
  video = document.getElementById('video');
  overlay = document.getElementById('overlay');
  ctx = overlay.getContext('2d');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
}

function drawKeypoints(kps) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.drawImage(video, 0, 0, overlay.width, overlay.height);
  ctx.fillStyle = 'aqua';
  kps.forEach(k => {
    if (k.score > 0.5) {
      ctx.beginPath();
      ctx.arc(k.x, k.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

/* ========== 운동 이름 인식 및 동적 평가 ========== */
function normalizeExercise(name) {
  const n = name.toLowerCase();
  if (n.includes("스쿼트") || n.includes("squat")) return "squat";
  if (n.includes("데드") || n.includes("dead")) return "deadlift";
  if (n.includes("벤치") || n.includes("bench")) return "bench";
  if (n.includes("푸시") || n.includes("push")) return "pushup";
  if (n.includes("플랭크") || n.includes("plank")) return "plank";
  if (n.includes("런지") || n.includes("lunge")) return "lunge";
  if (n.includes("버피") || n.includes("burpee")) return "burpee";
  return "generic";
}

function evaluateGeneric(kps) {
  const hip = kps.find(k => k.name.includes('hip'));
  const knee = kps.find(k => k.name.includes('knee'));
  if (!hip || !knee) return;
  const dy = Math.abs(hip.y - knee.y);
  if (dy < 60 && lastPhase === 'up') lastPhase = 'down';
  if (dy > 100 && lastPhase === 'down') {
    lastPhase = 'up';
    repCount++;
    speak(`${repCount}회`);
  }
}

/* ========== 루프 ========== */
async function loop() {
  if (!running) return;
  const poses = await detector.estimatePoses(video, { flipHorizontal: true });
  if (poses && poses[0]) {
    drawKeypoints(poses[0].keypoints);
    evaluateGeneric(poses[0].keypoints);
  }
  requestAnimationFrame(loop);
}

/* ========== 루틴 요청 ========== */
async function requestRoutine() {
  const payload = {
    sex: document.getElementById("sex").value,
    age: document.getElementById("age").value,
    height: document.getElementById("height").value,
    weight: document.getElementById("weight").value,
    bodyfat: document.getElementById("bodyfat").value,
    level: document.getElementById("level").value,
    experienceYears: document.getElementById("experienceYears").value,
    environment: document.getElementById("environment").value,
    equipment: [...document.querySelectorAll(".eq:checked")].map(x => x.value),
    issues: [...document.querySelectorAll(".iss:checked")].map(x => x.value),
    diet: document.getElementById("diet").value,
    daysPerWeek: document.getElementById("daysPerWeek").value,
    sleepHours: document.getElementById("sleepHours").value,
    goal: document.getElementById("goal").value,
    targetWeight: document.getElementById("targetWeight").value,
    periodWeeks: document.getElementById("periodWeeks").value,
  };

  const btn = document.getElementById("requestRoutine");
  btn.disabled = true;
  btn.textContent = "AI 분석 중...";

  const r = await fetch(`${API_BASE}/api/routine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  btn.disabled = false;
  btn.textContent = "AI 루틴 추천받기 & 코칭 시작";

  const routine = data?.routine || "루틴 생성 실패";
  document.getElementById("routineText").textContent = routine;

  // 운동 목록 자동 생성
  const exercises = [];
  const lines = routine.split("\n");
  lines.forEach(line => {
    const match = line.match(/(\d+\.)\s*(.+?)[:：]/);
    if (match) exercises.push({ name: match[2].trim() });
  });
  renderRoutineCards(exercises);
}

/* ========== 루틴 카드 렌더링 ========== */
function renderRoutineCards(list) {
  const wrap = document.getElementById("routineCards");
  wrap.innerHTML = "";
  list.forEach((ex, i) => {
    const key = normalizeExercise(ex.name);
    const div = document.createElement("div");
    div.className = "routine-card";
    div.innerHTML = `
      <h3>${i + 1}. ${ex.name}</h3>
      <button class="startNow" data-ex="${key}">바로 시작</button>`;
    wrap.appendChild(div);
  });
  [...document.querySelectorAll(".startNow")].forEach(btn => {
    btn.addEventListener("click", async e => {
      const ex = e.currentTarget.dataset.ex;
      currentExercise = ex;
      await ensureCamera();
      running = true;
      loop();
      speak(`${ex} 시작합니다`);
    });
  });
}

async function ensureCamera() {
  try {
    if (!video || !video.srcObject) await startCamera();
    if (!detector) await initDetector();
  } catch (err) {
    alert("🚨 카메라 접근 실패! Chrome 설정에서 권한을 허용해주세요.");
  }
}

/* ========== 초기화 ========== */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("requestRoutine").addEventListener("click", requestRoutine);
  document.getElementById("voiceToggle").addEventListener("change", e => {
    voiceOn = e.target.checked;
  });
});
