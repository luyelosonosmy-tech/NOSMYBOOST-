const express = require("express");
const db = require("../database/database");

const router = express.Router();

const authenticateToken =
  require("../middleware/auth");


/*
========================================
NOSMYBOOST🇧🇪
CRÉER UNE DEMANDE DE DÉPÔT
========================================
*/

router.post(
  "/",
  authenticateToken,
  (req, res) => {

    const userId =
      Number(req.user.id);

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
    ====================================
    VALIDATION UTILISATEUR
    ====================================
    */

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {

      return res.status(401).json({
        success: false,
        message:
          "Session utilisateur invalide."
      });

    }


    /*
    ====================================
    VALIDATION MONTANT
    ====================================
    */

    if (
      !Number.isFinite(amount) ||
      amount < 1000
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Le montant minimum est de 1 000 CDF."
      });

    }


    /*
    ====================================
    MOYEN DE PAIEMENT
    ====================================
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
    ====================================
    PREUVE
    ====================================
    */

    if (
      proof.length < 3
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Veuillez fournir la référence ou la preuve du paiement."
      });

    }


    /*
    ====================================
    CRÉATION DU DÉPÔT
    ====================================
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
      (
        ?,
        ?,
        ?,
        ?,
        'pending'
      )
      `,
      [
        userId,
        amount,
        method,
        proof
      ],
      function (error) {

        if (error) {

          console.error(
            "Erreur création dépôt:",
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "Impossible d'enregistrer la demande de dépôt."
          });

        }


        /*
        ================================
        SUCCÈS
        ================================
        */

        return res.status(201).json({

          success: true,

          message:
            "Demande de dépôt envoyée. Elle est en attente de validation.",

          deposit: {

            id: this.lastID,

            user_id: userId,

            amount,

            method,

            status:
              "pending"

          }

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
      Number(req.user.id);


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
            "Erreur récupération dépôts:",
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


module.exports = router;
