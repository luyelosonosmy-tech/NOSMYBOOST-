const express = require("express");
const db = require("../database/database");

const router = express.Router();

const authenticateToken =
  require("../middleware/auth");


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
  authenticateToken,
  (req, res) => {

    const platform =
      String(
        req.query.platform || ""
      )
      .trim();


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
    ================================
    FILTRE PLATEFORME
    ================================
    */

    if (platform) {

      sql += `
        AND LOWER(platform) =
        LOWER(?)
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
            "Erreur services:",
            error
          );

          return res.status(500).json({

            success: false,

            message:
              "Impossible de récupérer les services."

          });

        }


        res.json({

          success: true,

          services

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
  authenticateToken,
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
            "Erreur service:",
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


        res.json({

          success: true,

          service

        });

      }
    );

  }
);


module.exports = router;
