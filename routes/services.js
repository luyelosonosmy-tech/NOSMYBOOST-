const express = require("express");
const db = require("../database/database");

const router = express.Router();

/*
========================================
GET TOUS LES SERVICES ACTIFS
========================================
*/

router.get("/", (req, res) => {

  const sql = `
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
    ORDER BY platform ASC, id ASC
  `;

  db.all(sql, [], (err, services) => {

    if (err) {
      console.error("Erreur récupération services :", err);

      return res.status(500).json({
        success: false,
        message: "Impossible de récupérer les services."
      });
    }

    res.json({
      success: true,
      services
    });

  });

});


/*
========================================
GET SERVICES PAR PLATEFORME
========================================
*/

router.get("/platform/:platform", (req, res) => {

  const platform = req.params.platform.trim();

  const sql = `
    SELECT
      id,
      platform,
      name,
      description,
      price,
      min_quantity,
      max_quantity
    FROM services
    WHERE platform = ?
      AND active = 1
    ORDER BY id ASC
  `;

  db.all(sql, [platform], (err, services) => {

    if (err) {
      console.error("Erreur récupération services :", err);

      return res.status(500).json({
        success: false,
        message: "Impossible de récupérer les services."
      });
    }

    res.json({
      success: true,
      platform,
      services
    });

  });

});


/*
========================================
GET UN SERVICE PAR SON ID
========================================
*/

router.get("/:id", (req, res) => {

  const serviceId = Number(req.params.id);

  if (!Number.isInteger(serviceId) || serviceId <= 0) {

    return res.status(400).json({
      success: false,
      message: "ID de service invalide."
    });

  }

  const sql = `
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
  `;

  db.get(sql, [serviceId], (err, service) => {

    if (err) {
      console.error("Erreur récupération service :", err);

      return res.status(500).json({
        success: false,
        message: "Impossible de récupérer le service."
      });
    }

    if (!service) {

      return res.status(404).json({
        success: false,
        message: "Service introuvable."
      });

    }

    res.json({
      success: true,
      service
    });

  });

});


module.exports = router;
