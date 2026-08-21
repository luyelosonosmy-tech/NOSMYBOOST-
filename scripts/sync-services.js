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
DÉTERMINER LA PLATEFORME
========================================
*/

function detectPlatform(name) {

  const text =
    String(name || "")
      .toLowerCase();


  if (text.includes("facebook"))
    return "Facebook";

  if (text.includes("tiktok"))
    return "TikTok";

  if (text.includes("instagram"))
    return "Instagram";

  if (text.includes("youtube"))
    return "YouTube";

  if (text.includes("telegram"))
    return "Telegram";

  if (text.includes("twitter") ||
      text.includes("x.com"))
    return "Twitter";

  return "Autres";
}


/*
========================================
SYNCHRONISATION
========================================
*/

async function syncServices() {

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "NOSMYBOOST - SYNCHRONISATION SMM AFRICA"
  );
  console.log(
    "========================================"
  );
  console.log("");


  /*
  RÉCUPÉRER LE CATALOGUE
  */

  const providerServices =
    await smmAfricaRequest({
      action: "services"
    });


  if (
    !Array.isArray(providerServices)
  ) {

    throw new Error(
      "SMM Africa n'a pas retourné une liste de services."
    );

  }


  console.log(
    `Services reçus : ${providerServices.length}`
  );


  let imported = 0;
  let updated = 0;
  let skipped = 0;


  /*
  ========================================
  TRANSACTION
  ========================================
  */

  await new Promise(
    (resolve, reject) => {

      db.serialize(() => {

        db.run(
          "BEGIN TRANSACTION",
          error => {

            if (error)
              return reject(error);


            /*
            ==================================
            TRAITER CHAQUE SERVICE
            ==================================
            */

            let index = 0;


            function next() {

              if (
                index >=
                providerServices.length
              ) {

                return db.run(
                  "COMMIT",
                  commitError => {

                    if (commitError)
                      return reject(
                        commitError
                      );

                    resolve();

                  }
                );

              }


              const service =
                providerServices[index++];


              const providerId =
                Number(
                  service.service
                );


              const name =
                String(
                  service.name || ""
                ).trim();


              const priceUSD =
                Number(
                  service.rate
                );


              const min =
                Number(
                  service.min
                );


              const max =
                Number(
                  service.max
                );


              /*
              ==================================
              VALIDATION
              ==================================
              */

              if (
                !Number.isInteger(
                  providerId
                ) ||
                !name ||
                !Number.isFinite(
                  priceUSD
                ) ||
                !Number.isFinite(min) ||
                !Number.isFinite(max)
              ) {

                skipped++;

                return next();

              }


              /*
              ==================================
              PLATEFORME
              ==================================
              */

              const platform =
                detectPlatform(name);


              /*
              ==================================
              PRIX NOSMYBOOST
              ==================================

              SMM Africa donne le tarif
              en USD.

              Exemple :
              rate = 0.90 USD / 1000

              USD_TO_CDF = 2800

              coût fournisseur :
              0.90 × 2800 = 2520 CDF

              On ajoute ensuite une marge.
              */

              const usdToCdf =
                Number(
                  process.env.USD_TO_CDF ||
                  2800
                );


              const providerPriceCDF =
                priceUSD *
                usdToCdf;


              /*
              Marge NOSMYBOOST
              */

              const margin =
                Number(
                  process.env.SMM_MARGIN ||
                  30
                );


              const clientPrice =
                providerPriceCDF *
                (1 + margin / 100);


              const finalPrice =
                Number(
                  clientPrice.toFixed(2)
                );


              /*
              ==================================
              VÉRIFIER SI LE SERVICE EXISTE
              ==================================
              */

              db.get(
                `
                SELECT id
                FROM services
                WHERE provider = ?
                  AND provider_service_id = ?
                `,
                [
                  "SMM Africa",
                  String(providerId)
                ],
                (findError, existing) => {

                  if (findError) {

                    return reject(
                      findError
                    );

                  }


                  /*
                  ==================================
                  MISE À JOUR
                  ==================================
                  */

                  if (existing) {

                    db.run(
                      `
                      UPDATE services

                      SET
                        platform = ?,
                        name = ?,
                        description = ?,
                        price = ?,
                        min_quantity = ?,
                        max_quantity = ?,
                        active = 1

                      WHERE id = ?
                      `,
                      [
                        platform,
                        name,
                        String(
                          service.description ||
                          ""
                        ),
                        finalPrice,
                        min,
                        max,
                        existing.id
                      ],
                      updateError => {

                        if (updateError)
                          return reject(
                            updateError
                          );

                        updated++;

                        next();

                      }
                    );

                    return;
                  }


                  /*
                  ==================================
                  NOUVEAU SERVICE
                  ==================================
                  */

                  db.run(
                    `
                    INSERT INTO services
                    (
                      platform,
                      name,
                      description,
                      price,
                      min_quantity,
                      max_quantity,
                      provider,
                      provider_service_id,
                      active
                    )

                    VALUES
                    (
                      ?,
                      ?,
                      ?,
                      ?,
                      ?,
                      ?,
                      ?,
                      ?,
                      1
                    )
                    `,
                    [
                      platform,
                      name,
                      String(
                        service.description ||
                        ""
                      ),
                      finalPrice,
                      min,
                      max,
                      "SMM Africa",
                      String(providerId)
                    ],
                    insertError => {

                      if (insertError)
                        return reject(
                          insertError
                        );

                      imported++;

                      next();

                    }
                  );

                }
              );

            }


            next();

          }
        );

      });

    }
  );


  /*
  ========================================
  RÉSULTAT
  ========================================
  */

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "SYNCHRONISATION TERMINÉE"
  );
  console.log(
    "========================================"
  );

  console.log(
    `Nouveaux services : ${imported}`
  );

  console.log(
    `Services mis à jour : ${updated}`
  );

  console.log(
    `Services ignorés : ${skipped}`
  );

  console.log("");
}


/*
========================================
LANCEMENT
========================================
*/
module.exports = {
  syncServices
};
