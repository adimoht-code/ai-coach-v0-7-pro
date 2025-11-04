// ✅ v0.7.6 Stable - 루틴 카드 간략화 + 자동 세션 + 음성 코칭
let video, overlay, ctx, detector;
let running = false;
let routinePlan = [];
let currentIndex = 0;
let voiceOn = true;

document.addEventListener("DOMContentLoaded", () => {
  ["#step2", "#step3", "#sessionArea"].forEach(sel =>
    document.querySelector(sel)?.classList.add("hidden")
  );
  document.getElementById("toStep2").addEventListener("click", () => showStep(2));
  document.getElementById("back1").addEventListener("click", () => showStep(1));
  document.getElementById("requestRoutine").addEventListener("click", requestRoutine);
  showStep(1);
});

function speak(msg) {
  if (!voiceOn) return;
  const u = new SpeechSynthesisUtterance(msg);
  u.lang = "ko-KR";
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
}

function showStep(n) {
  ["step1", "step2", "step3", "sessionArea"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", i !== n - 1);
  });
  ["s1", "s2", "s3"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", i === n - 1);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function requestRoutine() {
  const btn = document.getElementById("requestRoutine");
  btn.disabled = true;
  btn.textContent = "AI 분석 중...";

  try {
    const r = await fetch(`${API_BASE}/api/routine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectUserInput())
    });
    const data = await r.json();
    const routine = data?.routine || "루틴 생성 실패";

    routinePlan = parseRoutine(routine);
    renderRoutineCards(routinePlan);
    showStep(3);
    speak("AI 맞춤 루틴이 완성되었습니다. 언제든 시작 버튼을 누르세요.");
  } catch (err) {
    alert("❌ 루틴 생성 실패: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "AI 루틴 추천받기 & 코칭 시작";
  }
}

function collectUserInput() {
  return {
    sex: sex.value,
    age: age.value,
    height: height.value,
    weight: weight.value,
    bodyfat: bodyfat.value,
    level: level.value,
    environment: environment.value,
    daysPerWeek: daysPerWeek.value,
    sleepHours: sleepHours.value,
    diet: diet.value,
    goal: goal.value,
    targetWeight: targetWeight.value,
    periodWeeks: periodWeeks.value,
    equipment: [...document.querySelectorAll(".eq:checked")].map(x => x.value),
    issues: [...document.querySelectorAll(".iss:checked")].map(x => x.value),
  };
}

// ✅ AI 응답을 요일별 카드 형태로 변환
function parseRoutine(text) {
  const lines = text.split("\n").filter(l => l.trim());
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const plan = days.map(d => ({
    day: d,
    workout: lines.find(l => l.includes(d)) || `${d}요일: 휴식`
  }));
  return plan;
}

function renderRoutineCards(plan) {
  const wrap = document.getElementById("routineCards");
  wrap.innerHTML = "";
  plan.forEach(p => {
    const div = document.createElement("div");
    div.className = "routine-card";
    div.innerHTML = `<h3>${p.day}요일</h3><p>${p.workout.replace(/^[-#\d\s]*/,'')}</p>
      <button class="startDay" data-day="${p.day}">바로 시작</button>`;
    div.querySelector("button").addEventListener("click", startFullSession);
    wrap.appendChild(div);
  });
}

// ✅ 자동 세션
async function startFullSession() {
  showStep(4);
  currentIndex = 0;
  await startCamera();
  nextWorkout();
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
}

function nextWorkout() {
  if (currentIndex >= routinePlan.length) {
    speak("루틴이 모두 완료되었습니다. 수고하셨습니다!");
    document.getElementById("feedback").textContent = "루틴 완료!";
    return;
  }
  const workout = routinePlan[currentIndex].workout.replace(/^[^:]+:/, "").trim();
  speak(`${workout} 시작합니다.`);
  document.getElementById("feedback").textContent = `${workout} 진행 중...`;
  currentIndex++;

  setTimeout(() => {
    speak("좋아요. 다음 운동으로 넘어갑니다.");
    nextWorkout();
  }, 15000); // 각 운동 15초 시뮬레이션
}
