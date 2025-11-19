import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "50mb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
        "Content-Type": "application/json",
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
