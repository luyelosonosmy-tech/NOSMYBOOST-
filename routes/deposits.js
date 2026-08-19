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

  if (!PAYMENT_METHODS.includes(method)) {

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
  ENREGISTRER LE DÉPÔT
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

        amount,

        method,

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
