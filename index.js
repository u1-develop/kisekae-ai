import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "20mb" }));

app.post("/", async (req, res) => {
  try {
    const { imageBase64, garmentBase64 } = req.body;
    if (!imageBase64 || !garmentBase64) {
      return res.status(400).json({ error: "Missing imageBase64 or garmentBase64" });
    }

    const PROJECT_ID = "kisekaeai";
    const ENDPOINT = `https://asia-northeast1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/asia-northeast1/publishers/google/models/virtual-try-on:predict`;

    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"]
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.token || accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            image: { imageBytes: imageBase64 },
            garment: { imageBytes: garmentBase64 }
          }
        ]
      }),
    });

    const result = await response.json();
    return res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Vertex Proxy is running" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
