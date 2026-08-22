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
SYNCHRONISATION SERVICES SMM AFRICA
========================================
*/

async function getSmmServices() {

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

      body: JSON.stringify({
        action: "services"
      })
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
    throw new Error(data.error);
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Réponse services SMM Africa invalide."
    );
  }

  return data;
}


/*
========================================
NORMALISER TEXTE
========================================
*/

function normalizeText(value) {

  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

}


/*
========================================
TROUVER SERVICE SMM
========================================
*/

function findMatchingService(
  localService,
  smmServices
) {

  const localName =
    normalizeText(
      localService.name
    );

  if (!localName) {
    return null;
  }


  /*
  Correspondance exacte
  */

  let match =
    smmServices.find(
      service =>
        normalizeText(
          service.name
        ) === localName
    );


  if (match) {
    return match;
  }


  /*
  Correspondance partielle
  */

  match =
    smmServices.find(
      service => {

        const remoteName =
          normalizeText(
            service.name
          );

        return (
          remoteName.includes(
            localName
          ) ||
          localName.includes(
            remoteName
          )
        );

      }
    );


  return match || null;

}


/*
========================================
RÉCUPÉRER SERVICES LOCAUX
========================================
*/

function getLocalServices() {

  return new Promise(
    (resolve, reject) => {

      db.all(
        `
        SELECT
          id,
          platform,
          name,
          price,
          min_quantity,
          max_quantity,
          provider_service_id
        FROM services
        WHERE active = 1
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
METTRE À JOUR PROVIDER SERVICE ID
========================================
*/

function updateProviderServiceId(
  localId,
  providerServiceId
) {

  return new Promise(
    (resolve, reject) => {

      db.run(
        `
        UPDATE services

        SET provider_service_id = ?

        WHERE id = ?
        `,
        [
          String(
            providerServiceId
          ),
          localId
        ],
        function(error) {

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
SYNCHRONISATION
========================================
*/

async function syncServices() {

  console.log(
    "========================================"
  );

  console.log(
    "NOSMYBOOST 🇧🇪"
  );

  console.log(
    "SYNCHRONISATION SERVICES SMM AFRICA"
  );

  console.log(
    "========================================"
  );


  try {

    const smmServices =
      await getSmmServices();


    console.log(
      `📡 ${smmServices.length} services reçus de SMM Africa.`
    );


    const localServices =
      await getLocalServices();


    console.log(
      `📦 ${localServices.length} services locaux trouvés.`
    );


    let updated = 0;
    let notFound = 0;


    for (
      const localService
      of localServices
    ) {

      const match =
        findMatchingService(
          localService,
          smmServices
        );


      if (!match) {

        notFound++;

        console.log(
          `⚠️ Aucun service SMM trouvé pour #${localService.id} : ${localService.name}`
        );

        continue;

      }


      const providerId =
        match.service;


      if (
        providerId === undefined ||
        providerId === null
      ) {

        console.log(
          `⚠️ ID fournisseur absent pour #${localService.id}`
        );

        continue;

      }


      await updateProviderServiceId(
        localService.id,
        providerId
      );


      updated++;


      console.log(
        `✅ Local #${localService.id} → SMM #${providerId} | ${localService.name}`
      );

    }


    console.log(
      "========================================"
    );

    console.log(
      `✅ Services synchronisés : ${updated}`
    );

    console.log(
      `⚠️ Services non trouvés : ${notFound}`
    );

    console.log(
      "========================================"
    );


    return {
      success: true,
      updated,
      notFound
    };


  } catch (error) {

    console.error(
      "❌ Erreur synchronisation services:",
      error.message
    );

    throw error;

  }

}


/*
========================================
EXPORT
========================================
*/

module.exports = {
  syncServices
};


/*
========================================
LANCEMENT DIRECT
========================================
*/

if (
  require.main === module
) {

  syncServices()
    .then(() => {

      console.log(
        "🏁 Synchronisation terminée."
      );

      process.exit(0);

    })
    .catch(() => {

      process.exit(1);

    });

}
