// ✅ app.js — v0.7.4 (Step UI + 루틴 전환 + 세션 실행)
let video, overlay, ctx, detector;
let running = false;
let currentExercise = null;
let repCount = 0;
let lastPhase = "up";
let voiceOn = true;
const API_BASE = ""; // index.html에서 전역 설정됨

/* ====== 공통 ====== */
function speak(msg) {
  if (!voiceOn) return;
  const u = new SpeechSynthesisUtterance(msg);
  u.lang = "ko-KR";
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
}

function showStep(n) {
  ["step1", "step2", "step3"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", i !== n - 1);
  });
  ["s1", "s2", "s3"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", i === n - 1);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ====== 카메라 & 모델 ====== */
async function initDetector() {
  const model = poseDetection.SupportedModels.MoveNet;
  detector = await poseDetection.createDetector(model, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  });
}

async function startCamera() {
  video = document.getElementById("video");
  overlay = document.getElementById("overlay");
  ctx = overlay.getContext("2d");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
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
  ctx.fillStyle = "#00e0ff";
  kps.forEach(k => {
    if (k.score > 0.5) {
      ctx.beginPath();
      ctx.arc(k.x, k.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

function evaluateGeneric(kps) {
  const hip = kps.find(k => k.name.includes("hip"));
  const knee = kps.find(k => k.name.includes("knee"));
  if (!hip || !knee) return;
  const dy = Math.abs(hip.y - knee.y);
  if (dy < 60 && lastPhase === "up") lastPhase = "down";
  if (dy > 100 && lastPhase === "down") {
    lastPhase = "up";
    repCount++;
    speak(`${repCount}회`);
    document.getElementById("reps").textContent = repCount;
  }
}

/* ====== 루프 ====== */
async function loop() {
  if (!running) return;
  const poses = await detector.estimatePoses(video, { flipHorizontal: true });
  if (poses && poses[0]) {
    drawKeypoints(poses[0].keypoints);
    evaluateGeneric(poses[0].keypoints);
  }
  requestAnimationFrame(loop);
}

/* ====== AI 루틴 요청 ====== */
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

  try {
    const r = await fetch(`${API_BASE}/api/routine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    const routine = data?.routine || "루틴 생성 실패";
    document.getElementById("routineText").textContent = routine;
    renderRoutineCards(routine.split("\n"));
    showStep(3);
    speak("AI 맞춤 루틴이 완성되었습니다.");
  } catch (err) {
    alert("❌ 루틴 생성 실패: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "AI 루틴 추천받기 & 코칭 시작";
  }
}

/* ====== 루틴 카드 생성 ====== */
function renderRoutineCards(lines) {
  const wrap = document.getElementById("routineCards");
  wrap.innerHTML = "";
  const exercises = lines
    .filter(l => /(\d+\.)\s*(.+)/.test(l))
    .map(l => l.replace(/(\d+\.)\s*/, ""));
  exercises.forEach((name, i) => {
    const div = document.createElement("div");
    div.className = "routine-card";
    div.innerHTML = `
      <h3>${i + 1}. ${name}</h3>
      <button class="startNow" data-ex="${name}">바로 시작</button>`;
    wrap.appendChild(div);
  });

  document.querySelectorAll(".startNow").forEach(btn => {
    btn.addEventListener("click", async e => {
      const ex = e.currentTarget.dataset.ex;
      currentExercise = ex;
      speak(`${ex} 시작합니다`);
      await ensureCamera();
      running = true;
      loop();
      document.getElementById("feedback").textContent = `${ex} 진행 중`;
    });
  });
}

/* ====== 보조 ====== */
async function ensureCamera() {
  try {
    if (!video || !video.srcObject) await startCamera();
    if (!detector) await initDetector();
  } catch (err) {
    alert("🚨 카메라 접근 실패! Chrome 설정에서 권한을 허용해주세요.");
  }
}

/* ====== 초기화 ====== */
document.addEventListener("DOMContentLoaded", () => {
  // Step navigation
  showStep(1);
  document.getElementById("toStep2").addEventListener("click", () => showStep(2));
  document.getElementById("back1").addEventListener("click", () => showStep(1));
  document.getElementById("requestRoutine").addEventListener("click", requestRoutine);
  document.getElementById("voiceToggle").addEventListener("change", e => {
    voiceOn = e.target.checked;
  });
});
