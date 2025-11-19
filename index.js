// index.js — Cloud Run proxy for OpenAI Try-On API
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

// OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Try-On モデル名（固定）
const OPENAI_TRYON_MODEL = "gpt-image-1";

// ========= Try-On API（人物 × 服） =========
app.post("/tryon", async (req, res) => {
  try {
    const { personImage, garmentImage, prompt } = req.body || {};

    if (!personImage || !garmentImage) {
      return res.status(400).json({ error: "Missing images." });
    }

    const body = {
      model: OPENAI_TRYON_MODEL,
      task: "fashion-tryon",
      subject_image: { image: personImage },
      clothing_image: { image: garmentImage },
      prompt: prompt || "A natural fashion try-on result."
    };

    const response = await fetch("https://api.openai.com/v1/images/edits", {
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

// health check
app.get("/", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Cloud Run proxy running on ${PORT}`));
