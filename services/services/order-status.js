"use strict";

const db = require("../database/database");


/*
========================================
NOSMYBOOST🇧🇪
SYNCHRONISATION STATUTS SMM AFRICA
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

async function smmAfricaStatus(providerOrderId) {

  if (!SMM_API_KEY) {

    throw new Error(
      "SMM_API_KEY manquante."
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
          JSON.stringify({

            action:
              "status",

            order:
              String(
                providerOrderId
              )

          })
        }
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
NORMALISER LE STATUT
========================================
*/

function normalizeStatus(status) {

  const value =
    String(
      status || ""
    )
      .trim()
      .toLowerCase();


  if (
    value === "completed" ||
    value === "complete"
  ) {

    return "completed";

  }


  if (
    value === "processing" ||
    value === "in progress" ||
    value === "inprogress"
  ) {

    return "processing";

  }


  if (
    value === "pending" ||
    value === "queued" ||
    value === "queue"
  ) {

    return "pending";

  }


  if (
    value === "partial" ||
    value === "partially completed"
  ) {

    return "partial";

  }


  if (
    value === "canceled" ||
    value === "cancelled" ||
    value === "cancel"
  ) {

    return "canceled";

  }


  if (
    value === "refunded" ||
    value === "refund"
  ) {

    return "refunded";

  }


  if (
    value === "failed" ||
    value === "fail"
  ) {

    return "failed";

  }


  /*
  Statut inconnu :
  on conserve processing
  plutôt que d'inventer un statut.
  */

  return "processing";

}


/*
========================================
RÉCUPÉRER COMMANDES À SYNCHRONISER
========================================
*/

function getOrdersToSync() {

  return new Promise(
    (resolve, reject) => {

      db.all(
        `
        SELECT

          id,
          provider_order_id,
          status

        FROM orders

        WHERE provider_order_id IS NOT NULL

          AND TRIM(
            provider_order_id
          ) != ''

          AND status IN (
            'pending',
            'processing',
            'partial'
          )

        ORDER BY id ASC

        LIMIT 50
        `,
        [],
        (error, rows) => {

          if (error) {

            return reject(
              error
            );

          }

          resolve(
            rows || []
          );

        }
      );

    }
  );

}


/*
========================================
METTRE À JOUR UNE COMMANDE
========================================
*/

function updateOrderStatus(
  orderId,
  status
) {

  return new Promise(
    (resolve, reject) => {

      db.run(
        `
        UPDATE orders

        SET status = ?

        WHERE id = ?
        `,
        [
          status,
          orderId
        ],
        function (error) {

          if (error) {

            return reject(
              error
            );

          }

          resolve(
            this.changes
          );

        }
      );

    }
  );

}


/*
========================================
REMBOURSEMENT
========================================

ATTENTION :

On rembourse uniquement les statuts
où le fournisseur indique clairement
que la commande n'est pas exécutée.

completed = aucun remboursement
processing = aucun remboursement
pending = aucun remboursement
partial = pas de remboursement automatique
canceled = remboursement
refunded = remboursement
failed = remboursement
========================================
*/

function refundOrderIfNeeded(
  orderId
) {

  return new Promise(
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
            Récupérer commande + prix
            */

            db.get(
              `
              SELECT

                id,
                user_id,
                price,
                status

              FROM orders

              WHERE id = ?
              `,
              [
                orderId
              ],
              (selectError, order) => {

                if (selectError) {

                  return db.run(
                    "ROLLBACK",
                    () => {

                      reject(
                        selectError
                      );

                    }
                  );

                }


                if (!order) {

                  return db.run(
                    "ROLLBACK",
                    () => {

                      reject(
                        new Error(
                          "Commande introuvable."
                        )
                      );

                    }
                  );

                }


                /*
                Empêcher double remboursement
                */

                if (
                  order.status ===
                  "refunded"
                ) {

                  return db.run(
                    "ROLLBACK",
                    () => {

                      resolve(
                        false
                      );

                    }
                  );

                }


                const amount =
                  Number(
                    order.price || 0
                  );


                if (
                  !Number.isFinite(
                    amount
                  ) ||
                  amount <= 0
                ) {

                  return db.run(
                    "ROLLBACK",
                    () => {

                      reject(
                        new Error(
                          "Montant de remboursement invalide."
                        )
                      );

                    }
                  );

                }


                /*
                Créditer le client
                */

                db.run(
                  `
                  UPDATE users

                  SET

                    balance =
                      balance + ?

                  WHERE id = ?
                  `,
                  [
                    amount,
                    order.user_id
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
                              "Impossible de rembourser le client."
                            )
                          );

                        }
                      );

                    }


                    /*
                    Marquer refunded
                    */

                    db.run(
                      `
                      UPDATE orders

                      SET status = ?

                      WHERE id = ?
                      `,
                      [
                        "refunded",
                        orderId
                      ],
                      function (
                        statusError
                      ) {

                        if (
                          statusError ||
                          this.changes !== 1
                        ) {

                          return db.run(
                            "ROLLBACK",
                            () => {

                              reject(
                                new Error(
                                  "Impossible de marquer la commande remboursée."
                                )
                              );

                            }
                          );

                        }


                        /*
                        COMMIT
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
                              true
                            );

                          }
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

}


/*
========================================
SYNCHRONISER LES COMMANDES
========================================
*/

async function syncOrderStatuses() {

  if (!SMM_API_KEY) {

    console.error(
      "❌ SMM_API_KEY absente : synchronisation désactivée."
    );

    return;

  }


  try {

    const orders =
      await getOrdersToSync();


    if (!orders.length) {

      return;

    }


    console.log(
      `🔄 NOSMYBOOST : ${orders.length} commande(s) à synchroniser.`
    );


    /*
    Petite pause entre les requêtes
    pour éviter les appels trop rapides.
    */

    for (
      const order
      of orders
    ) {

      try {

        const provider =
          await smmAfricaStatus(
            order.provider_order_id
          );


        const newStatus =
          normalizeStatus(
            provider.status
          );


        console.log(
          `📦 Commande #${order.id} | SMM #${order.provider_order_id} | ${provider.status} → ${newStatus}`
        );


        /*
        ==============================
        ANNULATION / ÉCHEC
        ==============================
        */

        if (
          newStatus === "canceled" ||
          newStatus === "failed" ||
          newStatus === "refunded"
        ) {

          /*
          Si déjà refunded,
          ne rien faire.
          */

          if (
            order.status !==
            "refunded"
          ) {

            try {

              await refundOrderIfNeeded(
                order.id
              );


              console.log(
                `💰 Commande #${order.id} remboursée automatiquement.`
              );


            } catch (refundError) {

              console.error(
                `❌ Erreur remboursement #${order.id}:`,
                refundError.message
              );

            }

          }


          continue;

        }


        /*
        ==============================
        STATUT NORMAL
        ==============================
        */

        await updateOrderStatus(
          order.id,
          newStatus
        );


      } catch (error) {

        /*
        Une erreur de statut ne doit
        PAS modifier la commande.
        */

        console.error(
          `⚠️ Impossible de synchroniser #${order.id}:`,
          error.message
        );

      }


      /*
      Pause 300 ms
      */

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            300
          )
      );

    }


  } catch (error) {

    console.error(
      "❌ Synchronisation commandes:",
      error
    );

  }

}


/*
========================================
DÉMARRER LE POLLING
========================================

Toutes les 60 secondes.
========================================
*/

function startOrderStatusSync() {

  console.log(
    "🚀 Synchronisation automatique des commandes activée."
  );


  /*
  Première synchronisation
  */

  syncOrderStatuses();


  /*
  Puis toutes les 60 secondes
  */

  setInterval(
    syncOrderStatuses,
    60 * 1000
  );

}


module.exports = {
  startOrderStatusSync,
  syncOrderStatuses
};
