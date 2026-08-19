const express = require("express");
const db = require("../database/database");

const router = express.Router();

const authenticateToken =
  require("../middleware/auth");


/*
========================================
NOSMYBOOST🇧🇪
COMMANDES CLIENT + SMM AFRICA
========================================
*/

const SMM_API_URL =
  process.env.SMM_API_URL ||
  "https://smm.africa/api/v3";

const SMM_API_KEY =
  process.env.SMM_API_KEY;


/*
========================================
APPEL API SMM AFRICA
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

    try {

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


      /*
      ==============================
      RÉCUPÉRER LE SERVICE
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
                platform,
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

                if (error) {
                  return reject(error);
                }

                resolve(row);
              }
            );

          }
        );


      if (!service) {

        return res.status(404).json({
          success: false,
          message:
            "Service introuvable."
        });

      }


      if (
        Number(service.active) !== 1
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Ce service est actuellement désactivé."
        });

      }


      /*
      ==============================
      ID SMM AFRICA
      ==============================
      */

      if (
        service.provider_service_id === null ||
        service.provider_service_id === undefined ||
        String(
          service.provider_service_id
        ).trim() === ""
      ) {

        return res.status(400).json({

          success: false,

          message:
            `Le service "${service.name}" n'a pas encore de provider_service_id SMM Africa.`

        });

      }


      const providerServiceId =
        Number(
          service.provider_service_id
        );


      if (
        !Number.isInteger(
          providerServiceId
        ) ||
        providerServiceId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Le provider_service_id de ce service est invalide."

        });

      }


      /*
      ==============================
      LIMITES
      ==============================
      */

      const min =
        Number(
          service.min_quantity || 1
        );

      const max =
        Number(
          service.max_quantity ||
          1000000
        );


      if (quantity < min) {

        return res.status(400).json({

          success: false,

          message:
            `La quantité minimum est de ${min}.`

        });

      }


      if (quantity > max) {

        return res.status(400).json({

          success: false,

          message:
            `La quantité maximum est de ${max}.`

        });

      }


      /*
      ==============================
      PRIX NOSMYBOOST
      ==============================

      price = prix pour 1000
      */

      const servicePrice =
        Number(
          service.price
        );


      if (
        !Number.isFinite(
          servicePrice
        ) ||
        servicePrice <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Prix du service invalide."

        });

      }


      const totalPrice =
        Number(
          (
            quantity /
            1000 *
            servicePrice
          ).toFixed(2)
        );


      /*
      ==============================
      RÉCUPÉRER LE CLIENT
      ==============================
      */

      const user =
        await new Promise(
          (resolve, reject) => {

            db.get(
              `
              SELECT
                id,
                balance,
                total_spent
              FROM users
              WHERE id = ?
              `,
              [userId],
              (error, row) => {

                if (error) {
                  return reject(error);
                }

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

      const balance =
        Number(
          user.balance || 0
        );


      if (
        balance <
        totalPrice
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Solde insuffisant. Veuillez recharger votre compte.",

          required:
            totalPrice,

          balance

        });

      }


      /*
      ==============================
      ENVOYER À SMM AFRICA
      ==============================
      */

      console.log(
        `NOSMYBOOST → SMM Africa | service=${providerServiceId} | quantity=${quantity}`
      );


      const providerResponse =
        await smmAfricaRequest({

          action:
            "add",

          service:
            providerServiceId,

          link,

          quantity

        });


      /*
      ==============================
      RÉCUPÉRER ORDER ID
      ==============================
      */

      const providerOrderId =
        providerResponse.order;


      if (
        providerOrderId === undefined ||
        providerOrderId === null ||
        String(
          providerOrderId
        ).trim() === ""
      ) {

        console.error(
          "Réponse SMM Africa invalide:",
          providerResponse
        );

        return res.status(502).json({

          success: false,

          message:
            "SMM Africa n'a pas retourné d'ID de commande."

        });

      }


      /*
      ==============================
      TRANSACTION LOCALE
      ==============================
      */

      const localOrderId =
        await new Promise(
          (resolve, reject) => {

            db.serialize(() => {

              db.run(
                "BEGIN TRANSACTION",
                beginError => {

                  if (beginError) {
                    return reject(
                      beginError
                    );
                  }


                  /*
                  ========================
                  DÉBITER LE CLIENT
                  ========================
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
                    function (
                      balanceError
                    ) {

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


                      /*
                      ========================
                      ENREGISTRER COMMANDE
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
                          ?,
                          ?
                        )
                        `,
                        [
                          userId,
                          serviceId,
                          link,
                          quantity,
                          totalPrice,
                          "processing",
                          String(
                            providerOrderId
                          )
                        ],
                        function (
                          orderError
                        ) {

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


                          /*
                          ========================
                          COMMIT
                          ========================
                          */

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

      console.log(
        `NOSMYBOOST COMMANDE #${localOrderId} → SMM Africa #${providerOrderId}`
      );


      return res.status(201).json({

        success: true,

        message:
          "Commande envoyée avec succès. La livraison est en cours.",

        order: {

          id:
            localOrderId,

          provider_order_id:
            String(
              providerOrderId
            ),

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
        "NOSMYBOOST - Erreur commande:",
        error
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

          console.error(
            error
          );

          return res.status(500).json({

            success: false,

            message:
              "Impossible de récupérer les commandes."

          });

        }


        return res.json({

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


        return res.json({

          success: true,

          order

        });

      }
    );

  }
);


module.exports = router;
