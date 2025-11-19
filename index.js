// === index.js (Cloud Run) ===
import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "30mb" }));

const PROJECT_ID = "kisekaeai";
const LOCATION = "us-central1";
const BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models`;

// 共通: アクセストークン取得
async function getToken() {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token || accessToken;
}

// ▼ /edit : 画像を入力して編集する
app.post("/edit", async (req, res) => {
  try {
    const { baseImage, editImage, prompt } = req.body || {};
    if (!baseImage || !editImage) {
      return res.status(400).json({ error: "Missing baseImage or editImage" });
    }

    const ENDPOINT = `${BASE_URL}/imagegeneration@002:predict`;
    const accessToken = await getToken();

    const body = {
      instances: [
        {
          prompt: prompt || "Apply the garment image naturally onto the person image.",
          image: { imageBytes: baseImage },
          edit: { imageBytes: editImage },
        },
      ],
      parameters: { sampleCount: 1 },
    };

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
