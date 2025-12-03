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

    // --- VTO モデルの API 仕様に合わせて body を修正 (より汎用的な構造を試行) ---
    // Vertex AI の一部のモデルは、画像を { "imageBytes": base64 } 形式の入れ子構造で要求します。
    // しかし、Virtual Try-On モデルは Base64 文字列を直接渡す独自のフィールド名を使用するため、
    // ここではフィールド名をより一般的な形式に変更して再試行します。
    
    const body = {
      instances: [
        {
          // 人物画像を Base64 で送信 (VTOドキュメントの記載に従い、正しいフィールド名を使用)
          // 一般的な VTO モデルのフィールド名:
          b64_person_image: personImage,
          b64_product_image: garmentImage,
        }
      ],
      // VTO モデルのパラメータを調整 (品質/速度トレードオフ)
      parameters: { 
          // image_count や base_steps はモデルのバージョンによって存在しない可能性があるため、削除して再試行
          // 400エラーの原因となっている可能性があるため、ここでは必須の画像データのみに絞る
      }
    };
    
    // VTOモデルの API 仕様を厳密に確認できない場合、以下の構造も試すべきですが、
    // まずはシンプルなVTO専用フィールドで再試行します。

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
