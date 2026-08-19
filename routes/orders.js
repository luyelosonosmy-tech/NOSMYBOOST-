const express = require("express");
const db = require("../database/database");

const router = express.Router();

const authenticateToken =
  require("../middleware/auth");

const SMM_API_URL =
  "https://smm.africa/api/v3";

const SMM_API_KEY =
  process.env.SMM_API_KEY;


/*
========================================
NOSMYBOOST🇧🇪
COMMANDES CLIENT + SMM AFRICA
========================================
*/


/*
========================================
APPEL SMM AFRICA
========================================
*/

async function smmAfricaRequest(payload) {

  if (!SMM_API_KEY) {

    throw new Error(
      "SMM_API_KEY manquante dans .env."
    );

  }


  const response =
    await fetch(
      SMM_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${SMM_API_KEY}`
        },

        body:
          JSON.stringify(payload)
      }
    );


  const data =
    await response
      .json()
      .catch(() => ({}));


  if (!response.ok) {

    throw new Error(
      data.error ||
      `SMM Africa HTTP ${response.status}`
    );

  }


  if (data.error) {

    throw new Error(
      data.error
    );

  }


  return data;

}


/*
========================================
CRÉER UNE COMMANDE
========================================
*/

router.post(
  "/",
  authenticateToken,
  async (req, res) => {

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
    ==============================
    VALIDATION
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


    try {

      /*
      ==============================
      RÉCUPÉRER SERVICE
      ==============================
      */

      const service =
        await new Promise(
          (resolve, reject) => {

            db.get(
              `
              SELECT
                id,
                name,
                price,
                min_quantity,
                max_quantity,
                provider,
                provider_service_id,
                active
              FROM services
              WHERE id = ?
              `,
              [serviceId],
              (error, row) => {

                if (error)
                  return reject(error);

                resolve(row);

              }
            );

          }
        );


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
      ==============================
      VÉRIFIER FOURNISSEUR
      ==============================
      */

      if (
        String(
          service.provider || ""
        ).toLowerCase() !==
        "smm africa"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Ce service n'est pas encore connecté au fournisseur."

        });

      }


      if (
        !service.provider_service_id
      ) {

        return res.status(400).json({

          success: false,

          message:
            "ID fournisseur manquant pour ce service."

        });

      }


      /*
      ==============================
      LIMITES
      ==============================
      */

      if (
        quantity <
        Number(service.min_quantity)
      ) {

        return res.status(400).json({

          success: false,

          message:
            `La quantité minimum est de ${service.min_quantity}.`

        });

      }


      if (
        quantity >
        Number(service.max_quantity)
      ) {

        return res.status(400).json({

          success: false,

          message:
            `La quantité maximum est de ${service.max_quantity}.`

        });

      }


      /*
      ==============================
      PRIX CLIENT
      ==============================

      price = prix NOSMYBOOST pour 1000
      */

      const totalPrice =
        Number(
          (
            (quantity / 1000) *
            Number(service.price)
          ).toFixed(2)
        );


      if (
        !Number.isFinite(totalPrice) ||
        totalPrice <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Prix du service invalide."

        });

      }


      /*
      ==============================
      RÉCUPÉRER CLIENT
      ==============================
      */

      const user =
        await new Promise(
          (resolve, reject) => {

            db.get(
              `
              SELECT
                id,
                balance
              FROM users
              WHERE id = ?
              `,
              [userId],
              (error, row) => {

                if (error)
                  return reject(error);

                resolve(row);

              }
            );

          }
        );


      if (!user) {

        return res.status(404).json({

          success: false,

          message:
            "Utilisateur introuvable."

        });

      }


      /*
      ==============================
      SOLDE
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
      ENVOI CHEZ SMM AFRICA
      ==============================
      */

      const providerResponse =
        await smmAfricaRequest({

          action:
            "add",

          service:
            Number(
              service.provider_service_id
            ),

          link,

          quantity

        });


      /*
      ==============================
      ID FOURNISSEUR
      ==============================
      */

      const providerOrderId =
        providerResponse.order;


      if (
        !providerOrderId
      ) {

        console.error(
          "Réponse SMM Africa invalide:",
          providerResponse
        );

        return res.status(502).json({

          success: false,

          message:
            "Le fournisseur n'a pas retourné de numéro de commande."

        });

      }


      /*
      ==============================
      TRANSACTION LOCALE
      ==============================
      */

      await new Promise(
        (resolve, reject) => {

          db.serialize(() => {

            db.run(
              "BEGIN TRANSACTION",
              beginError => {

                if (beginError)
                  return reject(beginError);


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

                      return db.run(
                        "ROLLBACK",
                        () => {

                          reject(
                            new Error(
                              "Impossible de débiter le solde."
                            )
                          );

                        }
                      );

                    }


                    db.run(
                      `
                      INSERT INTO orders
                      (
                        user_id,
                        service_id,
                        link,
                        quantity,
                        price,
                        status,
                        provider_order_id
                      )

                      VALUES
                      (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'processing',
                        ?
                      )
                      `,
                      [
                        userId,
                        serviceId,
                        link,
                        quantity,
                        totalPrice,
                        String(
                          providerOrderId
                        )
                      ],
                      function (orderError) {

                        if (orderError) {

                          return db.run(
                            "ROLLBACK",
                            () => {

                              reject(
                                orderError
                              );

                            }
                          );

                        }


                        const orderId =
                          this.lastID;


                        db.run(
                          "COMMIT",
                          commitError => {

                            if (
                              commitError
                            ) {

                              return db.run(
                                "ROLLBACK",
                                () => {

                                  reject(
                                    commitError
                                  );

                                }
                              );

                            }


                            resolve(
                              orderId
                            );

                          }
                        );

                      }
                    );

                  }
                );

              }
            );

          });

        }
      );


      /*
      ==============================
      SUCCÈS
      ==============================
      */

      return res.status(201).json({

        success: true,

        message:
          "Commande envoyée avec succès. La livraison est en cours.",

        order: {

          id:
            providerOrderId,

          service_id:
            serviceId,

          quantity,

          price:
            totalPrice,

          status:
            "processing"

        }

      });


    } catch (error) {

      console.error(
        "Erreur commande SMM Africa:",
        error.message
      );


      return res.status(502).json({

        success: false,

        message:
          error.message ||
          "Impossible d'envoyer la commande au fournisseur."

      });

    }

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

          console.error(error);

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

          console.error(error);

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
