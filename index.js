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
      sampleCount: 1,
      personGeneration: "allow_all"
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
