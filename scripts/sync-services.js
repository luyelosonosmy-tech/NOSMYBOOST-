/*
========================================
NOSMYBOOST 🇧🇪
SYNCHRONISATION SERVICES SMM AFRICA
========================================
*/

require("dotenv").config();

const db =
  require("../database/database");

const {
  getServices
} =
  require("../services/smm-africa");


/*
========================================
SYNCHRONISATION
========================================
*/

async function syncServices() {

  console.log(
    "🔄 Récupération des services SMM Africa..."
  );


  try {

    const services =
      await getServices();


    if (!Array.isArray(services)) {

      console.error(
        "❌ Réponse services invalide :",
        services
      );

      return;

    }


    console.log(
      `✅ ${services.length} services reçus.`
    );


    let count = 0;


    for (
      const service of services
    ) {

      const providerId =
        String(
          service.service || ""
        ).trim();


      const name =
        String(
          service.name || ""
        ).trim();


      const rate =
        Number(
          service.rate || 0
        );


      const min =
        Number(
          service.min || 1
        );


      const max =
        Number(
          service.max || 1000000
        );


      const category =
        String(
          service.category || ""
        );


      if (
        !providerId ||
        !name ||
        !Number.isFinite(rate)
      ) {

        continue;

      }


      /*
      ==================================
      DÉTERMINER PLATEFORME
      ==================================
      */

      let platform =
        "Autres";


      const text =
        `${category} ${name}`
          .toLowerCase();


      if (
        text.includes("facebook")
      ) {

        platform =
          "Facebook";

      }

      else if (
        text.includes("instagram")
      ) {

        platform =
          "Instagram";

      }

      else if (
        text.includes("tiktok")
      ) {

        platform =
          "TikTok";

      }

      else if (
        text.includes("youtube")
      ) {

        platform =
          "YouTube";

      }

      else if (
        text.includes("telegram")
      ) {

        platform =
          "Telegram";

      }

      else if (
        text.includes("twitter") ||
        text.includes("x.com")
      ) {

        platform =
          "Twitter";

      }


      /*
      ==================================
      PRIX CLIENT
      ==================================
      
      rate = prix fournisseur USD / 1000
      
      Ici on convertit USD → CDF
      puis on applique une marge.
      ==================================
      */

      const usdToCdf =
        Number(
          process.env.USD_TO_CDF || 2800
        );


      const margin =
        1.5;


      const price =
        Number(
          (
            rate *
            usdToCdf *
            margin
          ).toFixed(2)
        );


      /*
      ==================================
      INSERT / UPDATE
      ==================================
      */

      await new Promise(
        (resolve, reject) => {

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
              'smm.africa',
              ?,
              1
            )

            ON CONFLICT(provider_service_id)
            DO UPDATE SET

              platform =
                excluded.platform,

              name =
                excluded.name,

              description =
                excluded.description,

              min_quantity =
                excluded.min_quantity,

              max_quantity =
                excluded.max_quantity,

              provider =
                excluded.provider,

              active =
                1
            `,

            [
              platform,

              name,

              service.description ||
                "",

              price,

              min,

              max,

              providerId
            ],

            error => {

              if (error) {

                reject(error);

              }

              else {

                count++;

                resolve();

              }

            }
          );

        }
      );

    }


    console.log(
      `✅ ${count} services synchronisés.`
    );


  } catch (error) {

    console.error(
      "❌ Synchronisation SMM Africa échouée:",
      error.message
    );

  }

}


/*
========================================
LANCEMENT
========================================
*/

syncServices()
  .then(() => {

    db.close();

  });
