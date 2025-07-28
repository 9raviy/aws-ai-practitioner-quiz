import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
});
