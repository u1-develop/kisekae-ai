// index.js — Cloud Run proxy for OpenAI Try-On API
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

// OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ========= Try-On API（人物 × 服） =========
app.post("/tryon", async (req, res) => {
  try {
    const { personImage, garmentImage } = req.body || {};

    if (!personImage || !garmentImage) {
      return res.status(400).json({ error: "Missing images." });
    }

    const body = {
      model: "gpt-image-1",
      prompt: "fashion_tryon",
      image: [
        { type: "person", image: personImage },
        { type: "clothing", image: garmentImage }
      ]
    };

    const response = await fetch("https://api.openai.com/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const text = await response.text();       // ← 重要: 生で受け取る
    let data;

    try {
      data = JSON.parse(text);                // ← JSONに変換
    } catch (e) {
      return res.status(500).send({
        error: "OpenAIからJSONではなくHTMLが返ってきました。",
        raw: text
      });
    }

    res.status(response.status).json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// health check
app.get("/", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Cloud Run proxy running on ${PORT}`));
