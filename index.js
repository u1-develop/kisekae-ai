import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "20mb" }));

// 疎通＆動作確認用：Imagen (imagegeneration@005)
app.post("/predict", async (req, res) => {
  try {
    const { imageBase64, prompt } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const PROJECT_ID = "kisekaeai";
    const LOCATION   = "us-central1"; // ★ Imagenはus-central1で
    const ENDPOINT   =
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}` +
      `/locations/${LOCATION}/publishers/google/models/imagegeneration@005:predict`;

    // Cloud RunのデフォルトSAでアクセストークン取得
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const body = {
      instances: [{
        prompt: prompt || "A portrait photo, photorealistic",
        image: { imageBytes: imageBase64 }
      }],
      parameters: { sampleCount: 1 }
    };

    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.token || accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    // そのまま中継
    return res.status(resp.status).json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// ヘルスチェック
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Vertex Proxy is running" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
