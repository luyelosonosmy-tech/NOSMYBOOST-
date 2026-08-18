const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialiser la base de données
require("./database/database");

// Routes
const authRoutes = require("./routes/auth");
const servicesRoutes = require("./routes/services");

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers publics
app.use(express.static(path.join(__dirname, "public")));

// ========================================
// ROUTES API
// ========================================

app.use("/api/auth", authRoutes);
app.use("/api/services", servicesRoutes);

// ========================================
// TEST SERVEUR
// ========================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    site: "NOSMYBOOST🇧🇪",
    status: "online"
  });
});

// ========================================
// PAGE D'ACCUEIL
// ========================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// ========================================
// ROUTE INTROUVABLE
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route introuvable."
  });
});

// ========================================
// DÉMARRAGE
// ========================================

app.listen(PORT, () => {
  console.log(
    `NOSMYBOOST🇧🇪 lancé sur le port ${PORT}`
  );
});
