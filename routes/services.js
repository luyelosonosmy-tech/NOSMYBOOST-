"use strict";

const express = require("express");
const db = require("../database/database");

const router = express.Router();

/*
========================================
NOSMYBOOST🇧🇪
SERVICES
========================================
*/

/*
========================================
TOUS LES SERVICES
========================================
*/

router.get(
  "/",
  (req, res) => {

    const platform =
      String(
        req.query.platform || ""
      ).trim();


    let sql = `
      SELECT
        id,
        platform,
        name,
        description,
        price,
        min_quantity,
        max_quantity
      FROM services
      WHERE active = 1
    `;


    const params = [];


    /*
    ========================================
    FILTRE PLATEFORME
    ========================================
    */

    if (platform) {

      sql += `
        AND LOWER(platform) = LOWER(?)
      `;

      params.push(platform);

    }


    sql += `
      ORDER BY platform ASC, id ASC
    `;


    db.all(
      sql,
      params,
      (error, services) => {

        if (error) {

          console.error(
            "Erreur récupération services:",
            error
          );

          return res.status(500).json({

            success: false,

            message:
              "Impossible de récupérer les services."

          });

        }


        return res.json({

          success: true,

          services: services || []

        });

      }
    );

  }
);


/*
========================================
SERVICE PAR ID
========================================
*/

router.get(
  "/:id",
  (req, res) => {

    const serviceId =
      Number(req.params.id);


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


    db.get(
      `
      SELECT
        id,
        platform,
        name,
        description,
        price,
        min_quantity,
        max_quantity
      FROM services
      WHERE id = ?
        AND active = 1
      `,
      [serviceId],
      (error, service) => {

        if (error) {

          console.error(
            "Erreur récupération service:",
            error
          );

          return res.status(500).json({

            success: false,

            message:
              "Impossible de récupérer le service."

          });

        }


        if (!service) {

          return res.status(404).json({

            success: false,

            message:
              "Service introuvable."

          });

        }


        return res.json({

          success: true,

          service

        });

      }
    );

  }
);


/*
========================================
EXPORT
========================================
*/

module.exports = router;
