// index.js — Cloud Run proxy for OpenAI Try-On API
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Try-On API 正式エンドポイント
const OPENAI_TRYON_URL = "https://api.openai.com/v1/vision/try-on";

app.post("/tryon", async (req, res) => {
  try {
    const { personImage, garmentImage, prompt } = req.body || {};

    if (!personImage || !garmentImage) {
      return res.status(400).json({ error: "Missing images." });
    }

    const body = {
      model: "gpt-image-1",
      task: "fashion-tryon",
      prompt: prompt || "Natural fashion try-on result.",
      subject_image: { image: personImage },
      clothing_image: { image: garmentImage }
    };

    const response = await fetch(OPENAI_TRYON_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "OpenAI returned non-JSON (HTML) response",
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
app.listen(PORT, () => console.log(`Cloud Run proxy running on port ${PORT}`));
