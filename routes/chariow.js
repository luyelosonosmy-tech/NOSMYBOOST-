"use strict";

const express = require("express");
const crypto = require("crypto");

const db = require("../database/database");

const router = express.Router();

const RECHARGE_AMOUNT = 2500;

const PRODUCT_NAME =
  "Recharge NOSMYBOOST – 2 500 CDF";


/*
========================================
VÉRIFICATION SIGNATURE CHARIOW
========================================
*/

function verifySignature(req) {

  const secret =
    process.env.CHARIOW_WEBHOOK_SECRET;

  if (!secret) {

    console.error(
      "❌ CHARIOW_WEBHOOK_SECRET manque dans Render."
    );

    return false;
  }


  const signature =
    req.headers["x-chariow-signature"] ||
    req.headers["chariow-signature"];


  if (!signature) {

    console.error(
      "❌ Signature Chariow absente."
    );

    return false;
  }


  /*
  IMPORTANT :
  utiliser le corps ORIGINAL
  et non JSON.stringify(req.body)
  */

  const rawBody =
    req.rawBody;


  if (!rawBody) {

    console.error(
      "❌ Raw body Chariow absent."
    );

    return false;
  }


  const expectedHex =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(rawBody)
      .digest("hex");


  const expectedBase64 =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(rawBody)
      .digest("base64");


  const received =
    String(signature)
      .trim()
      .replace(/^sha256=/i, "");


  /*
  Accepte :
  - hex
  - sha256=hex
  - base64
  */

  if (
    received === expectedHex ||
    received === expectedBase64
  ) {

    return true;

  }


  console.error(
    "❌ Signature Chariow invalide."
  );

  return false;

}


/*
========================================
WEBHOOK CHARIOW
========================================
*/

router.post(
  "/",
  async (req, res) => {

    console.log(
      "========================================"
    );

    console.log(
      "📩 WEBHOOK CHARIOW REÇU"
    );

    console.log(
      new Date().toISOString()
    );

    console.log(
      "========================================"
    );


    /*
    --------------------------------
    VÉRIFICATION SIGNATURE
    --------------------------------
    */

    if (!verifySignature(req)) {

      return res.status(401).json({

        success: false,

        message:
          "Signature Chariow invalide."

      });

    }


    /*
    --------------------------------
    PAYLOAD
    --------------------------------
    */

    const payload =
      req.body || {};


    console.log(
      "📦 Chariow payload:"
    );

    console.log(
      JSON.stringify(
        payload,
        null,
        2
      )
    );


    /*
    --------------------------------
    EXTRACTION EMAIL
    --------------------------------
    */

    const email =
      payload.customer?.email ||
      payload.customer_email ||
      payload.email ||
      payload.buyer?.email ||
      null;


    /*
    --------------------------------
    EXTRACTION MONTANT
    --------------------------------
    */

    const amount =
      Number(
        payload.amount ??
        payload.total ??
        payload.price ??
        payload.product?.price ??
        0
      );


    /*
    --------------------------------
    EXTRACTION PRODUIT
    --------------------------------
    */

    const product =
      payload.product?.name ||
      payload.product_name ||
      payload.name ||
      "";


    /*
    --------------------------------
    EXTRACTION ID
    --------------------------------
    */

    const paymentId =
      String(
        payload.id ||
        payload.sale_id ||
        payload.order_id ||
        payload.payment_id ||
        ""
      );


    console.log(
      "👤 Email:",
      email
    );

    console.log(
      "💰 Montant:",
      amount
    );

    console.log(
      "🛍️ Produit:",
      product
    );

    console.log(
      "🧾 Payment ID:",
      paymentId
    );


    /*
    --------------------------------
    TEST PULSE / PAYLOAD INCOMPLET
    --------------------------------

    On ne crédite JAMAIS sans email.
    Mais on répond 200 afin de confirmer
    que le webhook est bien accessible.
    */

    if (!email) {

      console.log(
        "ℹ️ Aucun email dans ce Pulse."
      );

      return res.status(200).json({

        success: true,

        received: true,

        credited: false,

        message:
          "Pulse reçu, aucun client crédité."

      });

    }


    /*
    --------------------------------
    VÉRIFICATION PRODUIT
    --------------------------------
    */

    if (
      product &&
      !product
        .toLowerCase()
        .includes(
          "recharge nosmyboost"
        )
    ) {

      console.log(
        "⚠️ Produit ignoré:",
        product
      );

      return res.status(200).json({

        success: true,

        ignored: true,

        reason:
          "Produit différent."

      });

    }


    /*
    --------------------------------
    VÉRIFICATION MONTANT
    --------------------------------
    */

    if (
      amount > 0 &&
      amount !== RECHARGE_AMOUNT
    ) {

      console.log(
        "⚠️ Montant différent:",
        amount
      );

      return res.status(200).json({

        success: true,

        ignored: true,

        reason:
          "Montant différent."

      });

    }


    /*
    --------------------------------
    REFERENCE PAIEMENT
    --------------------------------
    */

    const referenceId =
      paymentId ||
      crypto
        .createHash("sha256")
        .update(
          JSON.stringify(payload)
        )
        .digest("hex");


    const reference =
      `CHARIOW:${referenceId}`;


    /*
    --------------------------------
    RECHERCHER CLIENT
    --------------------------------
    */

    db.get(
      `
      SELECT
        id,
        email,
        balance,
        total_deposited
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
      `,
      [email],
      (error, user) => {

        if (error) {

          console.error(
            "❌ Recherche utilisateur:",
            error
          );

          return res.status(500).json({

            success: false,

            message:
              "Erreur base de données."

          });

        }


        /*
        --------------------------------
        CLIENT INTROUVABLE
        --------------------------------
        */

        if (!user) {

          console.error(
            "❌ Client NOSMYBOOST introuvable:",
            email
          );

          return res.status(200).json({

            success: true,

            credited: false,

            message:
              "Compte NOSMYBOOST introuvable."

          });

        }


        /*
        --------------------------------
        PROTECTION DOUBLE CRÉDIT
        --------------------------------
        */

        db.get(
          `
          SELECT
            id
          FROM deposits
          WHERE proof = ?
          LIMIT 1
          `,
          [reference],
          (checkError, existing) => {

            if (checkError) {

              console.error(
                "❌ Vérification dépôt:",
                checkError
              );

              return res.status(500).json({

                success: false,

                message:
                  "Erreur vérification paiement."

              });

            }


            if (existing) {

              console.log(
                "⚠️ Paiement déjà traité:",
                reference
              );

              return res.status(200).json({

                success: true,

                alreadyProcessed: true,

                credited: false

              });

            }


            /*
            --------------------------------
            CRÉDIT
            --------------------------------
            */

            creditUser(
              user,
              email,
              reference,
              res
            );

          }
        );

      }
    );

  }
);


/*
========================================
CRÉDITER LE CLIENT
========================================
*/

function creditUser(
  user,
  email,
  reference,
  res
) {

  db.serialize(() => {

    db.run(
      "BEGIN TRANSACTION",
      (beginError) => {

        if (beginError) {

          console.error(
            "❌ BEGIN:",
            beginError
          );

          return res.status(500).json({

            success: false,

            message:
              "Impossible de démarrer la transaction."

          });

        }


        /*
        --------------------------------
        CRÉER LE DÉPÔT
        --------------------------------
        */

        db.run(
          `
          INSERT INTO deposits
          (
            user_id,
            amount,
            method,
            proof,
            status
          )
          VALUES
          (?, ?, ?, ?, 'completed')
          `,
          [
            user.id,
            RECHARGE_AMOUNT,
            "chariow",
            reference
          ],
          function(error) {

            if (error) {

              console.error(
                "❌ Création dépôt:",
                error
              );

              return db.run(
                "ROLLBACK",
                () => {

                  return res.status(500).json({

                    success: false,

                    message:
                      "Impossible d'enregistrer le paiement."

                  });

                }
              );

            }


            /*
            --------------------------------
            CRÉDITER BALANCE
            --------------------------------
            */

            db.run(
              `
              UPDATE users
              SET
                balance =
                  COALESCE(balance, 0)
                  + ?,

                total_deposited =
                  COALESCE(total_deposited, 0)
                  + ?

              WHERE id = ?
              `,
              [
                RECHARGE_AMOUNT,
                RECHARGE_AMOUNT,
                user.id
              ],
              function(updateError) {

                if (updateError) {

                  console.error(
                    "❌ Crédit balance:",
                    updateError
                  );

                  return db.run(
                    "ROLLBACK",
                    () => {

                      return res.status(500).json({

                        success: false,

                        message:
                          "Impossible de créditer le compte."

                      });

                    }
                  );

                }


                /*
                --------------------------------
                COMMIT
                --------------------------------
                */

                db.run(
                  "COMMIT",
                  (commitError) => {

                    if (commitError) {

                      console.error(
                        "❌ COMMIT:",
                        commitError
                      );

                      return db.run(
                        "ROLLBACK",
                        () => {

                          return res.status(500).json({

                            success: false,

                            message:
                              "Erreur validation paiement."

                          });

                        }
                      );

                    }


                    console.log(
                      "========================================"
                    );

                    console.log(
                      `✅ ${RECHARGE_AMOUNT} CDF CRÉDITÉS`
                    );

                    console.log(
                      `👤 Client: ${email}`
                    );

                    console.log(
                      `🆔 User ID: ${user.id}`
                    );

                    console.log(
                      `🧾 Référence: ${reference}`
                    );

                    console.log(
                      "========================================"
                    );


                    return res.status(200).json({

                      success: true,

                      credited: true,

                      amount:
                        RECHARGE_AMOUNT,

                      userId:
                        user.id,

                      reference

                    });

                  }
                );

              }
            );

          }
        );

      }
    );

  });

}


module.exports = router;
