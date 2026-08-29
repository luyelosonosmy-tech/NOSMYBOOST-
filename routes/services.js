"use strict";

const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/*
========================================
NOSMYBOOST 🇧🇪
SERVICES ROUTES
POSTGRESQL
VERSION CORRIGÉE
========================================
*/

/*
========================================
NORMALISER PLATEFORME
========================================
*/

function normalizePlatform(value) {

  const text =
    String(value || "")
      .trim()
      .toLowerCase();

  if (text === "instagram")
    return "Instagram";

  if (text === "facebook")
    return "Facebook";

  if (
    text === "tiktok" ||
    text === "tik tok"
  )
    return "TikTok";

  if (
    text === "youtube" ||
    text === "youtube.com"
  )
    return "YouTube";

  if (text === "telegram")
    return "Telegram";

  if (
    text === "x" ||
    text === "twitter" ||
    text === "twitter/x"
  )
    return "X";

  if (text === "snapchat")
    return "Snapchat";

  if (text === "whatsapp")
    return "WhatsApp";

  if (text === "spotify")
    return "Spotify";

  if (text === "linkedin")
    return "LinkedIn";

  if (text === "discord")
    return "Discord";

  if (
    text === "site web" ||
    text === "website" ||
    text === "web"
  )
    return "Site Web";

  return String(value || "");
}


/*
========================================
CONVERTIR ACTIVE EN BOOLEAN
========================================
*/

function isActive(value) {

  if (value === true)
    return true;

  if (value === false)
    return false;

  if (value === 1)
    return true;

  if (value === 0)
    return false;

  if (typeof value === "string") {

    const text =
      value.trim().toLowerCase();

    return (
      text === "true" ||
      text === "1" ||
      text === "yes"
    );
  }

  return false;
}


/*
========================================
FORMATER SERVICE
========================================
*/

function formatService(service) {

  return {

    id:
      service.id,

    platform:
      normalizePlatform(
        service.platform
      ),

    name:
      service.name,

    description:
      service.description || "",

    price:
      Number(
        service.price || 0
      ),

    min_quantity:
      Number(
        service.min_quantity || 1
      ),

    max_quantity:
      Number(
        service.max_quantity || 1000000
      ),

    active:
      isActive(
        service.active
      )

  };
}


/*
========================================
TOUS LES SERVICES
========================================
*/

router.get(
  "/",
  authenticateToken,
  async (req, res) => {

    try {

      const requestedPlatform =
        String(
          req.query.platform || ""
        ).trim();


      /*
      ========================================
      REQUÊTE DE BASE
      IMPORTANT :
      active est INTEGER 0/1
      ========================================
      */

      let sql = `
        SELECT
          id,
          platform,
          name,
          description,
          price,
          min_quantity,
          max_quantity,
          active
        FROM services
        WHERE active = 1
      `;


      const params = [];


      /*
      ========================================
      FILTRE PLATEFORME
      ========================================
      */

      if (requestedPlatform) {

        const platform =
          normalizePlatform(
            requestedPlatform
          );


        /*
        ----------------------------------------
        X accepte aussi Twitter
        ----------------------------------------
        */

        if (platform === "X") {

          sql += `
            AND (
              LOWER(platform) = LOWER($1)
              OR LOWER(platform) = 'twitter'
            )
          `;

          params.push("X");

        } else {

          sql += `
            AND LOWER(platform) = LOWER($1)
          `;

          params.push(platform);

        }

      }


      /*
      ========================================
      ORDRE
      ========================================
      */

      sql += `
        ORDER BY
          platform ASC,
          id ASC
      `;


      /*
      ========================================
      EXÉCUTER POSTGRESQL
      ========================================
      */

      const result =
        await db.query(
          sql,
          params
        );


      /*
      ========================================
      FORMATER SERVICES
      ========================================
      */

      const formattedServices =
        (result.rows || []).map(
          formatService
        );


      console.log(
        `📦 Services envoyés : ${formattedServices.length}` +
        (
          requestedPlatform
            ? ` | Plateforme : ${requestedPlatform}`
            : ""
        )
      );


      /*
      ========================================
      RÉPONSE
      ========================================
      */

      return res.json({

        success: true,

        count:
          formattedServices.length,

        services:
          formattedServices

      });


    } catch (error) {

      console.error(
        "❌ Erreur récupération services PostgreSQL:",
        error.message
      );

      console.error(
        error.stack
      );


      return res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer les services."

      });

    }

  }
);


/*
========================================
SERVICE PAR ID
========================================
*/

router.get(
  "/:id",
  authenticateToken,
  async (req, res) => {

    try {

      const serviceId =
        Number(
          req.params.id
        );


      /*
      ==============================
      VALIDATION ID
      ==============================
      */

      if (
        !Number.isInteger(serviceId) ||
        serviceId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "ID de service invalide."

        });

      }


      /*
      ==============================
      REQUÊTE POSTGRESQL
      ==============================
      */

      const result =
        await db.query(
          `
          SELECT
            id,
            platform,
            name,
            description,
            price,
            min_quantity,
            max_quantity,
            active
          FROM services
          WHERE id = $1
            AND active = 1
          `,
          [
            serviceId
          ]
        );


      /*
      ==============================
      SERVICE INTROUVABLE
      ==============================
      */

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Service introuvable ou désactivé."

        });

      }


      /*
      ==============================
      FORMATER
      ==============================
      */

      const service =
        result.rows[0];


      /*
      ==============================
      RÉPONSE
      ==============================
      */

      return res.json({

        success: true,

        service:
          formatService(
            service
          )

      });


    } catch (error) {

      console.error(
        "❌ Erreur service PostgreSQL:",
        error.message
      );

      console.error(
        error.stack
      );


      return res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer le service."

      });

    }

  }
);


/*
========================================
EXPORT
========================================
*/

module.exports = router;
