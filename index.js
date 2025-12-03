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

    // --- Vertex AI の標準的なペイロード形式 (person_image/product_image + bytesBase64Encoded) ---
    const body = {
      instances: [
        {
          person_image: {
              bytesBase64Encoded: personImage
          },
          product_image: {
              bytesBase64Encoded: garmentImage
          },
        }
      ],
      parameters: {} // パラメータは空のまま
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
    
    // ===================================================
    // 💥 エラーデバッグ強化部分 💥
    // Vertex AIからのエラー詳細を解析し、整形してPHPプロキシに返す
    // ===================================================
    if (response.status !== 200) {
        let errorMessage = 'Vertex AIからの詳細なエラーメッセージなし。';
        
        // Vertex AI APIのエラーJSONは通常 { "error": { "message": "..." } } の構造を持つ
        if (data.error && data.error.message) {
            errorMessage = data.error.message;
        } else if (data.message) {
            errorMessage = data.message;
        }

        // Cloud Runがこの詳細エラーメッセージをクライアントに返す
        return res.status(response.status).json({
            error: "Vertex AI Predict Error",
            http_code: response.status,
            detail: errorMessage,
            raw_data: data
        });
    }
    // ===================================================

    // 成功時
    res.status(200).json(data);

  } catch (err) {
    // Node.js またはネットワークエラー
    res.status(500).json({ error: "Cloud Run Internal Error", detail: err.message || String(err) });
  }
});

app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Try-On Gateway (Tokyo) running"));
