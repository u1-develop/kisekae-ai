// Debug build log
console.log("VTO Gateway Build: 2025-12-03_02");

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
    // --- ここで Cloud Run に届いたボディを軽くログ出力 ---
    const { personImage, garmentImage } = req.body || {};

    console.log("REQ_LEN person / garment:", 
      personImage ? personImage.length : 0,
      garmentImage ? garmentImage.length : 0
    );

    if (!personImage || !garmentImage) {
      console.error("Missing image(s) in request body");
      return res.status(400).json({
        status: "error",
        message: "Missing personImage or garmentImage"
      });
    }

    // Virtual Try-On リクエストボディ
    const body = {
      instances: [
        {
          personImage: {
            image: {
              // ★ data: や MIME プレフィックスは付けない生の Base64
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
        // 必須パラメータは一応入れておく
        sampleCount: 1,
        baseSteps: 32,
        personGeneration: "allow_adult",
        safetySetting: "block_medium_and_above",
        outputOptions: {
          mimeType: "image/png"
        }
      }
    };

    console.log("SENDING_TO_VERTEX summary:", {
      personLen: personImage.length,
      garmentLen: garmentImage.length
    });

    const accessToken =
