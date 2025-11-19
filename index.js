import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "30mb" }));

const PROJECT_ID = "kisekaeai";
const LOCATION = "us-central1";
const MODEL = "virtual-try-on";
const ENDPOINT = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

async function getToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token || accessToken;
}

app.post("/edit", async (req, res) => {
  try {
    const { baseImage, editImage } = req.body || {};

    if (!baseImage || !editImage) {
      return res.status(400).json({ error: "Missing baseImage or editImage" });
    }

    const accessToken = await getToken();

    const body = {
      instances: [
        {
          personImage: { imageBytes: baseImage },
          garmentImage: { imageBytes: editImage },
        },
      ],
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
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
