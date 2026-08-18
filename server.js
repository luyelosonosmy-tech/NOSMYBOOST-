const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;


/*
========================================
DATABASE
========================================
*/

require("./database/database");


/*
========================================
MIDDLEWARES
========================================
*/

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);


/*
========================================
API ROUTES
========================================
*/

const authRoutes =
  require("./routes/auth");

const servicesRoutes =
  require("./routes/services");

const ordersRoutes =
  require("./routes/orders");

const depositsRoutes =
  require("./routes/deposits");

const adminRoutes =
  require("./routes/admin");


/*
========================================
REGISTER API
========================================
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/services",
  servicesRoutes
);

app.use(
  "/api/orders",
  ordersRoutes
);

app.use(
  "/api/deposits",
  depositsRoutes
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
FRONTEND
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
ACCUEIL
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
404 API
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
404 FRONTEND
========================================
*/

app.use(
  (req, res) => {

    res.status(404).send(
      "Page introuvable."
    );

  }
);


/*
========================================
SERVER
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
