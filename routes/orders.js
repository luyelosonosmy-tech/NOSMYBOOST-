const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/*
========================================
CRÉER UNE COMMANDE
========================================
*/

router.post("/", authenticateToken, (req, res) => {

  const {
    serviceId,
    link,
    quantity
  } = req.body;

  const numericServiceId = Number(serviceId);
  const numericQuantity = Number(quantity);

  if (
    !Number.isInteger(numericServiceId) ||
    numericServiceId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Service invalide."
    });
  }

  if (
    !Number.isInteger(numericQuantity) ||
    numericQuantity <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Quantité invalide."
    });
  }

  if (!link || !String(link).trim()) {
    return res.status(400).json({
      success: false,
      message: "Le lien est obligatoire."
    });
  }


  /*
  ======================================
  RÉCUPÉRER SERVICE + UTILISATEUR
  ======================================
  */

  db.get(
    `
    SELECT *
    FROM services
    WHERE id = ?
      AND active = 1
    `,
    [numericServiceId],
    (serviceError, service) => {

      if (serviceError) {
        console.error(serviceError);

        return res.status(500).json({
          success: false,
          message: "Erreur de base de données."
        });
      }

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service introuvable."
        });
      }


      /*
      ==================================
      VÉRIFIER QUANTITÉ
      ==================================
      */

      if (
        numericQuantity < service.min_quantity ||
        numericQuantity > service.max_quantity
      ) {

        return res.status(400).json({
          success: false,
          message:
            `La quantité doit être comprise entre ${service.min_quantity} et ${service.max_quantity}.`
        });

      }


      /*
      ==================================
      CALCULER LE PRIX
      ==================================
      */

      const totalPrice =
        Number(service.price) * numericQuantity;


      db.get(
        `
        SELECT
          id,
          balance
        FROM users
        WHERE id = ?
        `,
        [req.user.id],
        (userError, user) => {

          if (userError) {
            console.error(userError);

            return res.status(500).json({
              success: false,
              message: "Erreur de base de données."
            });
          }

          if (!user) {
            return res.status(404).json({
              success: false,
              message: "Utilisateur introuvable."
            });
          }


          /*
          ==============================
          VÉRIFIER SOLDE
          ==============================
          */

          if (Number(user.balance) < totalPrice) {

            return res.status(400).json({
              success: false,
              message: "Solde insuffisant."
            });

          }


          /*
          ==============================
          TRANSACTION
          ==============================
          */

          db.serialize(() => {

            db.run("BEGIN TRANSACTION");


            db.run(
              `
              UPDATE users
              SET
                balance = balance - ?,
                total_spent = total_spent + ?
              WHERE id = ?
                AND balance >= ?
              `,
              [
                totalPrice,
                totalPrice,
                req.user.id,
                totalPrice
              ],
              function (balanceError) {

                if (
                  balanceError ||
                  this.changes !== 1
                ) {

                  db.run("ROLLBACK");

                  return res.status(400).json({
                    success: false,
                    message: "Impossible de débiter le solde."
                  });

                }


                /*
                ==========================
                CRÉER COMMANDE
                ==========================
                */

                db.run(
                  `
                  INSERT INTO orders
                  (
                    user_id,
                    service_id,
                    link,
                    quantity,
                    price,
                    status
                  )
                  VALUES (?, ?, ?, ?, ?, 'pending')
                  `,
                  [
                    req.user.id,
                    numericServiceId,
                    String(link).trim(),
                    numericQuantity,
                    totalPrice
                  ],
                  function (orderError) {

                    if (orderError) {

                      db.run("ROLLBACK");

                      console.error(orderError);

                      return res.status(500).json({
                        success: false,
                        message: "Impossible de créer la commande."
                      });

                    }


                    db.run(
                      "COMMIT",
                      (commitError) => {

                        if (commitError) {

                          db.run("ROLLBACK");

                          return res.status(500).json({
                            success: false,
                            message: "Impossible de finaliser la commande."
                          });

                        }


                        res.status(201).json({

                          success: true,

                          message:
                            "Commande créée avec succès.",

                          orderId:
                            this.lastID,

                          amount:
                            totalPrice,

                          status:
                            "pending"

                        });

                      }
                    );

                  }
                );

              }
            );

          });

        }
      );

    }
  );

});


/*
========================================
MES COMMANDES
========================================
*/

router.get("/my", authenticateToken, (req, res) => {

  db.all(
    `
    SELECT
      orders.id,
      orders.link,
      orders.quantity,
      orders.price,
      orders.status,
      orders.provider_order_id,
      orders.created_at,
      services.platform,
      services.name AS service_name
    FROM orders
    JOIN services
      ON services.id = orders.service_id
    WHERE orders.user_id = ?
    ORDER BY orders.id DESC
    `,
    [req.user.id],
    (err, orders) => {

      if (err) {

        console.error(err);

        return res.status(500).json({
          success: false,
          message: "Impossible de récupérer les commandes."
        });

      }

      res.json({
        success: true,
        orders
      });

    }
  );

});


/*
========================================
UNE COMMANDE
========================================
*/

router.get("/:id", authenticateToken, (req, res) => {

  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {

    return res.status(400).json({
      success: false,
      message: "ID de commande invalide."
    });

  }


  db.get(
    `
    SELECT
      orders.id,
      orders.link,
      orders.quantity,
      orders.price,
      orders.status,
      orders.provider_order_id,
      orders.created_at,
      services.platform,
      services.name AS service_name
    FROM orders
    JOIN services
      ON services.id = orders.service_id
    WHERE orders.id = ?
      AND orders.user_id = ?
    `,
    [
      orderId,
      req.user.id
    ],
    (err, order) => {

      if (err) {

        console.error(err);

        return res.status(500).json({
          success: false,
          message: "Impossible de récupérer la commande."
        });

      }

      if (!order) {

        return res.status(404).json({
          success: false,
          message: "Commande introuvable."
        });

      }

      res.json({
        success: true,
        order
      });

    }
  );

});


module.exports = router;
