app.post("/tryon", async (req, res) => {
  try {
    const { personImage, garmentImage } = req.body;

    if (!personImage || !garmentImage) {
      return res.status(400).json({
        status: "error",
        message: "Missing personImage or garmentImage",
      });
    }

    // ★ Google Virtual Try-On の正しいペイロード
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
      parameters: { sampleCount: 1 }
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
      return res.status(response.status).json({
        status: "vertex_ai_error",
        http_code: response.status,
        message: data.error?.message || "Vertex AI error",
        raw: data
      });
    }

    return res.json(data);

  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Cloud Run internal error",
      detail: err.message
    });
  }
});
