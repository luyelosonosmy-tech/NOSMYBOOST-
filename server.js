const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    site: "NOSMYBOOST🇧🇪",
    status: "online"
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route introuvable."
  });
});

app.listen(PORT, () => {
  console.log(`NOSMYBOOST🇧🇪 lancé sur le port ${PORT}`);
});
