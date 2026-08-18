const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const PAYMENT_METHODS = [
  "airtel",
  "mpesa",
  "orange"
];


/*
========================================
CRÉER UNE DEMANDE DE DÉPÔT
========================================
*/

router.post("/", authenticateToken, (req, res) => {

  const userId = req.user.id;

  const amount = Number(req.body.amount);

  const method = String(
    req.body.method || ""
  )
    .trim()
    .toLowerCase();

  const proof = String(
    req.body.proof || ""
  ).trim();


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    return res.status(400).json({
      success: false,
      message: "Montant invalide."
    });

  }


  if (!PAYMENT_METHODS.includes(method)) {

    return res.status(400).json({
      success: false,
      message: "Moyen de paiement invalide."
    });

  }


  if (!proof) {

    return res.status(400).json({
      success: false,
      message:
        "La référence du paiement est obligatoire."
    });

  }


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
          "Erreur dépôt:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Impossible d'enregistrer le dépôt."
        });

      }


      return res.status(201).json({

        success: true,

        message:
          "Demande de dépôt envoyée avec succès.",

        depositId:
          this.lastID,

        status:
          "pending"

      });

    }
  );

});


/*
========================================
MES DÉPÔTS
========================================
*/

router.get(
  "/my",
  authenticateToken,
  (req, res) => {

    const userId = req.user.id;


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
              "Impossible de récupérer les dépôts."
          });

        }


        return res.json({

          success: true,

          deposits:
            deposits || []

        });

      }
    );

  }
);


module.exports = router;
