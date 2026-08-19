/*
========================================
NOSMYBOOST 🇧🇪
PROVIDER - SMM AFRICA
========================================
*/

"use strict";

const express = require("express");

const router = express.Router();


/*
========================================
CONFIGURATION
========================================
*/

const SMM_API_URL =
  process.env.SMM_API_URL ||
  "https://smm.africa/api/v3";

const SMM_API_KEY =
  process.env.SMM_API_KEY;


/*
========================================
APPEL API SMM AFRICA
========================================
*/

async function smmAfricaRequest(payload) {

  if (!SMM_API_KEY) {

    throw new Error(
      "SMM_API_KEY manquante dans .env"
    );

  }


  const response =
    await fetch(
      SMM_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${SMM_API_KEY}`
        },

        body:
          JSON.stringify(payload)
      }
    );


  const data =
    await response
      .json()
      .catch(() => ({}));


  if (!response.ok) {

    throw new Error(
      data.error ||
      `SMM Africa HTTP ${response.status}`
    );

  }


  if (data.error) {

    throw new Error(
      data.error
    );

  }


  return data;

}


/*
========================================
TEST PROVIDER
========================================
*/

router.get(
  "/test",
  async (req, res) => {

    try {

      const data =
        await smmAfricaRequest({
          action: "balance"
        });


      res.json({

        success: true,

        provider:
          "SMM Africa",

        message:
          "Connexion SMM Africa réussie.",

        balance:
          data

      });

    } catch (error) {

      console.error(
        "Provider test:",
        error.message
      );


      res.status(502).json({

        success: false,

        provider:
          "SMM Africa",

        message:
          error.message

      });

    }

  }
);


/*
========================================
RÉCUPÉRER LES SERVICES SMM AFRICA
========================================
*/

router.get(
  "/services",
  async (req, res) => {

    try {

      const services =
        await smmAfricaRequest({

          action:
            "services"

        });


      res.json({

        success: true,

        provider:
          "SMM Africa",

        services

      });

    } catch (error) {

      console.error(
        "Erreur services provider:",
        error.message
      );


      res.status(502).json({

        success: false,

        message:
          "Impossible de récupérer les services SMM Africa."

      });

    }

  }
);


/*
========================================
SOLDE SMM AFRICA
========================================
*/

router.get(
  "/balance",
  async (req, res) => {

    try {

      const data =
        await smmAfricaRequest({

          action:
            "balance"

        });


      res.json({

        success: true,

        provider:
          "SMM Africa",

        balance:
          data.balance,

        currency:
          data.currency

      });

    } catch (error) {

      console.error(
        "Erreur balance provider:",
        error.message
      );


      res.status(502).json({

        success: false,

        message:
          "Impossible de récupérer le solde fournisseur."

      });

    }

  }
);


/*
========================================
EXPORT
========================================
*/

module.exports = router;
