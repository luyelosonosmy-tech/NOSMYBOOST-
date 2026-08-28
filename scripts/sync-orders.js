"use strict";

require("dotenv").config();

const db = require("../database/database");

const SMM_API_URL =
  process.env.SMM_API_URL ||
  "https://smm.africa/api/v3";

const SMM_API_KEY =
  process.env.SMM_API_KEY;

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
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${SMM_API_KEY}`
      },

      body: JSON.stringify(payload)
    }
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      `SMM Africa HTTP ${response.status}`
    );
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}


/*
========================================
RÉCUPÉRER LES COMMANDES
POSTGRESQL
========================================
*/

async function getOrdersToSync() {

  const result =
    await db.query(
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
      `
    );

  return result.rows || [];
}


/*
========================================
TRADUIRE STATUT
========================================
*/

function normalizeStatus(status) {

  const value =
    String(status || "")
      .toLowerCase()
      .trim();


  if (
    value === "completed" ||
    value === "complete" ||
    value === "done"
  ) {
    return "completed";
  }


  if (
    value === "processing" ||
    value === "in progress" ||
    value === "in_progress"
  ) {
    return "processing";
  }


  if (
    value === "pending" ||
    value === "queued"
  ) {
    return "pending";
  }


  if (
    value === "canceled" ||
    value === "cancelled"
  ) {
    return "canceled";
  }


  if (value === "partial") {
    return "partial";
  }


  if (value === "refunded") {
    return "refunded";
  }


  return "processing";
}


/*
========================================
METTRE À JOUR STATUT
POSTGRESQL
========================================
*/

async function updateOrderStatus(
  orderId,
  status
) {

  const result =
    await db.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      `,
      [
        status,
        orderId
      ]
    );

  return result.rowCount;
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

        action: "status",

        order:
          String(
            order.provider_order_id
          )

      });


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


    if (
      newStatus === order.status
    ) {

      console.log(
        `ℹ️ Commande #${order.id} toujours ${newStatus}`
      );

      return;

    }


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


  syncOrders()
    .catch(error => {

      console.error(
        "Erreur première synchronisation:",
        error.message
      );

    });


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
