/*
========================================
NOSMYBOOST🇧🇪
DEPOSIT ROUTES
========================================
*/

const express = require("express");

const db =
  require("../database/database");

const authenticateToken =
  require("../middleware/auth");

const router =
  express.Router();


/*
========================================
CRÉER UN DÉPÔT
========================================
*/

router.post(
  "/",
  authenticateToken,
  (req, res) => {

    const userId =
      req.user.id;

    const amount =
      Number(req.body.amount);

    const method =
      String(
        req.body.method || ""
      )
        .trim()
        .toLowerCase();

    const proof =
      String(
        req.body.proof || ""
      )
        .trim();


    /*
    ==============================
    VALIDATION MONTANT
    ==============================
    */

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Montant de dépôt invalide."

      });

    }


    /*
    ==============================
    MÉTHODES AUTORISÉES
    ==============================
    */

    const allowedMethods = [
      "airtel",
      "mpesa",
      "orange"
    ];


    if (
      !allowedMethods.includes(
        method
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Moyen de paiement invalide."

      });

    }


    /*
    ==============================
    PREUVE
    ==============================
    */

    if (!proof) {

      return res.status(400).json({

        success: false,

        message:
          "La référence du paiement est obligatoire."

      });

    }


    /*
    ==============================
    CRÉER LE DÉPÔT
    ==============================
    */

    db.run(
      `
      INSERT INTO deposits
      (
        user_id,
        amount,
        method,
        proof,
        status
      )

      VALUES
      (?, ?, ?, ?, 'pending')
      `,
      [
        userId,
        amount,
        method,
        proof
      ],
      function(error) {

        if (error) {

          console.error(
            "Deposit error:",
            error
          );


          return res.status(500).json({

            success: false,

            message:
              "Impossible d'enregistrer le dépôt."

          });

        }


        res.status(201).json({

          success: true,

          message:
            "Votre demande de dépôt a été envoyée. Elle sera vérifiée par un administrateur.",

          depositId:
            this.lastID,

          status:
            "pending"

        });

      }
    );

  }
);


/*
========================================
MES DÉPÔTS
========================================
*/

router.get(
  "/my",
  authenticateToken,
  (req, res) => {

    const userId =
      req.user.id;


    db.all(
      `
      SELECT
        id,
        amount,
        method,
        proof,
        status,
        created_at

      FROM deposits

      WHERE user_id = ?

      ORDER BY id DESC
      `,
      [userId],
      (error, deposits) => {

        if (error) {

          console.error(
            "Deposits error:",
            error
          );


          return res.status(500).json({

            success: false,

            message:
              "Impossible de récupérer vos dépôts."

          });

        }


        res.json({

          success: true,

          deposits

        });

      }
    );

  }
);


module.exports =
  router;
