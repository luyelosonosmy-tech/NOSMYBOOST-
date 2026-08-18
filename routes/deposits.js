const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/*
========================================
MOYENS DE PAIEMENT
========================================
*/

const PAYMENT_METHODS = {
  airtel: {
    name: "Airtel Money",
    currency: "CDF",
    number: ""
  },

  mpesa: {
    name: "Vodacom M-Pesa",
    currency: "CDF",
    number: ""
  },

  orange: {
    name: "Orange Money",
    currency: "CDF",
    number: ""
  }
};


/*
========================================
AFFICHER LES MOYENS DE PAIEMENT
========================================
*/

router.get("/methods", (req, res) => {

  const methods = Object.entries(PAYMENT_METHODS).map(
    ([id, method]) => ({
      id,
      name: method.name,
      currency: method.currency
    })
  );

  res.json({
    success: true,
    methods
  });

});


/*
========================================
CRÉER UNE DEMANDE DE DÉPÔT
========================================
*/

router.post("/", authenticateToken, (req, res) => {

  const {
    amount,
    method,
    proof
  } = req.body;

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {

    return res.status(400).json({
      success: false,
      message: "Montant de dépôt invalide."
    });

  }

  if (!PAYMENT_METHODS[method]) {

    return res.status(400).json({
      success: false,
      message: "Méthode de paiement invalide."
    });

  }

  if (!proof || !String(proof).trim()) {

    return res.status(400).json({
      success: false,
      message: "La preuve de paiement est obligatoire."
    });

  }

  db.run(
    `
    INSERT INTO deposits
    (user_id, amount, method, proof, status)
    VALUES (?, ?, ?, ?, 'pending')
    `,
    [
      req.user.id,
      numericAmount,
      method,
      String(proof).trim()
    ],
    function (err) {

      if (err) {

        console.error("Erreur création dépôt :", err);

        return res.status(500).json({
          success: false,
          message: "Impossible d'enregistrer le dépôt."
        });

      }

      res.status(201).json({
        success: true,
        message: "Demande de dépôt envoyée. Elle est en attente de validation.",
        depositId: this.lastID
      });

    }
  );

});


/*
========================================
HISTORIQUE DES DÉPÔTS DU CLIENT
========================================
*/

router.get("/my", authenticateToken, (req, res) => {

  db.all(
    `
    SELECT
      id,
      amount,
      method,
      status,
      created_at
    FROM deposits
    WHERE user_id = ?
    ORDER BY id DESC
    `,
    [req.user.id],
    (err, deposits) => {

      if (err) {

        console.error("Erreur historique dépôts :", err);

        return res.status(500).json({
          success: false,
          message: "Impossible de récupérer l'historique."
        });

      }

      res.json({
        success: true,
        deposits
      });

    }
  );

});


module.exports = router;
