const express = require("express");
const db = require("../database/database");

const router = express.Router();

const authenticateToken =
  require("../middleware/auth");


/*
========================================
NOSMYBOOST🇧🇪
COMMANDES CLIENT
========================================
*/


/*
========================================
CRÉER UNE COMMANDE
========================================
*/

router.post(
  "/",
  authenticateToken,
  (req, res) => {

    const userId =
      Number(req.user.id);

    const serviceId =
      Number(req.body.serviceId);

    const link =
      String(
        req.body.link || ""
      ).trim();

    const quantity =
      Number(req.body.quantity);


    /*
    ====================================
    VALIDATION
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


    if (
      !Number.isInteger(serviceId) ||
      serviceId <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Service invalide."
      });

    }


    if (!link) {

      return res.status(400).json({
        success: false,
        message:
          "Veuillez entrer le lien."
      });

    }


    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Quantité invalide."
      });

    }


    /*
    ====================================
    RÉCUPÉRER SERVICE + CLIENT
    ====================================
    */

    db.get(
      `
      SELECT
        id,
        name,
        price,
        min_quantity,
        max_quantity,
        active
      FROM services
      WHERE id = ?
      `,
      [serviceId],
      (serviceError, service) => {

        if (serviceError) {

          console.error(
            serviceError
          );

          return res.status(500).json({
            success: false,
            message:
              "Erreur lors de la récupération du service."
          });

        }


        if (
          !service ||
          service.active !== 1
        ) {

          return res.status(404).json({
            success: false,
            message:
              "Service indisponible."
          });

        }


        /*
        ================================
        QUANTITÉ
        ================================
        */

        if (
          quantity <
          service.min_quantity
        ) {

          return res.status(400).json({
            success: false,
            message:
              `La quantité minimum est de ${service.min_quantity}.`
          });

        }


        if (
          quantity >
          service.max_quantity
        ) {

          return res.status(400).json({
            success: false,
            message:
              `La quantité maximum est de ${service.max_quantity}.`
          });

        }


        /*
        ================================
        CALCUL DU PRIX
        ================================
        */

        const totalPrice =
          Number(
            (
              service.price *
              quantity
            ).toFixed(2)
          );


        db.get(
          `
          SELECT
            id,
            balance
          FROM users
          WHERE id = ?
          `,
          [userId],
          (userError, user) => {

            if (userError) {

              console.error(
                userError
              );

              return res.status(500).json({
                success: false,
                message:
                  "Impossible de récupérer votre compte."
              });

            }


            if (!user) {

              return res.status(404).json({
                success: false,
                message:
                  "Utilisateur introuvable."
              });

            }


            /*
            ==============================
            SOLDE INSUFFISANT
            ==============================
            */

            if (
              Number(user.balance) <
              totalPrice
            ) {

              return res.status(400).json({

                success: false,

                message:
                  "Solde insuffisant. Veuillez recharger votre compte.",

                required:
                  totalPrice,

                balance:
                  Number(user.balance)

              });

            }


            /*
            ==============================
            TRANSACTION
            ==============================
            */

            db.serialize(() => {

              db.run(
                "BEGIN TRANSACTION"
              );


              /*
              ============================
              DÉDUIRE LE SOLDE
              ============================
              */

              db.run(
                `
                UPDATE users

                SET
                  balance =
                    balance - ?,

                  total_spent =
                    total_spent + ?

                WHERE id = ?
                  AND balance >= ?
                `,
                [
                  totalPrice,
                  totalPrice,
                  userId,
                  totalPrice
                ],
                function (balanceError) {

                  if (
                    balanceError ||
                    this.changes !== 1
                  ) {

                    db.run(
                      "ROLLBACK"
                    );

                    return res.status(400).json({
                      success: false,
                      message:
                        "Impossible de débiter le solde."
                    });

                  }


                  /*
                  ========================
                  CRÉER COMMANDE
                  ========================
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

                    VALUES
                    (
                      ?,
                      ?,
                      ?,
                      ?,
                      ?,
                      'pending'
                    )
                    `,
                    [
                      userId,
                      serviceId,
                      link,
                      quantity,
                      totalPrice
                    ],
                    function (orderError) {

                      if (orderError) {

                        db.run(
                          "ROLLBACK"
                        );

                        console.error(
                          orderError
                        );

                        return res.status(500).json({
                          success: false,
                          message:
                            "Impossible de créer la commande."
                        });

                      }


                      const orderId =
                        this.lastID;


                      /*
                      ====================
                      COMMIT
                      ====================
                      */

                      db.run(
                        "COMMIT",
                        commitError => {

                          if (commitError) {

                            db.run(
                              "ROLLBACK"
                            );

                            return res.status(500).json({
                              success: false,
                              message:
                                "Impossible de finaliser la commande."
                            });

                          }


                          res.status(201).json({

                            success: true,

                            message:
                              "Commande créée avec succès.",

                            order: {

                              id:
                                orderId,

                              service_id:
                                serviceId,

                              quantity,

                              price:
                                totalPrice,

                              status:
                                "pending"

                            }

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

  }
);


/*
========================================
MES COMMANDES
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
        ON services.id =
           orders.service_id

      WHERE orders.user_id = ?

      ORDER BY orders.id DESC
      `,
      [userId],
      (error, orders) => {

        if (error) {

          console.error(
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "Impossible de récupérer les commandes."
          });

        }


        res.json({

          success: true,

          orders

        });

      }
    );

  }
);


/*
========================================
UNE COMMANDE
========================================
*/

router.get(
  "/:id",
  authenticateToken,
  (req, res) => {

    const userId =
      Number(req.user.id);

    const orderId =
      Number(req.params.id);


    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "ID de commande invalide."
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
        ON services.id =
           orders.service_id

      WHERE orders.id = ?
        AND orders.user_id = ?
      `,
      [
        orderId,
        userId
      ],
      (error, order) => {

        if (error) {

          console.error(
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "Impossible de récupérer la commande."
          });

        }


        if (!order) {

          return res.status(404).json({
            success: false,
            message:
              "Commande introuvable."
          });

        }


        res.json({

          success: true,

          order

        });

      }
    );

  }
);


module.exports = router;
