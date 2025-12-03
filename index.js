import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "40mb" }));

const PROJECT_ID = "kisekaeai";
const LOCATION = "us-central1";
const MODEL_ID = "virtual-try-on-preview-08-04";

const ENDPOINT =
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

async function getToken() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || token;
}

app.post("/tryon", async (req, res) => {
  try {
    const { personImage, garmentImage } = req.body;

    if (!personImage || !garmentImage) {
      return res.status(400).json({
        status: "error",
        message: "Missing personImage or garmentImage",
      });
    }

    // ❗ 余計な data:image/png;base64, をつけずにそのまま渡す
    const body = {
      instances: [
        {
          person_image_bytes: { bytesBase64Encoded: personImage },
          garment_image_bytes: { bytesBase64Encoded: garmentImage }
        }
      ],
      parameters: {}
    };

    const token = await getToken();

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // エラー
    if (response.status !== 200) {
      return res.status(response.status).json({
        status: "vertex_ai_error",
        http_code: response.status,
        message: data.error?.message ?? "Unknown Vertex AI error",
        raw: data
      });
    }

    // 正常系：ここで返すだけ
    return res.json(data);

  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message || "Internal server error",
    });
  }
});

app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Google VTO Gateway running"));
