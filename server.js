const {
  getServices
} = require("./services/smm-africa");

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
STATIC FILES
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
API ROUTES
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
      "Erreur serveur:",
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
DÉMARRAGE
========================================
*/

app.listen(
  PORT,
  () => {

    console.log(
      `NOSMYBOOST🇧🇪 lancé sur le port ${PORT}`
    );

  }
);
