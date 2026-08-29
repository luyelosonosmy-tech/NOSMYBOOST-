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
VERSION COMPLÈTE ET SÉCURISÉE
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
DATABASE GET
========================================
*/

async function dbGet(sql, params = []) {

  const result =
    await db.query(sql, params);

  return result.rows[0] || null;
}

/*
========================================
SMM AFRICA
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

    await client.query("BEGIN");

    /*
    ==============================
    VERROUILLER LA COMMANDE
    ==============================
    */

    const orderResult =
      await client.query(
        `
        SELECT
          id,
          user_id,
          price,
          status
        FROM orders
        WHERE id = $1
          AND user_id = $2
        FOR UPDATE
        `,
        [
          orderId,
          userId
        ]
      );

    const order =
      orderResult.rows[0];

    if (!order) {

      throw new Error(
        "Commande introuvable pendant le remboursement."
      );

    }

    /*
    ==============================
    NE PAS REMBOURSER DEUX FOIS
    ==============================
    */

    if (
      order.status === "failed"
    ) {

      await client.query(
        "ROLLBACK"
      );

      return false;
    }

    const refundAmount =
      Number(amount);

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {

      throw new Error(
        "Montant de remboursement invalide."
      );

    }

    /*
    ==============================
    RECRÉDITER LE CLIENT
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
            GREATEST(
              total_spent - $1,
              0
            )

        WHERE id = $2
        `,
        [
          refundAmount,
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
    COMMANDÉE → FAILED
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
          AND status <> 'failed'
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
        "Impossible de marquer la commande comme échouée."
      );

    }

    await client.query(
      "COMMIT"
    );

    console.log(
      `✅ REMBOURSEMENT ${refundAmount} CDF | user=${userId} | order=${orderId}`
    );

    return true;

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
        Number(req.user?.id);

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
      SESSION
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
      DOUBLE COMMANDE
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
      VALIDATION SERVICE
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
      VALIDATION LIEN
      ==============================
      */

      if (!link) {

        throw new Error(
          "Veuillez entrer le lien."
        );

      }

      if (link.length > 2000) {

        throw new Error(
          "Le lien est trop long."
        );

      }

      /*
      ==============================
      VALIDATION QUANTITÉ
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
      SERVICE
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

      const active =
        service.active === true ||
        service.active === 1 ||
        service.active === "1";

      if (!active) {

        throw new Error(
          "Ce service est actuellement désactivé."
        );

      }

      /*
      ==============================
      PROVIDER SERVICE ID
      ==============================
      */

      const providerServiceId =
        Number(
          service.provider_service_id
        );

      if (
        !Number.isInteger(providerServiceId) ||
        providerServiceId <= 0
      ) {

        throw new Error(
          `Le service "${service.name}" n'a pas de provider_service_id valide.`
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
          "Les limites du service sont invalides."
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
      PRIX CLIENT
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
      UTILISATEUR
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
      SOLDE INSUFFISANT
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
      DÉBIT + CRÉATION COMMANDE
      TRANSACTION
      ==================================================
      */

      const client =
        await db.connect();

      try {

        await client.query(
          "BEGIN"
        );

        /*
        ==============================
        DÉBIT ATOMIQUE
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
                total_spent + $1

            WHERE id = $2
              AND balance >= $1
            `,
            [
              totalPrice,
              userId
            ]
          );

        if (
          debit.rowCount !== 1
        ) {

          throw new Error(
            "Le solde du client a changé. Veuillez réessayer."
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
              provider_service_id,
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
              $6,
              NULL
            )

            RETURNING
              id,
              created_at
            `,
            [
              userId,
              serviceId,
              link,
              quantity,
              totalPrice,
              String(
                providerServiceId
              )
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
        `Prix client : ${totalPrice} CDF`
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

        console.error(
          "❌ SMM Africa a refusé :",
          providerError.message
        );

        /*
        ==============================
        REMBOURSEMENT AUTOMATIQUE
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
            "❌ ERREUR CRITIQUE REMBOURSEMENT:",
            refundError
          );

          return res.status(500).json({

            success: false,

            message:
              "La commande a échoué et le remboursement automatique nécessite une vérification administrateur.",

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
            "SMM Africa a refusé la commande. Votre argent a été recrédité.",

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
          "❌ Réponse SMM Africa sans order ID:",
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
            "❌ ERREUR REMBOURSEMENT:",
            refundError
          );

          return res.status(500).json({

            success: false,

            message:
              "Le fournisseur n'a pas confirmé la commande. Le remboursement nécessite une vérification administrateur.",

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
            "Le fournisseur n'a pas confirmé la commande. Votre argent a été recrédité.",

          order: {

            id:
              localOrderId,

            status:
              "failed"

          }

        });

      }

      /*
      ==============================
      FOURNISSEUR ACCEPTÉ
      ==============================
      */

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
      ==============================
      FOURNISSEUR ACCEPTÉ
      MAIS DB NON MISE À JOUR
      ==============================
      */

      if (
        updateProvider.rowCount !== 1
      ) {

        console.error(
          "⚠️ FOURNISSEUR ACCEPTÉ MAIS DB NON MISE À JOUR"
        );

        console.error(
          `Commande locale : #${localOrderId}`
        );

        console.error(
          `Commande fournisseur : #${providerOrderId}`
        );

        /*
        IMPORTANT :
        NE PAS REMBOURSER.
        Le fournisseur a déjà accepté.
        */

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
              "processing"

          }

        });

      }

      /*
      ==================================================
      SUCCÈS
      ==================================================
      */

      console.log(
        "========================================"
      );

      console.log(
        `✅ COMMANDE NOSMYBOOST #${localOrderId}`
      );

      console.log(
        `✅ SMM AFRICA #${providerOrderId}`
      );

      console.log(
        `✅ Client payé : ${totalPrice} CDF`
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
      SI FOURNISSEUR ACCEPTÉ
      NE JAMAIS REMBOURSER AUTOMATIQUEMENT
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
              "processing"

          }

        });

      }

      /*
      ==================================================
      ERREUR APRÈS DÉBIT MAIS AVANT ACCEPTATION
      ==================================================
      */

      if (
        localOrderId &&
        userId &&
        reservedAmount > 0
      ) {

        try {

          await refundOrder(
            userId,
            localOrderId,
            reservedAmount
          );

          return res.status(500).json({

            success: false,

            message:
              "La commande a échoué. Votre argent a été recrédité.",

            order: {

              id:
                localOrderId,

              status:
                "failed"

            }

          });

        } catch (refundError) {

          console.error(
            "❌ REMBOURSEMENT IMPOSSIBLE:",
            refundError
          );

          return res.status(500).json({

            success: false,

            message:
              "La commande a échoué. Le remboursement nécessite une vérification administrateur.",

            order: {

              id:
                localOrderId,

              status:
                "failed"

            }

          });

        }

      }

      /*
      ==================================================
      ERREUR AVANT CRÉATION
      ==================================================
      */

      return res.status(400).json({

        success: false,

        message:
          error.message ||
          "Impossible de créer la commande."

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
        Number(req.user?.id);

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

      const result =
        await db.query(
          `
          SELECT
            orders.id,
            orders.service_id,
            orders.link,
            orders.quantity,
            orders.price,
            orders.status,
            orders.provider_order_id,
            orders.created_at,

            services.name AS service_name,
            services.platform

          FROM orders

          LEFT JOIN services
            ON services.id = orders.service_id

          WHERE orders.user_id = $1

          ORDER BY orders.id DESC
          `,
          [
            userId
          ]
        );

      const orders =
        result.rows.map(
          order => ({

            id:
              order.id,

            service_id:
              order.service_id,

            service_name:
              order.service_name,

            platform:
              order.platform,

            link:
              order.link,

            quantity:
              Number(
                order.quantity || 0
              ),

            price:
              Number(
                order.price || 0
              ),

            status:
              order.status,

            provider_order_id:
              order.provider_order_id,

            created_at:
              order.created_at

          })
        );

      return res.json({

        success: true,

        orders

      });

    } catch (error) {

      console.error(
        "❌ Erreur mes commandes:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer vos commandes."

      });

    }

  }
);

module.exports = router;
