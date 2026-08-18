const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/*
========================================
VÉRIFICATION ADMIN
========================================
*/

function requireAdmin(req, res, next) {

  if (!req.user || req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: "Accès administrateur refusé."
    });
  }

  next();
}


/*
========================================
VOIR LES DÉPÔTS EN ATTENTE
========================================
*/

router.get("/deposits/pending", authenticateToken, requireAdmin, (req, res) => {

  db.all(
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
    JOIN users ON users.id = deposits.user_id
    WHERE deposits.status = 'pending'
    ORDER BY deposits.id DESC
    `,
    [],
    (err, deposits) => {

      if (err) {
        console.error("Erreur dépôts admin :", err);

        return res.status(500).json({
          success: false,
          message: "Impossible de récupérer les dépôts."
        });
      }

      res.json({
        success: true,
        deposits
      });

    }
  );

});


/*
========================================
VALIDER UN DÉPÔT
========================================
*/

router.post("/deposits/:id/approve", authenticateToken, requireAdmin, (req, res) => {

  const depositId = Number(req.params.id);

  if (!Number.isInteger(depositId) || depositId <= 0) {
    return res.status(400).json({
      success: false,
      message: "ID de dépôt invalide."
    });
  }

  db.get(
    `
    SELECT *
    FROM deposits
    WHERE id = ?
    `,
    [depositId],
    (err, deposit) => {

      if (err) {
        console.error(err);

        return res.status(500).json({
          success: false,
          message: "Erreur de base de données."
        });
      }

      if (!deposit) {
        return res.status(404).json({
          success: false,
          message: "Dépôt introuvable."
        });
      }

      if (deposit.status !== "pending") {
        return res.status(409).json({
          success: false,
          message: "Ce dépôt a déjà été traité."
        });
      }

      db.serialize(() => {

        db.run("BEGIN TRANSACTION");

        db.run(
          `
          UPDATE deposits
          SET status = 'approved'
          WHERE id = ?
            AND status = 'pending'
          `,
          [depositId],
          function (updateErr) {

            if (updateErr || this.changes !== 1) {

              db.run("ROLLBACK");

              return res.status(500).json({
                success: false,
                message: "Impossible de valider le dépôt."
              });

            }

            db.run(
              `
              UPDATE users
              SET
                balance = balance + ?,
                total_deposited = total_deposited + ?
              WHERE id = ?
              `,
              [
                deposit.amount,
                deposit.amount,
                deposit.user_id
              ],
              function (balanceErr) {

                if (balanceErr || this.changes !== 1) {

                  db.run("ROLLBACK");

                  return res.status(500).json({
                    success: false,
                    message: "Impossible de créditer le solde."
                  });

                }

                db.run("COMMIT", (commitErr) => {

                  if (commitErr) {

                    db.run("ROLLBACK");

                    return res.status(500).json({
                      success: false,
                      message: "Impossible de finaliser le dépôt."
                    });

                  }

                  res.json({
                    success: true,
                    message: "Dépôt validé et solde crédité."
                  });

                });

              }
            );

          }
        );

      });

    }
  );

});


/*
========================================
REFUSER UN DÉPÔT
========================================
*/

router.post("/deposits/:id/reject", authenticateToken, requireAdmin, (req, res) => {

  const depositId = Number(req.params.id);

  if (!Number.isInteger(depositId) || depositId <= 0) {
    return res.status(400).json({
      success: false,
      message: "ID de dépôt invalide."
    });
  }

  db.run(
    `
    UPDATE deposits
    SET status = 'rejected'
    WHERE id = ?
      AND status = 'pending'
    `,
    [depositId],
    function (err) {

      if (err) {
        console.error(err);

        return res.status(500).json({
          success: false,
          message: "Impossible de refuser le dépôt."
        });
      }

      if (this.changes !== 1) {
        return res.status(404).json({
          success: false,
          message: "Dépôt introuvable ou déjà traité."
        });
      }

      res.json({
        success: true,
        message: "Dépôt refusé."
      });

    }
  );

});


module.exports = router;
