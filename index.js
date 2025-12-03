// Debug build log
console.log("VTO Gateway Build: 2025-12-03_01");

import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();

// JSON ボディを受け付ける
app.use(express.json({ limit: "40mb" }));

// Google Cloud 設定
const PROJECT_ID = "kisekaeai";
const LOCATION = "us-central1";
const MODEL_ID = "virtual-try-on-preview-08-04";

const ENDPOINT =
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

// Google AccessToken
async function getToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || token;
}

// Virtual Try-On API
app.post("/tryon", async (req, res) => {
  try {
    // ★ リクエスト内容を Cloud Run にログ出力（超重要）
    console.log("REQ_BODY:", JSON.stringify(req.body, null, 2));

    const { personImage, garmentImage } = req.body;

    if (!personImage || !garmentImage) {
      return res.status(400).json({
        status: "error",
        message: "Missing personImage or garmentImage"
      });
    }

    // ★ Google Virtual Try-On API 仕様に完全準拠した Body
    const body = {
      instances: [
        {
          personImage: {
            image: {
              bytesBase64Encoded: personImage   // Base64（プレフィックス無し）
            }
          },
          productImages: [
            {
              image: {
                bytesBase64Encoded: garmentImage // Base64（プレフィックス無し）
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

    // Vertex AI エラー
    if (!response.ok) {
      console.error("Vertex AI Error:", data);
      return res.status(response.status).json({
        status: "vertex_ai_error",
        http_code: response.status,
        message: data.error?.message || "Unknown Vertex AI error",
        raw: data
      });
    }

    // 正常時
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

// Health check
app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Try-On Gateway running on ${PORT}`));
