// index.js 全体イメージ（重要なのは /tryon の部分）
console.log("VTO Gateway Build: 2025-12-03_01");

import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "40mb" }));

const PROJECT_ID = "kisekaeai";
const LOCATION  = "us-central1";
const MODEL_ID  = "virtual-try-on-preview-08-04";

const ENDPOINT =
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

// アクセストークン取得
async function getToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || token;
}

// Virtual Try-On エンドポイント
app.post("/tryon", async (req, res) => {
  try {
    const { personImage, garmentImage } = req.body;

    if (!personImage || !garmentImage) {
      return res.status(400).json({
        status: "error",
        message: "Missing personImage or garmentImage",
      });
    }

    // ★ Vertex AI VTO の JSON 形式に合わせる
    const body = {
      instances: [
        {
          personImage: {
            image: {
              // PHP から渡されるのはプレフィックス無しの Base64 なのでそのまま
              bytesBase64Encoded: personImage,
            },
          },
          productImages: [
            {
              image: {
                bytesBase64Encoded: garmentImage,
              },
            },
          ],
        },
      ],
      parameters: {
        sampleCount: 1,
      },
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

    if (!response.ok) {
      console.error("Vertex AI error:", data);
      return res.status(response.status).json({
        status: "vertex_ai_error",
        http_code: response.status,
        message: data.error?.message || "Vertex AI error",
        raw: data,
      });
    }

    // Vertex AI の生レスポンスをそのまま返す（PHP 側で取り出す）
    return res.status(200).json(data);
  } catch (err) {
    console.error("Cloud Run internal error:", err);
    return res.status(500).json({
      status: "error",
      message: "Cloud Run internal error",
      detail: err.message || String(err),
    });
  }
});

app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Try-On Gateway (US) running"));
