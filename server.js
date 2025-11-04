// ✅ server.js — v0.7.1 Stable (GPT-5 개인 맞춤형 + 식단/환경/부상 반영)
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/api/routine", async (req, res) => {
  const body = req.body || {};
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY)
    return res.status(500).json({ error: "❌ API 키 누락" });

  const userBlock = `
[사용자 프로필]
성별: ${body.sex}
나이: ${body.age}세
키: ${body.height}cm
체중: ${body.weight}kg
체지방률: ${body.bodyfat || "미입력"}%
운동 수준: ${body.level}
운동 경력: ${body.experienceYears || 0}년
운동 환경: ${body.environment}
보유 장비: ${(body.equipment || []).join(", ") || "없음"}
부상/주의 부위: ${(body.issues || []).join(", ") || "없음"}
식단 관리 여부: ${body.diet}
수면 시간: ${body.sleepHours || "미입력"}시간
주당 운동 가능일수: ${body.daysPerWeek}일
목표: ${body.goal} (목표 체중 ${body.targetWeight || "미입력"}kg)
기간: ${body.periodWeeks || "미입력"}주
`;

  const sys = `
너는 GPT-5 기반 한국어 피트니스 트레이너이자 영양 코치다.
다음 사용자 정보를 기반으로 반드시 **개인 맞춤형 운동 루틴과 식단**을 설계하라.

설계 원칙:
1️⃣ 모든 루틴은 사용자의 성별, 나이, 키, 몸무게, 체지방률을 반영해 운동 볼륨(세트/횟수), 휴식시간, 강도를 세밀히 조절한다.
2️⃣ 체력 수준(${body.level})과 운동 경력(${body.experienceYears}년)에 따라 초보/중급/고급자별 구성을 달리한다.
3️⃣ 환경(${body.environment})과 장비(${body.equipment.join(", ")})를 실제로 활용한다.  
    - 홈트이면 맨몸 + 덤벨 위주, 헬스장이면 기구와 복합 루틴을 포함한다.
4️⃣ 부상/주의 부위(${body.issues.join(", ")})는 절대 무리하지 않게 대체 운동으로 구성한다.
5️⃣ 식단(${body.diet})을 병행 중이면 **일일 총칼로리 / 단백질 / 탄수화물 / 지방 비율**과 함께  
    구체적인 음식 예시 (아침, 점심, 저녁, 간식)를 제시한다.
6️⃣ ${body.periodWeeks}주 루틴으로, 주차별로 점진적 강도 증가를 포함한다.
7️⃣ 모든 설명은 초보자도 이해할 수 있는 자연스러운 한국어로 작성한다.
`;

  const ask = `
${userBlock}

[요구사항]
- ${body.periodWeeks}주 동안의 주차별 루틴을 구성하라.
- 각 운동은 세트수, 반복횟수, 휴식시간, RPE(운동강도지수)를 명시하라.
- 루틴은 요일별(월~일)로 정리한다.
- 식단 관리 중인 경우, 하루 단위로 구체적인 식단을 추천하라 (예: 닭가슴살, 현미밥, 브로콜리 등).
- 목표(${body.goal})에 따라 체중 변화, 체지방 감소 또는 근육량 증가를 중심으로 한다.
- 출력은 Markdown 또는 구조화된 텍스트 형식으로 작성한다.
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: ask },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ OpenAI 응답 오류:", data);
      return res.status(500).json({ error: data.error?.message || "AI 오류" });
    }

    const routine = data.choices[0].message.content;
    console.log("✅ AI 루틴 생성 완료");
    res.json({ routine });
  } catch (err) {
    console.error("🚨 서버 내부 오류:", err);
    res.status(500).json({ error: "서버 내부 오류" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 v0.7.1 서버 실행 중: http://localhost:${PORT}`);
});
