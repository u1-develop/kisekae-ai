// index.js — Try-On Gateway
import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "40mb" }));

const PROJECT_ID = "kisekaeai";
const LOCATION = "asia-northeast1"; 
const MODEL_ID = "imageediting@001";

const ENDPOINT =
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

// Google token
async function getToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || token;
}

// Try-On endpoint
app.post("/tryon", async (req, res) => {
  try {
    const { personImage, garmentImage } = req.body;

    if (!personImage || !garmentImage) {
      return res.status(400).json({ error: "Missing personImage or garmentImage" });
    }

    const body = {
      instances: [
        {
          prompt: "Put the garment image naturally on the person.",
          image: { imageBytes: personImage },
          edit: { imageBytes: garmentImage }
        }
      ],
      parameters: { sampleCount: 1 }
    };

    const accessToken = await getToken();
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
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Google Try-On Gateway running"));
