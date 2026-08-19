const express = require("express");
const crypto = require("crypto");
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
  "https://smm.africa/api/v3";

const SMM_API_KEY =
  process.env.SMM_API_KEY;


/*
========================================
VÉRIFIER CONFIGURATION API
========================================
*/

function checkSmmConfig() {

  if (!SMM_API_KEY) {

    console.error(
      "SMM_API_KEY n'est pas configurée dans Render."
    );

    return false;
  }

  return true;
}


/*
========================================
APPEL API SMM AFRICA
========================================
*/

async function smmRequest(
  payload,
  idempotencyKey = null
) {

  if (!checkSmmConfig()) {

    throw new Error(
      "API fournisseur non configurée."
    );
  }


  const headers = {

    "Content-Type":
      "application/json",

    "Authorization":
      `Bearer ${SMM_API_KEY}`

  };


  if (idempotencyKey) {

    headers["Idempotency-Key"] =
      idempotencyKey;

  }


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      60000
    );


  try {

    const response =
      await fetch(
        SMM_API_URL,
        {
          method: "POST",

          headers,

          body:
            JSON.stringify(payload),

          signal:
            controller.signal
        }
      );


    const data =
      await response.json()
        .catch(() => ({}));


    if (!response.ok) {

      console.error(
        "SMM Africa HTTP:",
        response.status
      );

      throw new Error(
        data.error ||
        "Le fournisseur a refusé la demande."
      );

    }


    if (data.error) {

      throw new Error(
        data.error
      );

    }


    return data;


  } catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {

      throw new Error(
        "Le fournisseur met trop de temps à répondre."
      );

    }


    throw error;


  } finally {

    clearTimeout(timeout);

  }

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
    RÉCUPÉRER SERVICE
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
        provider,
        provider_service_id,
        active
      FROM services
      WHERE id = ?
      `,
      [serviceId],
      async (
        serviceError,
        service
      ) => {

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
          Number(service.active) !== 1
        ) {

          return res.status(404).json({

            success: false,

            message:
              "Service indisponible."

          });

        }


        /*
        ================================
        ID FOURNISSEUR
        ================================
        */

        const providerServiceId =
          String(
            service.provider_service_id ||
            ""
          ).trim();


        if (!providerServiceId) {

          return res.status(400).json({

            success: false,

            message:
              "Ce service n'est pas encore connecté au fournisseur."

          });

        }


        /*
        ================================
        QUANTITÉ
        ================================
        */

        const min =
          Number(
            service.min_quantity
          );

        const max =
          Number(
            service.max_quantity
          );


        if (
          quantity < min
        ) {

          return res.status(400).json({

            success: false,

            message:
              `La quantité minimum est de ${min}.`

          });

        }


        if (
          quantity > max
        ) {

          return res.status(400).json({

            success: false,

            message:
              `La quantité maximum est de ${max}.`

          });

        }


        /*
        ================================
        PRIX CLIENT
        ================================
        
        price = prix pour 1000
        */

        const pricePer1000 =
          Number(
            service.price
          );


        const totalPrice =
          Number(
            (
              pricePer1000 *
              quantity /
              1000
            ).toFixed(2)
          );


        if (
          !Number.isFinite(
            totalPrice
          ) ||
          totalPrice <= 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Prix du service invalide."

          });

        }


        /*
        ====================================
        RÉCUPÉRER CLIENT
        ====================================
        */

        db.get(
          `
          SELECT
            id,
            balance
          FROM users
          WHERE id = ?
          `,
          [userId],
          async (
            userError,
            user
          ) => {

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
            ================================
            SOLDE
            ================================
            */

            const currentBalance =
              Number(
                user.balance || 0
              );


            if (
              currentBalance <
              totalPrice
            ) {

              return res.status(400).json({

                success: false,

                message:
                  "Solde insuffisant. Veuillez recharger votre compte.",

                required:
                  totalPrice,

                balance:
                  currentBalance

              });

            }


            /*
            ====================================
            IDÉMPOTENCE
            ====================================
            */

            const idempotencyKey =
              crypto.randomUUID();


            /*
            ====================================
            ENVOYER CHEZ SMM AFRICA
            ====================================
            */

            let providerResponse;


            try {

              providerResponse =
                await smmRequest(
                  {

                    action:
                      "add",

                    service:
                      Number.isInteger(
                        Number(
                          providerServiceId
                        )
                      )
                        ? Number(
                            providerServiceId
                          )
                        : providerServiceId,

                    link,

                    quantity,

                    idempotency_key:
                      idempotencyKey,

                    source_flow:
                      "NOSMYBOOST"

                  },

                  idempotencyKey
                );


            } catch (providerError) {

              console.error(
                "Erreur SMM Africa:",
                providerError.message
              );


              return res.status(502).json({

                success: false,

                message:
                  "La commande n'a pas pu être envoyée au fournisseur. Votre solde n'a pas été débité."

              });

            }


            /*
            ====================================
            RÉCUPÉRER ID FOURNISSEUR
            ====================================
            */

            const providerOrderId =
              providerResponse.order;


            if (
              providerOrderId ===
              undefined ||
              providerOrderId ===
              null
            ) {

              console.error(
                "Réponse SMM Africa sans ID:",
                providerResponse
              );


              return res.status(502).json({

                success: false,

                message:
                  "Le fournisseur n'a pas retourné de numéro de commande. Votre solde n'a pas été débité."

              });

            }


            /*
            ====================================
            DÉBIT + COMMANDE LOCALE
            ====================================
            */

            db.serialize(() => {

              db.run(
                "BEGIN TRANSACTION"
              );


              /*
              ================================
              DÉBITER CLIENT
              ================================
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

                    db.run(
                      "ROLLBACK"
                    );


                    /*
                    ATTENTION :
                    la commande fournisseur existe
                    déjà.
                    */

                    console.error(
                      "Commande fournisseur créée mais débit local impossible.",
                      {
                        providerOrderId,
                        userId,
                        totalPrice
                      }
                    );


                    return res.status(500).json({

                      success: false,

                      message:
                        "La commande fournisseur a été créée mais votre solde local n'a pas pu être mis à jour. Contactez l'administration avec votre numéro de commande.",

                      provider_order_id:
                        String(
                          providerOrderId
                        )

                    });

                  }


                  /*
                  ================================
                  CRÉER COMMANDE LOCALE
                  ================================
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
                      "pending",
                      String(
                        providerOrderId
                      )
                    ],
                    function (
                      orderError
                    ) {

                      if (orderError) {

                        db.run(
                          "ROLLBACK"
                        );


                        console.error(
                          "Erreur commande locale:",
                          orderError
                        );


                        return res.status(500).json({

                          success: false,

                          message:
                            "La commande fournisseur existe mais l'enregistrement local a échoué.",

                          provider_order_id:
                            String(
                              providerOrderId
                            )

                        });

                      }


                      const orderId =
                        this.lastID;


                      /*
                      ================================
                      COMMIT
                      ================================
                      */

                      db.run(
                        "COMMIT",
                        commitError => {

                          if (commitError) {

                            db.run(
                              "ROLLBACK"
                            );


                            console.error(
                              "Erreur COMMIT:",
                              commitError
                            );


                            return res.status(500).json({

                              success: false,

                              message:
                                "La commande fournisseur existe mais la finalisation locale a échoué.",

                              provider_order_id:
                                String(
                                  providerOrderId
                                )

                            });

                          }


                          /*
                          ================================
                          SUCCÈS
                          ================================
                          */

                          return res.status(201).json({

                            success: true,

                            message:
                              "Commande envoyée avec succès. La livraison va commencer.",

                            order: {

                              id:
                                orderId,

                              service_id:
                                serviceId,

                              quantity,

                              price:
                                totalPrice,

                              status:
                                "pending",

                              provider_order_id:
                                String(
                                  providerOrderId
                                )

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
SYNCHRONISER STATUT D'UNE COMMANDE
========================================
*/

router.get(
  "/:id/status",
  authenticateToken,
  async (req, res) => {

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
        id,
        provider_order_id,
        status
      FROM orders
      WHERE id = ?
        AND user_id = ?
      `,
      [
        orderId,
        userId
      ],
      async (
        error,
        order
      ) => {

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


        if (
          !order.provider_order_id
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Cette commande n'a pas encore de numéro fournisseur."

          });

        }


        try {

          const provider =
            await smmRequest({

              action:
                "status",

              order:
                String(
                  order.provider_order_id
                )

            });


          const providerStatus =
            String(
              provider.status ||
              ""
            ).toLowerCase();


          let localStatus =
            "pending";


          if (
            providerStatus ===
              "completed" ||
            providerStatus ===
              "complete"
          ) {

            localStatus =
              "completed";

          } else if (
            providerStatus ===
              "cancelled" ||
            providerStatus ===
              "canceled" ||
            providerStatus ===
              "refunded"
          ) {

            localStatus =
              "cancelled";

          } else if (
            providerStatus ===
              "partial"
          ) {

            localStatus =
              "partial";

          } else if (
            providerStatus ===
              "failed"
          ) {

            localStatus =
              "failed";

          } else {

            localStatus =
              "processing";

          }


          db.run(
            `
            UPDATE orders
            SET status = ?
            WHERE id = ?
              AND user_id = ?
            `,
            [
              localStatus,
              orderId,
              userId
            ],
            updateError => {

              if (updateError) {

                console.error(
                  up
