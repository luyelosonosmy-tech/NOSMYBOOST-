"use strict";

const express = require("express");
const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


/*
========================================
NOSMYBOOST 🇧🇪
COMMANDES CLIENT + SMM AFRICA
POSTGRESQL
VERSION SÉCURISÉE
========================================
*/


const SMM_API_URL =
  String(
    process.env.SMM_API_URL ||
    "https://smm.africa/api/v3"
  ).trim();


const SMM_API_KEY =
  String(
    process.env.SMM_API_KEY || ""
  ).trim();


/*
========================================
PROTECTION DOUBLE COMMANDE
========================================
*/

const ordersInProgress = new Set();


/*
========================================
OUTILS DATABASE
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
      data.message ||
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
REMBOURSEMENT
========================================
*/

async function refundOrder(
  userId,
  orderId,
  amount
) {

  const client =
    await db.connect();


  try {

    await client.query(
      "BEGIN"
    );


    /*
    ==============================
    CRÉDITER LE SOLDE
    ==============================
    */

    const userUpdate =
      await client.query(
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
          amount,
          amount,
          amount,
          userId
        ]
      );


    if (
      userUpdate.rowCount !== 1
    ) {

      throw new Error(
        "Utilisateur introuvable pendant le remboursement."
      );

    }


    /*
    ==============================
    MARQUER COMMANDE FAILED
    ==============================
    */

    const orderUpdate =
      await client.query(
        `
        UPDATE orders
        SET
          status = 'failed'

        WHERE id = $1
          AND user_id = $2
        `,
        [
          orderId,
          userId
        ]
      );


    if (
      orderUpdate.rowCount !== 1
    ) {

      throw new Error(
        "Commande introuvable pendant le remboursement."
      );

    }


    await client.query(
      "COMMIT"
    );


  } catch (error) {

    await client.query(
      "ROLLBACK"
    ).catch(() => {});


    throw error;


  } finally {

    client.release();

  }

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
      UTILISATEUR
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
      DOUBLE CLIC
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


      ordersInProgress.add(
        userId
      );


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

          LIMIT 1
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
        service.active !== true
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
          service.max_quantity || 1000000
        );


      if (
        !Number.isInteger(min) ||
        !Number.isInteger(max) ||
        min <= 0 ||
        max < min
      ) {

        throw new Error(
          "Les limites de quantité du service sont invalides."
        );

      }


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
        !Number.isFinite(servicePrice) ||
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
        !Number.isFinite(totalPrice) ||
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

          LIMIT 1
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
      + CRÉER COMMANDE PENDING
      ==================================================
      */

      console.log(
        `NOSMYBOOST → réservation ${totalPrice} CDF | user=${userId}`
      );


      const client =
        await db.connect();


      try {

        await client.query(
          "BEGIN"
        );


        /*
        ==============================
        DÉBIT PROVISOIRE
        ==============================
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
        ==============================
        CRÉER COMMANDE
        ==============================
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
              'pending',
              NULL
            )

            RETURNING id
            `,
            [
              userId,
              serviceId,
              link,
              quantity,
              totalPrice
            ]
          );


        if (
          inserted.rows.length !== 1
        ) {

          throw new Error(
            "Impossible de créer la commande."
          );

        }


        localOrderId =
          inserted.rows[0].id;


        /*
        ==============================
        COMMIT
        ==============================
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
        `Montant : ${totalPrice} CDF`
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
        FOURNISSEUR REFUSE
        → REMBOURSEMENT AUTOMATIQUE
        ==================================================
        */

        console.error(
          "❌ SMM Africa a refusé la commande:",
          providerError.message
        );


        try {

          await refundOrder(
            userId,
            localOrderId,
            reservedAmount
          );


        } catch (refundError) {

          console.error(
            "❌ ERREUR CRITIQUE REMBOURSEMENT:",
            refundError
          );


          return res.status(500).json({

            success: false,

            message:
              "La commande fournisseur a échoué. Le remboursement automatique nécessite une vérification administrateur.",

            order: {

              id:
                localOrderId,

              status:
                "failed"

            }

          });

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
          "❌ Réponse SMM Africa invalide:",
          providerResponse
        );


        /*
        ==============================
        REMBOURSEMENT
        ==============================
        */

        try {

          await refundOrder(
            userId,
            localOrderId,
            reservedAmount
          );


        } catch (refundError) {

          console.error(
            "❌ Erreur remboursement:",
            refundError
          );


          return res.status(500).json({

            success: false,

            message:
              "Le fournisseur n'a pas confirmé la commande et le remboursement nécessite une vérification administrateur.",

            order: {

              id:
                localOrderId,

              status:
                "failed"

            }

          });

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
      ENREGISTRER ORDER ID FOURNISSEUR
      ==================================================
      */

      const updateProvider =
        await db.query(
          `
          UPDATE orders

          SET
            provider_order_id = $1,

            status = 'processing'

          WHERE id = $2
            AND user_id = $3
          `,
          [
            String(
              providerOrderId
            ),

            localOrderId,

            userId
          ]
        );


      /*
      ==================================================
      FOURNISSEUR ACCEPTÉ
      MAIS UPDATE LOCAL ÉCHOUÉ
      ==================================================
      */

      if (
        updateProvider.rowCount !== 1
      ) {

        console.error(
          "⚠️ FOURNISSEUR ACCEPTÉ MAIS MISE À JOUR LOCALE ÉCHOUÉE"
        );

        console.error(
          `Commande locale : #${localOrderId}`
        );

        console.error(
          `Commande SMM Africa : #${providerOrderId}`
        );


        return res.status(202).json({

          success: true,

          message:
            "Commande acceptée par le fournisseur. Synchronisation locale nécessaire.",

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
        "❌ NOSMYBOOST - ERREUR COMMANDE"
      );

      console.error(
        error
      );

      console.error(
        "========================================"
      );


      /*
      ==================================================
      FOURNISSEUR DÉJÀ ACCEPTÉ
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
      COMMANDE LOCALE NON CRÉÉE
      ==================================================
      */

      if (!localO
