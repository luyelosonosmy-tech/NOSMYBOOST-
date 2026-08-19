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
APPEL SMM AFRICA
========================================
*/

async function smmAfricaRequest(payload) {

  if (!SMM_API_KEY) {
    throw new Error(
      "SMM_API_KEY manquante dans .env"
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
RÉCUPÉRER COMMANDES EN COURS
========================================
*/

function getProcessingOrders() {

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
CONVERTIR STATUT FOURNISSEUR
========================================
*/

function convertStatus(status) {

  const value =
    String(status || "")
      .trim()
      .toLowerCase();


  if (
    value === "completed" ||
    value === "complete" ||
    value === "done"
  ) {
    return "completed";
  }


  if (
    value === "processing" ||
    value === "in progress"
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
METTRE À JOUR LA COMMANDE
========================================
*/

function updateOrder(
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
        error => {

          if (error) {
            return reject(error);
          }

          resolve();
        }
      );

    }
  );
}


/*
========================================
SYNCHRONISATION
========================================
*/

async function syncOrders() {

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "NOSMYBOOST - STATUTS SMM AFRICA"
  );
  console.log(
    "========================================"
  );


  const orders =
    await getProcessingOrders();


  console.log(
    `Commandes à vérifier : ${orders.length}`
  );


  for (const order of orders) {

    try {

      const providerResponse =
        await smmAfricaRequest({

          action: "status",

          order:
            String(
              order.provider_order_id
            )

        });


      const newStatus =
        convertStatus(
          providerResponse.status
        );


      await updateOrder(
        order.id,
        newStatus
      );


      console.log(
        `Commande #${order.id} → ${newStatus}`
      );


    } catch (error) {

      console.error(
        `Commande #${order.id}:`,
        error.message
      );

    }

  }


  console.log(
    "Synchronisation terminée."
  );
}


/*
========================================
LANCEMENT
========================================
*/

syncOrders()
  .catch(error => {

    console.error(
      "❌ Erreur synchronisation:",
      error.message
    );

    process.exit(1);

  });
