// index.js — Google Try-On Gateway (Vertex AI VTO 対応版)
import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "40mb" }));

// --- 設定値の修正 ---
const PROJECT_ID = "kisekaeai";
const LOCATION = "asia-northeast1";
// 1. MODEL_ID から冗長なパスを削除し、IDのみにする
const MODEL_ID = "virtual-try-on-preview-08-04";

const ENDPOINT =
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

// Google token
async function getToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  // VTOモデルは処理時間が長いため、クライアント認証の期限を長めに考慮することが望ましいが、ここでは標準実装を維持
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

    // 2. VTO モデルの API 仕様に合わせて body を修正
    const body = {
      instances: [
        {
          // 人物画像を Base64 で送信
          b64_person_image: personImage,
          // 服の画像を Base64 で送信
          b64_product_image: garmentImage,
          // VTOモデルは通常、自動で試着を行うためプロンプトは不要
        }
      ],
      // 3. VTO モデルのパラメータを調整 (品質/速度トレードオフ)
      parameters: { 
          image_count: 1,
          base_steps: 32 
      }
    };

    const accessToken = await getToken();

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // VTOは処理時間が長いため、fetchのタイムアウト設定を検討する
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Try-On Gateway (Tokyo) running"));
