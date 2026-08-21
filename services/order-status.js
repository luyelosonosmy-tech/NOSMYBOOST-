"use strict";

require("dotenv").config();

const db = require("../database/database");

const SMM_API_URL =
  process.env.SMM_API_URL ||
  "https://smm.africa/api/v3";

const SMM_API_KEY =
  process.env.SMM_API_KEY;


/*
========================================
NOSMYBOOST 🇧🇪
SYNCHRONISATION AUTOMATIQUE COMMANDES
SMM AFRICA
========================================
*/

let syncRunning = false;


/*
========================================
APPEL SMM AFRICA
========================================
*/

async function smmAfricaRequest(payload) {

  if (!SMM_API_KEY) {
    throw new Error(
      "SMM_API_KEY manquante."
    );
  }

  const response = await fetch(
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
RÉCUPÉRER LES COMMANDES À SYNCHRONISER
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

          AND provider_order_id != ''

          AND status IN (
            'pending',
            'processing'
          )

        ORDER BY id ASC
        `,
        [],
        (error, rows) => {

          if (error) {
            return reject(error);
          }

          resolve(rows || []);

        }
      );

    }
  );

}


/*
========================================
METTRE À JOUR LE STATUT
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
            return reject(error);
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
TRADUCTION STATUT FOURNISSEUR
========================================
*/

function normalizeStatus(status) {

  const value =
    String(status || "")
      .toLowerCase()
      .trim();


  /*
  STATUTS TERMINÉS
  */

  if (
    value === "completed" ||
    value === "complete" ||
    value === "done"
  ) {

    return "completed";

  }


  /*
  STATUTS EN TRAITEMENT
  */

  if (
    value === "processing" ||
    value === "in progress" ||
    value === "in_progress"
  ) {

    return "processing";

  }


  /*
  STATUTS ANNULÉS
  */

  if (
    value === "canceled" ||
    value === "cancelled"
  ) {

    return "canceled";

  }


  /*
  STATUTS PARTIELS
  */

  if (
    value === "partial"
  ) {

    return "partial";

  }


  /*
  STATUTS REMBOURSÉS
  */

  if (
    value === "refunded"
  ) {

    return "refunded";

  }


  /*
  PAR DÉFAUT
  */

  return "pending";

}


/*
========================================
SYNCHRONISER UNE COMMANDE
========================================
*/

async function syncOneOrder(order) {

  try {

    console.log(
      `🔄 Vérification commande #${order.id} → SMM #${order.provider_order_id}`
    );


    const providerResponse =
      await smmAfricaRequest({

        action:
          "status",

        order:
          String(
            order.provider_order_id
          )

      });


    /*
    ==============================
    STATUT FOURNISSEUR
    ==============================
    */

    const providerStatus =
      providerResponse?.status;


    if (!providerStatus) {

      console.log(
        `⚠️ Aucun statut reçu pour #${order.id}`
      );

      return;

    }


    const newStatus =
      normalizeStatus(
        providerStatus
      );


    /*
    ==============================
    SI LE STATUT N'A PAS CHANGÉ
    ==============================
    */

    if (
      newStatus ===
      order.status
    ) {

      console.log(
        `ℹ️ Commande #${order.id} toujours ${newStatus}`
      );

      return;

    }


    /*
    ==============================
    MISE À JOUR
    ==============================
    */

    await updateOrderStatus(
      order.id,
      newStatus
    );


    console.log(
      `✅ Commande #${order.id}: ${order.status} → ${newStatus}`
    );


  } catch (error) {

    console.error(
      `❌ Erreur synchronisation commande #${order.id}:`,
      error.message
    );

  }

}


/*
========================================
SYNCHRONISER TOUTES LES COMMANDES
========================================
*/

async function syncOrders() {

  if (syncRunning) {

    console.log(
      "⏳ Synchronisation déjà en cours..."
    );

    return;

  }


  syncRunning = true;


  try {

    const orders =
      await getOrdersToSync();


    if (
      orders.length === 0
    ) {

      console.log(
        "ℹ️ Aucune commande à synchroniser."
      );

      return;

    }


    console.log(
      `🔎 ${orders.length} commande(s) à vérifier.`
    );


    for (
      const order of orders
    ) {

      await syncOneOrder(
        order
      );

    }


  } catch (error) {

    console.error(
      "❌ Erreur synchronisation globale:",
      error.message
    );


  } finally {

    syncRunning = false;

  }

}


/*
========================================
DÉMARRER LA SYNCHRONISATION
========================================
*/

function startOrderStatusSync() {

  console.log(
    "========================================"
  );

  console.log(
    "NOSMYBOOST 🇧🇪"
  );

  console.log(
    "SYNCHRONISATION COMMANDES ACTIVÉE"
  );

  console.log(
    "Vérification toutes les 60 secondes"
  );

  console.log(
    "========================================"
  );


  /*
  PREMIÈRE VÉRIFICATION
  */

  syncOrders()
    .catch(error => {

      console.error(
        "Erreur première synchronisation:",
        error.message
      );

    });


  /*
  PUIS TOUTES LES 60 SECONDES
  */

  setInterval(
    () => {

      syncOrders()
        .catch(error => {

          console.error(
            "Erreur synchronisation:",
            error.message
          );

        });

    },
    60 * 1000
  );

}


/*
========================================
EXPORT
========================================
*/

module.exports = {
  startOrderStatusSync,
  syncOrders
};
