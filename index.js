import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "20mb" }));

app.post("/predict", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt text" });
    }

    const PROJECT_ID = "kisekaeai";
    const LOCATION = "us-east4";  // ← ここを絶対変更！
    const MODEL = "imagegeneration@005";

    const ENDPOINT =
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const body = {
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" },
    };

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token || accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
