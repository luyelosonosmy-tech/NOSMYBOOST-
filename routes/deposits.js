"use strict";

const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const MIN_DEPOSIT = 2500;

const PAYMENT_METHODS = [
  "airtel",
  "mpesa",
  "orange"
];


/*
========================================
NOSMYBOOST 🇧🇪
DÉPÔTS
POSTGRESQL
========================================
*/


/*
========================================
CRÉER UNE DEMANDE DE DÉPÔT
========================================
*/

router.post(
  "/",
  authenticateToken,
  async (req, res) => {

    try {

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
        ).trim();


      /*
      ==============================
      VALIDATION UTILISATEUR
      ==============================
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
      ==============================
      MONTANT
      ==============================
      */

      if (
        !Number.isFinite(amount) ||
        amount < MIN_DEPOSIT
      ) {

        return res.status(400).json({

          success: false,

          message:
            `Le dépôt minimum est de ${MIN_DEPOSIT} CDF.`

        });

      }


      /*
      ==============================
      MOYEN DE PAIEMENT
      ==============================
      */

      if (
        !PAYMENT_METHODS.includes(method)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Moyen de paiement invalide."

        });

      }


      /*
      ==============================
      PREUVE / RÉFÉRENCE
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
      VÉRIFIER UTILISATEUR
      ==============================
      */

      const userResult =
        await db.query(
          `
          SELECT id
          FROM users
          WHERE id = $1
          `,
          [
            userId
          ]
        );


      if (
        userResult.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Utilisateur introuvable."

        });

      }


      /*
      ==============================
      ENREGISTRER LE DÉPÔT
      ==============================
      */

      const result =
        await db.query(
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
            $1,
            $2,
            $3,
            $4,
            'pending'
          )
          RETURNING
            id,
            amount,
            method,
            proof,
            status,
            created_at
          `,
          [
            userId,
            amount,
            method,
            proof
          ]
        );


      const deposit =
        result.rows[0];


      /*
      ==============================
      SUCCÈS
      ==============================
      */

      return res.status(201).json({

        success: true,

        message:
          "Demande de dépôt envoyée avec succès.",

        depositId:
          deposit.id,

        amount:
          Number(deposit.amount),

        method:
          deposit.method,

        status:
          deposit.status

      });


    } catch (error) {

      console.error(
        "Erreur dépôt PostgreSQL:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Impossible d'enregistrer le dépôt."

      });

    }

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
  async (req, res) => {

    try {

      const userId =
        Number(req.user.id);


      /*
      ==============================
      VALIDATION UTILISATEUR
      ==============================
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
      ==============================
      RÉCUPÉRER LES DÉPÔTS
      ==============================
      */

      const result =
        await db.query(
          `
          SELECT
            id,
            amount,
            method,
            proof,
            status,
            created_at
          FROM deposits
          WHERE user_id = $1
          ORDER BY id DESC
          `,
          [
            userId
          ]
        );


      /*
      ==============================
      FORMATER LES DONNÉES
      ==============================
      */

      const deposits =
        result.rows.map(
          deposit => ({

            id:
              deposit.id,

            amount:
              Number(
                deposit.amount || 0
              ),

            method:
              deposit.method,

            proof:
              deposit.proof,

            status:
              deposit.status,

            created_at:
              deposit.created_at

          })
        );


      /*
      ==============================
      RÉPONSE
      ==============================
      */

      return res.json({

        success: true,

        deposits

      });


    } catch (error) {

      console.error(
        "Erreur récupération dépôts PostgreSQL:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer les dépôts."

      });

    }

  }
);


/*
========================================
EXPORT
================================
