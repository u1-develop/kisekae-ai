// index.js — Cloud Run proxy for OpenAI Try-On API
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ========= Try-On API（人物 × 服） =========
app.post("/tryon", async (req, res) => {
  try {
    const { personImage, garmentImage } = req.body || {};

    if (!personImage || !garmentImage) {
      return res.status(400).json({ error: "Missing images." });
    }

    // Try-On API の正式エンドポイント
    const url = "https://api.openai.com/v1/vision/tryon";

    // Try-On API の正式 body
    const body = {
      model: "gpt-image-1",
      subject: personImage,   // ← BASE64 のみ
      cloth: garmentImage     // ← BASE64 のみ
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Cloud Run proxy running on ${PORT}`));
