import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/tryon", (req, res) => {
  res.json({ received: true, body: req.body });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running"));

