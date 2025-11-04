// ✅ server.js — v0.7.5 Stable API Fix
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ✅ OpenAI 루틴 생성 API
app.post("/api/routine", async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY 누락" });
  }

  const body = req.body || {};
  const prompt = `
[사용자 정보]
성별: ${body.sex || "미입력"}
키: ${body.height || "미입력"}cm
몸무게: ${body.weight || "미입력"}kg
목표: ${body.goal || "미입력"}
기간: ${body.periodWeeks || "12"}주

[요청사항]
사용자에게 맞는 주간 루틴을 제안하라.
`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "너는 피트니스 트레이너이자 코치야." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "루틴 생성 실패";
    return res.json({ routine: text });
  } catch (err) {
    console.error("❌ OpenAI API 오류:", err);
    return res.status(500).json({ error: "루틴 생성 실패", detail: err.message });
  }
});

// ✅ 기본 라우트 (index.html)
app.get("*", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

app.listen(PORT, () => {
  console.log(`🚀 v0.7.5 서버 실행 중: http://localhost:${PORT}`);
});
