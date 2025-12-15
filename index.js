// Debug build log
console.log("VTO Gateway Build: 2025-12-03_02");

import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();

// ===== 基本設定 =====
app.use(express.json({ limit: "40mb" }));

const PROJECT_ID = "kisekaeai";
const LOCATION = "us-central1";
const MODEL_ID = "virtual-try-on-preview-08-04";

const ENDPOINT =
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

// ===== Google Access Token =====
async function getToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || token;
}

// ===== Try-On API =====
app.post("/tryon", async (req, res) => {
  try {
    console.log("REQ_BODY received");

    const { personImage, garmentImage } = req.body;

    if (!personImage || !garmentImage) {
      return res.status(400).json({
        status: "error",
        message: "Missing personImage or garmentImage"
      });
    }

    // Vertex AI Virtual Try-On payload（正式仕様）
    const body = {
      instances: [
        {
          personImage: {
            image: {
              bytesBase64Encoded: personImage
            }
          },
          productImages: [
            {
              image: {
                bytesBase64Encoded: garmentImage
              }
            }
          ]
        }
      ],
      parameters: {
        sampleCount: 1
      }
    };

    const accessToken = await getToken();

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Vertex AI Error:", data);
      return res.status(response.status).json({
        status: "vertex_ai_error",
        http_code: response.status,
        message: data.error?.message || "Unknown Vertex AI error",
        raw: data
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Cloud Run internal error:", err);
    return res.status(500).json({
      status: "error",
      message: "Cloud Run internal error",
      detail: err.message || String(err)
    });
  }
});

// ===== Health Check =====
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// ===== Server Start =====
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("SERVER LISTENING ON", PORT);
});
