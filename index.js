// index.js — Google Try-On Gateway (Vertex AI VTO 対応版)
import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "40mb" }));

// --- 設定値 ---
const PROJECT_ID = "kisekaeai";
const LOCATION = "asia-northeast1";
// VTOモデルID
const MODEL_ID = "virtual-try-on-preview-08-04";

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

    // --- VTO モデルの API 仕様に合わせて body を修正 (Vertex AI のより厳密な標準形式を試行) ---
    // Vertex AI の一部のカスタム/プレビューモデルは、以下の構造を要求します。
    // キー名: person_image, product_image
    // 値: { bytesBase64Encoded: Base64文字列 }
    
    const body = {
      instances: [
        {
          // 修正: person_image と product_image キーを使用し、値を { bytesBase64Encoded: ... } でラップ
          person_image: {
              bytesBase64Encoded: personImage
          },
          product_image: {
              bytesBase64Encoded: garmentImage
          },
        }
      ],
      // parameters は空のまま
      parameters: {}
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
    // Vertex AIの呼び出し自体が失敗した場合
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Try-On Gateway (Tokyo) running"));
