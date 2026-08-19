/*
========================================
NOSMYBOOST 🇧🇪
SMM AFRICA API
========================================
*/

require("dotenv").config();

const API_URL =
  process.env.SMM_API_URL ||
  "https://smm.africa/api/v3";

const API_KEY =
  process.env.SMM_API_KEY;


/*
========================================
VÉRIFICATION CLÉ
========================================
*/

if (!API_KEY) {

  console.warn(
    "⚠️ SMM_API_KEY n'est pas configurée."
  );

}


/*
========================================
REQUÊTE SMM AFRICA
========================================
*/

async function smmAfricaRequest(payload) {

  if (!API_KEY) {

    throw new Error(
      "Clé API SMM Africa manquante."
    );

  }


  const response =
    await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${API_KEY}`
        },

        body:
          JSON.stringify(payload)
      }
    );


  const data =
    await response.json()
      .catch(() => null);


  if (!response.ok) {

    console.error(
      "SMM Africa HTTP:",
      response.status,
      data
    );

    throw new Error(
      data?.error ||
      "Erreur API SMM Africa."
    );

  }


  if (
    data &&
    data.error
  ) {

    throw new Error(
      data.error
    );

  }


  return data;

}


/*
========================================
SOLDE SMM AFRICA
========================================
*/

async function getBalance() {

  return smmAfricaRequest({
    action: "balance"
  });

}


/*
========================================
RÉCUPÉRER SERVICES
========================================
*/

async function getServices() {

  return smmAfricaRequest({
    action: "services"
  });

}


/*
========================================
CRÉER COMMANDE
========================================
*/

async function createOrder({
  service,
  link,
  quantity,
  idempotencyKey
}) {

  return smmAfricaRequest({

    action: "add",

    service,

    link,

    quantity,

    idempotency_key:
      idempotencyKey

  });

}


/*
========================================
STATUT COMMANDE
========================================
*/

async function getOrderStatus(
  orderId
) {

  return smmAfricaRequest({

    action: "status",

    order: orderId

  });

}


/*
========================================
EXPORT
========================================
*/

module.exports = {

  smmAfricaRequest,

  getBalance,

  getServices,

  createOrder,

  getOrderStatus

};
