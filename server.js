"use strict";

const express = require("express");
const path = require("path");
require("dotenv").config();

const db = require("./database/database");

const authRoutes =
  require("./routes/auth");

const serviceRoutes =
  require("./routes/services");

const orderRoutes =
  require("./routes/orders");

const depositRoutes =
  require("./routes/deposits");

const adminRoutes =
  require("./routes/admin");

const {
  startOrderStatusSync
} = require("./services/order-status");

const {
  syncServices
} = require("./scripts/sync-services");


/*
========================================
NOSMYBOOST🇧🇪
SERVEUR PRINCIPAL
========================================
*/

const app = express();

const PORT =
  process.env.PORT || 3000;


/*
========================================
MIDDLEWARES
========================================
*/

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);


/*
========================================
FICHIERS PUBLICS
========================================
*/

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


/*
========================================
ROUTES API
========================================
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/services",
  serviceRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/deposits",
  depositRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);


/*
========================================
HEALTH CHECK
========================================
*/

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      success: true,

      site:
        "NOSMYBOOST🇧🇪",

      status:
        "online"

    });

  }
);


/*
========================================
PAGE PRINCIPALE
========================================
*/

app.get(
  "/",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


/*
========================================
ERREUR API
========================================
*/

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        "Route API introuvable."

    });

  }
);


/*
========================================
ERREUR GÉNÉRALE
========================================
*/

app.use(
  (error, req, res, next) => {

    console.error(
      "❌ Erreur serveur:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Erreur interne du serveur."

    });

  }
);


/*
========================================
CONFIGURATION SMM AFRICA
========================================
*/

console.log(
  "========================================"
);

console.log(
  "NOSMYBOOST🇧🇪"
);

console.log(
  "SMM_API_KEY présente :",
  Boolean(
    process.env.SMM_API_KEY
  )
);

console.log(
  "SMM_API_URL :",
  process.env.SMM_API_URL ||
  "https://smm.africa/api/v3"
);

console.log(
  "========================================"
);


/*
========================================
DÉMARRAGE DU SERVEUR
========================================
*/

app.listen(
  PORT,
  async () => {

    console.log(
      `🚀 NOSMYBOOST🇧🇪 lancé sur le port ${PORT}`
    );


    /*
    ========================================
    SYNCHRONISATION DES SERVICES
    ========================================
    */

    try {

      await syncServices();

      console.log(
        "✅ Services SMM Africa synchronisés."
      );

    } catch (error) {

      console.error(
        "❌ Synchronisation services échouée:",
        error.message
      );

    }


    /*
    ========================================
    SYNCHRONISATION DES COMMANDES
    ========================================
    */

    try {

      startOrderStatusSync();

      console.log(
        "✅ Synchronisation automatique des commandes activée."
      );

    } catch (error) {

      console.error(
        "❌ Synchronisation commandes échouée:",
        error.message
      );

    }

  }
);
