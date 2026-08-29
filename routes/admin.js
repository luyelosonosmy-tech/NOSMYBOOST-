"use strict";

const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


/*
========================================
NOSMYBOOST 🇧🇪
ADMIN
POSTGRESQL
========================================
*/


/*
========================================
VÉRIFICATION ADMIN
========================================
*/

function requireAdmin(req, res, next) {

  const adminEmail =
    String(process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();

  const userEmail =
    String(req.user?.email || "")
      .trim()
      .toLowerCase();


  if (
    !adminEmail ||
    !userEmail ||
    userEmail !== adminEmail
  ) {

    return res.status(403).json({

      success: false,

      message:
        "Accès administrateur refusé."

    });

  }


  next();

}


/*
========================================
VOIR LES DÉPÔTS EN ATTENTE
========================================
*/

router.get(
  "/deposits/pending",
  authenticateToken,
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await db.query(
          `
          SELECT
            deposits.id,
            deposits.user_id,
            deposits.amount,
            deposits.method,
            deposits.proof,
            deposits.status,
            deposits.created_at,

            users.name,
            users.email,
            users.whatsapp

          FROM deposits

          JOIN users
            ON users.id = deposits.user_id

          WHERE deposits.status = 'pending'

          ORDER BY deposits.id DESC
          `
        );


      const deposits =
        result.rows.map((deposit) => ({

          id:
            deposit.id,

          user_id:
            deposit.user_id,

          amount:
            Number(deposit.amount || 0),

          method:
            deposit.method,

          proof:
            deposit.proof,

          status:
            deposit.status,

          created_at:
            deposit.created_at,

          name:
            deposit.name,

          email:
            deposit.email,

          whatsapp:
            deposit.whatsapp

        }));


      return res.json({

        success: true,

        deposits

      });


    } catch (error) {

      console.error(
        "❌ Erreur dépôts admin PostgreSQL:",
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
VALIDER UN DÉPÔT
========================================
*/

router.post(
  "/deposits/:id/approve",
  authenticateToken,
  requireAdmin,
  async (req, res) => {

    const depositId =
      Number(req.params.id);


    /*
    ==============================
    VALIDATION ID
    ==============================
    */

    if (
      !Number.isInteger(depositId) ||
      depositId <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "ID de dépôt invalide."

      });

    }


    const client =
      await db.connect();


    try {

      /*
      ==============================
      TRANSACTION POSTGRESQL
      ==============================
      */

      await client.query(
        "BEGIN"
      );


      /*
      ==============================
      RÉCUPÉRER LE DÉPÔT
      ==============================
      */

      const depositResult =
        await client.query(
          `
          SELECT
            id,
            user_id,
            amount,
            method,
            proof,
            status

          FROM deposits

          WHERE id = $1

          FOR UPDATE
          `,
          [depositId]
        );


      const deposit =
        depositResult.rows[0];


      /*
      ==============================
      DÉPÔT INTROUVABLE
      ==============================
      */

      if (!deposit) {

        await client.query(
          "ROLLBACK"
        );


        return res.status(404).json({

          success: false,

          message:
            "Dépôt introuvable."

        });

      }


      /*
      ==============================
      DÉJÀ TRAITÉ
      ==============================
      */

      if (
        deposit.status !== "pending"
      ) {

        await client.query(
          "ROLLBACK"
        );


        return res.status(409).json({

          success: false,

          message:
            "Ce dépôt a déjà été traité."

        });

      }


      /*
      ==============================
      VÉRIFIER UTILISATEUR
      ==============================
      */
