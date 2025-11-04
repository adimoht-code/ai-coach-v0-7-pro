// ✅ v0.7.5 Step UI + Session 통합 안정판
let video, overlay, ctx, detector;
let running = false;
let repCount = 0;
let lastPhase = "up";
let voiceOn = true;

document.addEventListener("DOMContentLoaded", () => {
  // 초기 숨김
  ["#step2", "#step3", "#sessionArea"].forEach(sel =>
    document.querySelector(sel)?.classList.add("hidden")
  );

  // Step 이동
  document.getElementById("toStep2").addEventListener("click", () => showStep(2));
  document.getElementById("back1").addEventListener("click", () => showStep(1));
  document.getElementById("requestRoutine").addEventListener("click", requestRoutine);
  document.getElementById("voiceToggle").addEventListener("change", e => {
    voiceOn = e.target.checked;
  });

  // 세션 제어
  document.getElementById("startBtn").addEventListener("click", startSession);
  document.getElementById("stopBtn").addEventListener("click", stopSession);

  showStep(1);
});

function showStep(n) {
  ["step1", "step2", "step3", "sessionArea"].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.toggle("hidden", i !== n - 1);
  });
  ["s1", "s2", "s3"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", i === n - 1);
  });
}

function speak(msg) {
  if (!voiceOn) return;
  const u = new SpeechSynthesisUtterance(msg);
  u.lang = "ko-KR";
  u.rate = 1;
  window.speechSynthesis.speak(u);
}

async function requestRoutine() {
  const btn = document.getElementById("requestRoutine");
  btn.disabled = true;
  btn.textContent = "AI 분석 중...";

  try {
    const res = await fetch(`${API_BASE}/api/routine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ height: 170, weight: 70, goal: "증량", periodWeeks: 12 })
    });
    const data = await res.json();
    const routine = data?.routine || "루틴 생성 실패";
    document.getElementById("routineText").textContent = routine;
    renderRoutineCards(routine.split("\n"));
    showStep(3);
  } catch (e) {
    alert("루틴 요청 실패: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "AI 루틴 추천받기 & 코칭 시작";
  }
}

function renderRoutineCards(lines) {
  const wrap = document.getElementById("routineCards");
  wrap.innerHTML = "";
  const items = lines.filter(l => l.trim().length > 5).slice(0, 6);
  items.forEach((txt, i) => {
    const div = document.createElement("div");
    div.className = "routine-card";
    div.innerHTML = `<h3>${txt}</h3>
      <button class="startNow">바로 시작</button>`;
    div.querySelector("button").addEventListener("click", () => {
      speak(`${txt} 시작합니다.`);
      showStep(4);
      startCamera();
    });
    wrap.appendChild(div);
  });
}

async function startCamera() {
  video = document.getElementById("video");
  overlay = document.getElementById("overlay");
  ctx = overlay.getContext("2d");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
  running = true;
  loop();
}

async function loop() {
  if (!running || !detector) return;
  const poses = await detector.estimatePoses(video, { flipHorizontal: true });
  if (poses?.[0]) drawKeypoints(poses[0].keypoints);
  requestAnimationFrame(loop);
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

async function startSession() {
  if (!detector)
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
  running = true;
  speak("운동 세션을 시작합니다.");
  loop();
}

function stopSession() {
  running = false;
  speak("운동을 종료합니다.");
}
