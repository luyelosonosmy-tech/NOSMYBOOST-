"use strict";

const express = require("express");
const db = require("../database/database");

const router = express.Router();

const authenticateToken =
  require("../middleware/auth");


/*
========================================
NOSMYBOOST 🇧🇪
COMMANDES CLIENT + SMM AFRICA
POSTGRESQL
VERSION SÉCURISÉE
========================================
*/


const SMM_API_URL =
  process.env.SMM_API_URL ||
  "https://smm.africa/api/v3";

const SMM_API_KEY =
  process.env.SMM_API_KEY;


/*
========================================
PROTECTION DOUBLE COMMANDE
========================================
*/

const ordersInProgress =
  new Set();


/*
========================================
OUTILS DATABASE POSTGRESQL
========================================
*/

async function dbGet(sql, params = []) {

  const result =
    await db.query(
      sql,
      params
    );

  return result.rows[0] || null;

}


async function dbAll(sql, params = []) {

  const result =
    await db.query(
      sql,
      params
    );

  return result.rows;

}


/*
========================================
APPEL API SMM AFRICA
========================================
*/

async function smmAfricaRequest(payload) {

  if (!SMM_API_KEY) {

    throw new Error(
      "SMM_API_KEY manquante dans les variables Render."
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
CRÉER UNE COMMANDE
========================================
*/

router.post(
  "/",
  authenticateToken,
  async (req, res) => {

    let localOrderId = null;

    let reservedAmount = 0;

    let providerAccepted = false;

    let userId = null;


    try {

      /*
      ==============================
      DONNÉES
      ==============================
      */

      userId =
        Number(req.user.id);


      const serviceId =
        Number(req.body.serviceId);


      const link =
        String(
          req.body.link || ""
        ).trim();


      const quantity =
        Number(req.body.quantity);


      /*
      ==============================
      VALIDATION UTILISATEUR
      ==============================
      */

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {

        return res.status(401).json({

          success: false,

          message:
            "Session utilisateur invalide."

        });

      }


      /*
      ==============================
      EMPÊCHER DOUBLE CLIC
      ==============================
      */

      if (
        ordersInProgress.has(userId)
      ) {

        return res.status(429).json({

          success: false,

          message:
            "Une commande est déjà en cours. Veuillez patienter."

        });

      }


      ordersInProgress.add(userId);


      /*
      ==============================
      SERVICE
      ==============================
      */

      if (
        !Number.isInteger(serviceId) ||
        serviceId <= 0
      ) {

        throw new Error(
          "Service invalide."
        );

      }


      /*
      ==============================
      LIEN
      ==============================
      */

      if (!link) {

        throw new Error(
          "Veuillez entrer le lien."
        );

      }


      /*
      ==============================
      QUANTITÉ
      ==============================
      */

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {

        throw new Error(
          "Quantité invalide."
        );

      }


      /*
      ==============================
      RÉCUPÉRER SERVICE
      ==============================
      */

      const service =
        await dbGet(
          `
          SELECT
            id,
            name,
            platform,
            price,
            min_quantity,
            max_quantity,
            provider,
            provider_service_id,
            active
          FROM services
          WHERE id = $1
          `,
          [
            serviceId
          ]
        );


      if (!service) {

        throw new Error(
          "Service introuvable."
        );

      }


      /*
      ==============================
      SERVICE ACTIF
      ==============================
      */

      if (
        Number(service.active) !== 1
      ) {

        throw new Error(
          "Ce service est actuellement désactivé."
        );

      }


      /*
      ==============================
      PROVIDER SERVICE ID
      ==============================
      */

      if (
        service.provider_service_id === null ||
        service.provider_service_id === undefined ||
        String(
          service.provider_service_id
        ).trim() === ""
      ) {

        throw new Error(
          `Le service "${service.name}" n'a pas encore de provider_service_id SMM Africa.`
        );

      }


      const providerServiceId =
        Number(
          service.provider_service_id
        );


      if (
        !Number.isInteger(
          providerServiceId
        ) ||
        providerServiceId <= 0
      ) {

        throw new Error(
          "Le provider_service_id de ce service est invalide."
        );

      }


      /*
      ==============================
      LIMITES
      ==============================
      */

      const min =
        Number(
          service.min_quantity || 1
        );


      const max =
        Number(
          service.max_quantity ||
          1000000
        );


      if (
        quantity < min
      ) {

        throw new Error(
          `La quantité minimum est de ${min}.`
        );

      }


      if (
        quantity > max
      ) {

        throw new Error(
          `La quantité maximum est de ${max}.`
        );

      }


      /*
      ==============================
      PRIX
      ==============================
      */

      const servicePrice =
        Number(
          service.price
        );


      if (
        !Number.isFinite(
          servicePrice
        ) ||
        servicePrice <= 0
      ) {

        throw new Error(
          "Prix du service invalide."
        );

      }


      const totalPrice =
        Number(
          (
            quantity /
            1000 *
            servicePrice
          ).toFixed(2)
        );


      if (
        !Number.isFinite(
          totalPrice
        ) ||
        totalPrice <= 0
      ) {

        throw new Error(
          "Prix total invalide."
        );

      }


      reservedAmount =
        totalPrice;


      /*
      ==============================
      CLIENT
      ==============================
      */

      const user =
        await dbGet(
          `
          SELECT
            id,
            balance,
            total_spent
          FROM users
          WHERE id = $1
          `,
          [
            userId
          ]
        );


      if (!user) {

        throw new Error(
          "Utilisateur introuvable."
        );

      }


      const balance =
        Number(
          user.balance || 0
        );


      /*
      ==============================
      SOLDE
      ==============================
      */

      if (
        balance < totalPrice
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Solde insuffisant. Veuillez recharger votre compte.",

          required:
            totalPrice,

          balance

        });

      }


      /*
      ==================================================
      ÉTAPE 1
      RÉSERVER L'ARGENT
      ET CRÉER UNE COMMANDE PENDING
      ==================================================
      */

      console.log(
        `NOSMYBOOST → réservation ${totalPrice} CDF | user=${userId}`
      );


      /*
      IMPORTANT :
      PostgreSQL exige que BEGIN / UPDATE / INSERT /
      COMMIT utilisent le même client.
      */

      const client =
        await db.connect();


      try {

        await client.query(
          "BEGIN"
        );


        /*
        ------------------------------
        DÉBIT PROVISOIRE
        ------------------------------
        */

        const debit =
          await client.query(
            `
            UPDATE users
            SET
              balance =
                balance - $1,

              total_spent =
                total_spent + $2

            WHERE id = $3
              AND balance >= $4
            `,
            [
              totalPrice,
              totalPrice,
              userId,
              totalPrice
            ]
          );


        if (
          debit.rowCount !== 1
        ) {

          throw new Error(
            "Impossible de réserver le solde du client."
          );

        }


        /*
        ------------------------------
        CRÉER COMMANDE PENDING
        ------------------------------
        */

        const inserted =
          await client.query(
            `
            INSERT INTO orders
            (
              user_id,
              service_id,
              link,
              quantity,
              price,
              status,
              provider_order_id
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7
            )
            RETURNING id
            `,
            [
              userId,
              serviceId,
              link,
              quantity,
              totalPrice,
              "pending",
              null
            ]
          );


        localOrderId =
          inserted.rows[0].id;


        /*
        ------------------------------
        COMMIT
        ------------------------------
        */

        await client.query(
          "COMMIT"
        );


      } catch (transactionError) {

        await client.query(
          "ROLLBACK"
        ).catch(() => {});


        throw transactionError;


      } finally {

        client.release();

      }


      /*
      ==================================================
      ÉTAPE 2
      ENVOYER À SMM AFRICA
      ==================================================
      */

      console.log(
        "========================================"
      );

      console.log(
        "NOSMYBOOST → SMM AFRICA"
      );

      console.log(
        `Commande locale : #${localOrderId}`
      );

      console.log(
        `Service provider : ${providerServiceId}`
      );

      console.log(
        `Quantité : ${quantity}`
      );

      console.log(
        "========================================"
      );


      let providerResponse;


      try {

        providerResponse =
          await smmAfricaRequest({

            action:
              "add",

            service:
              providerServiceId,

            link,

            quantity

          });


      } catch (providerError) {

        /*
        ==================================================
        SMM AFRICA REFUSE / ERREUR
        → REMBOURSEMENT AUTOMATIQUE
        ==================================================
        */

        console.error(
          "SMM Africa a refusé la commande:",
          providerError.message
        );


        const refundClient =
          await db.connect();


        try {

          await refundClient.query(
            "BEGIN"
          );


          /*
          ------------------------------
          REMBOURSER
          ------------------------------
          */

          await refundClient.query(
            `
            UPDATE users
            SET
              balance =
                balance + $1,

              total_spent =
                CASE
                  WHEN total_spent >= $2
                  THEN total_spent - $3
                  ELSE 0
                END

            WHERE id = $4
            `,
            [
              totalPrice,
              totalPrice,
              totalPrice,
              userId
            ]
          );


          /*
          ------------------------------
          MARQUER FAILED
          ------------------------------
          */

          await refundClient.query(
            `
            UPDATE orders
            SET
              status = $1

            WHERE id = $2
            `,
            [
              "failed",
              localOrderId
            ]
          );


          await refundClient.query(
            "COMMIT"
          );


        } catch (refundError) {

          await refundClient.query(
            "ROLLBACK"
          ).catch(() => {});


          console.error(
            "ERREUR CRITIQUE REMBOURSEMENT:",
            refundError
          );


          throw new Error(
            "La commande fournisseur a échoué et le remboursement automatique nécessite une vérification administrateur."
          );


        } finally {

          refundClient.release();

        }


        return res.status(502).json({

          success: false,

          message:
            "SMM Africa a refusé la commande. Votre montant a été recrédité.",

          order: {

            id:
              localOrderId,

            status:
              "failed"

          }

        });

      }


      /*
      ==================================================
      ÉTAPE 3
      VÉRIFIER ORDER ID FOURNISSEUR
      ==================================================
      */

      const providerOrderId =
        providerResponse?.order;


      if (
        providerOrderId === undefined ||
        providerOrderId === null ||
        String(
          providerOrderId
        ).trim() === ""
      ) {

        console.error(
          "Réponse SMM Africa invalide:",
          providerResponse
        );


        /*
        ------------------------------
        REMBOURSEMENT
        ------------------------------
        */

        const refundClient =
          await db.connect();


        try {

          await refundClient.query(
            "BEGIN"
          );


          await refundClient.query(
            `
            UPDATE users
            SET
              balance =
                balance + $1,

              total_spent =
                CASE
                  WHEN total_spent >= $2
                  THEN total_spent - $3
                  ELSE 0
                END

            WHERE id = $4
            `,
            [
              totalPrice,
              totalPrice,
              totalPrice,
              userId
            ]
          );


          await refundClient.query(
            `
            UPDATE orders
            SET
              status = $1

            WHERE id = $2
            `,
            [
              "failed",
              localOrderId
            ]
          );


          await refundClient.query(
            "COMMIT"
          );


        } catch (refundError) {

          await refundClient.query(
            "ROLLBACK"
          ).catch(() => {});


          console.error(
            "Erreur remboursement:",
            refundError
          );


          throw new Error(
            "Réponse fournisseur invalide et remboursement à vérifier par l'administrateur."
          );


        } finally {

          refundClient.release();

        }


        return res.status(502).json({

          success: false,

          message:
            "Le fournisseur n'a pas confirmé la commande. Votre montant a été recrédité.",

          order: {

            id:
              localOrderId,

            status:
              "failed"

          }

        });

      }


      providerAccepted =
        true;


      /*
      ==================================================
      ÉTAPE 4
      FOURNISSEUR ACCEPTÉ
      → ENREGISTRER SON ORDER ID
      ==================================================
      */

      const updateProvider =
        await db.query(
          `
          UPDATE orders
          SET
            provider_order_id = $1,

            status = $2

          WHERE id = $3
            AND user_id = $4
          `,
          [
            String(
              providerOrderId
            ),

            "processing",

            localOrderId,

            userId
          ]
        );


      if (
        updateProvider.rowCount !== 1
      ) {

        console.error(
          "⚠️ FOURNISSEUR ACCEPTÉ MAIS MISE À JOUR LOCALE ÉCHOUÉE"
        );

        console.error(
          `Commande locale #${localOrderId}`
        );

        console.error(
          `Commande SMM Africa #${providerOrderId}`
        );


        return res.status(202).json({

          success: true,

          message:
            "Commande acceptée par le fournisseur. Synchronisation locale en cours.",

          order: {

            id:
              localOrderId,

            provider_order_id:
              String(
                providerOrderId
              ),

            quantity,

            price:
              totalPrice,

            status:
              "pending"

          }

        });

      }


      /*
      ==================================================
      SUCCÈS FINAL
      ==================================================
      */

      console.log(
        "========================================"
      );

      console.log(
        `✅ NOSMYBOOST COMMANDE #${localOrderId}`
      );

      console.log(
        `✅ SMM AFRICA #${providerOrderId}`
      );

      console.log(
        `✅ Montant : ${totalPrice} CDF`
      );

      console.log(
        "========================================"
      );


      return res.status(201).json({

        success: true,

        message:
          "Commande envoyée avec succès. La livraison est en cours.",

        order: {

          id:
            localOrderId,

          provider_order_id:
            String(
              providerOrderId
            ),

          service_id:
            serviceId,

          quantity,

          price:
            totalPrice,

          status:
            "processing"

        }

      });


    } catch (error) {

      console.error(
        "========================================"
      );

      console.error(
        "NOSMYBOOST - ERREUR COMMANDE"
      );

      console.error(
        error
      );

      console.error(
        "========================================"
      );


      /*
      ==================================================
      SI FOURNISSEUR DÉJÀ ACCEPTÉ
      → NE PAS REMBOURSER
      ==================================================
      */

      if (
        providerAccepted &&
        localOrderId
      ) {

        return res.status(202).json({

          success: true,

          message:
            "La commande fournisseur a été acceptée. Une synchronisation locale est nécessaire.",

          order: {

            id:
              localOrderId,

            status:
              "pending"

          }

        });

      }

            /*
      ==================================================
      AUCUNE COMMANDE LOCALE
      ==================================================
      */

      if (!localOrderId) {

        return res.status(400).json({

          success: false,

          message:
            error.message ||
            "Impossible de créer la commande."

        });

      }


      /*
      ==================================================
      COMMANDE LOCALE EXISTE
      MAIS PAS CONFIRMÉE PAR LE FOURNISSEUR
      ==================================================
      */

      try {

        await db.query(
          `
          UPDATE orders

          SET
            status = $1

          WHERE id = $2

            AND status = $3
          `,
          [
            "failed",
            localOrderId,
            "pending"
          ]
        );

      } catch (updateError) {

        console.error(
          "Impossible de mettre la commande en failed:",
          updateError
        );

      }


      return res.status(502).json({

        success: false,

        message:
          error.message ||
          "Impossible d'envoyer la commande."

      });

    } finally {

      /*
      ==============================
      LIBÉRER LE VERROU
      ==============================
      */

      if (userId) {

        ordersInProgress.delete(
          userId
        );

      }

    }

  }
);


/*
========================================
MES COMMANDES
========================================
*/

router.get(
  "/my",
  authenticateToken,
  async (req, res) => {

    try {

      const userId =
        Number(req.user.id);


      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {

        return res.status(401).json({

          success: false,

          message:
            "Session utilisateur invalide."

        });

      }


      const orders =
        await dbAll(
          `
          SELECT

            orders.id,

            orders.link,

            orders.quantity,

            orders.price,

            orders.status,

            orders.provider_order_id,

            orders.created_at,

            services.platform,

            services.name AS service_name

          FROM orders

          JOIN services
            ON services.id =
               orders.service_id

          WHERE orders.user_id = $1

          ORDER BY orders.id DESC
          `,
          [
            userId
          ]
        );


      return res.json({

        success: true,

        orders:
          orders || []

      });


    } catch (error) {

      console.error(
        "Erreur récupération commandes:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer les commandes."

      });

    }

  }
);


/*
========================================
UNE COMMANDE
========================================
*/

router.get(
  "/:id",
  authenticateToken,
  async (req, res) => {

    try {

      const userId =
        Number(req.user.id);

      const orderId =
        Number(req.params.id);


      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {

        return res.status(401).json({

          success: false,

          message:
            "Session utilisateur invalide."

        });

      }


      if (
        !Number.isInteger(orderId) ||
        orderId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "ID de commande invalide."

        });

      }


      const order =
        await dbGet(
          `
          SELECT

            orders.id,

            orders.link,

            orders.quantity,

            orders.price,

            orders.status,

            orders.provider_order_id,

            orders.created_at,

            services.platform,

            services.name AS service_name

          FROM orders

          JOIN services
            ON services.id =
               orders.service_id

          WHERE orders.id = $1

            AND orders.user_id = $2
          `,
          [
            orderId,
            userId
          ]
        );


      if (!order) {

        return res.status(404).json({

          success: false,

          message:
            "Commande introuvable."

        });

      }


      return res.json({

        success: true,

        order

      });


    } catch (error) {

      console.error(
        "Erreur commande:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer la commande."

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
