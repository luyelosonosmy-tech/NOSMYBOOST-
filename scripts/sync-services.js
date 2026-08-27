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
    throw new Error("SMM_API_KEY manquante.");
  }

  const response = await fetch(
    SMM_API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SMM_API_KEY}`
      },

      body: JSON.stringify(payload)
    }
  );

  const data = await response
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

  return data;
}


/*
========================================
DÉTERMINER LA PLATEFORME
========================================
*/

function detectPlatform(name) {

  const text =
    String(name || "").toLowerCase();

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

  if (
    text.includes("twitter") ||
    text.includes("x.com")
  )
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
  console.log("========================================");
  console.log("NOSMYBOOST - SYNCHRONISATION SMM AFRICA");
  console.log("========================================");


  /*
  ========================================
  RÉCUPÉRER SERVICES
  ========================================
  */

  const providerServices =
    await smmAfricaRequest({
      action: "services"
    });


  if (!Array.isArray(providerServices)) {
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
  CONNEXION CLIENT POSTGRESQL
  ========================================
  */

  const client =
    await db.connect();


  try {

    await client.query("BEGIN");


    /*
    ========================================
    PRIX
    ========================================
    */

    const usdToCdf =
      Number(
        process.env.USD_TO_CDF || 2800
      );


    const margin =
      Number(
        process.env.SMM_MARGIN || 30
      );


    /*
    ========================================
    TRAITER SERVICES
    ========================================
    */

    for (const service of providerServices) {

      const providerId =
        Number(service.service);

      const name =
        String(service.name || "").trim();

      const priceUSD =
        Number(service.rate);

      const min =
        Number(service.min);

      const max =
        Number(service.max);


      /*
      ========================================
      VALIDATION
      ========================================
      */

      if (
        !Number.isInteger(providerId) ||
        !name ||
        !Number.isFinite(priceUSD) ||
        !Number.isFinite(min) ||
        !Number.isFinite(max)
      ) {

        skipped++;

        continue;
      }


      /*
      ========================================
      PLATEFORME
      ========================================
      */

      const platform =
        detectPlatform(name);


      /*
      ========================================
      CONVERSION USD → CDF
      ========================================
      */

      const providerPriceCDF =
        priceUSD * usdToCdf;


      /*
      ========================================
      MARGE NOSMYBOOST
      ========================================
      */

      const clientPrice =
        providerPriceCDF *
        (1 + margin / 100);


      const finalPrice =
        Number(
          clientPrice.toFixed(2)
        );


      /*
      ========================================
      DESCRIPTION
      ========================================
      */

      const description =
        String(
          service.description || ""
        );


      /*
      ========================================
      VÉRIFIER SERVICE
      ========================================
      */

      const existingResult =
        await client.query(
          `
          SELECT id
          FROM services
          WHERE provider = $1
            AND provider_service_id = $2
          LIMIT 1
          `,
          [
            "SMM Africa",
            String(providerId)
          ]
        );


      /*
      ========================================
      UPDATE
      ========================================
      */

      if (existingResult.rows.length > 0) {

        const serviceId =
          existingResult.rows[0].id;


        await client.query(
          `
          UPDATE services

          SET
            platform = $1,
            name = $2,
            description = $3,
            price = $4,
            min_quantity = $5,
            max_quantity = $6,
            active = 1

          WHERE id = $7
          `,
          [
            platform,
            name,
            description,
            finalPrice,
            min,
            max,
            serviceId
          ]
        );


        updated++;

        continue;
      }


      /*
      ========================================
      INSERT
      ========================================
      */

      await client.query(
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
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          1
        )
        `,
        [
          platform,
          name,
          description,
          finalPrice,
          min,
          max,
          "SMM Africa",
          String(providerId)
        ]
      );


      imported++;
    }


    /*
    ========================================
    COMMIT
    ========================================
    */

    await client.query("COMMIT");


  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }


  /*
  ========================================
  RÉSULTAT
  ========================================
  */

  console.log("");
  console.log("========================================");
  console.log("SYNCHRONISATION TERMINÉE");
  console.log("========================================");

  console.log(
    `Nouveaux services : ${imported}`
  );

  console.log(
    `Services mis à jour : ${updated}`
  );

  console.log(
    `Services ignorés : ${skipped}`
  );

  console.log("========================================");
}


/*
========================================
EXPORT
========================================
*/

module.exports = {
  syncServices
};
