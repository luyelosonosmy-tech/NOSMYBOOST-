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
VÉRIFIER SIGNATURE CHARIOW
========================================
*/

function verifySignature(req) {

  const secret =
    process.env.CHARIOW_WEBHOOK_SECRET;

  if (!secret) {

    console.error(
      "❌ CHARIOW_WEBHOOK_SECRET manque."
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
  On utilise le RAW BODY original.
  */

  const rawBody =
    req.rawBody ||
    Buffer.from(
      JSON.stringify(req.body || {})
    );


  const expected =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(rawBody)
      .digest("hex");


  try {

    const received =
      String(signature)
        .replace(/^sha256=/, "")
        .trim();


    if (
      received.length !==
      expected.length
    ) {

      return false;

    }


    return crypto.timingSafeEqual(

      Buffer.from(
        received,
        "utf8"
      ),

      Buffer.from(
        expected,
        "utf8"
      )

    );

  } catch {

    return false;

  }

}


/*
========================================
WEBHOOK CHARIOW
========================================
*/

router.post(
  "/",
  (req, res) => {

    console.log(
      "📩 WEBHOOK CHARIOW REÇU"
    );


    /*
    ====================================
    SÉCURITÉ
    ====================================
    */

    if (
      !verifySignature(req)
    ) {

      console.error(
        "❌ Signature Chariow invalide."
      );

      return res.status(401).json({

        success: false,

        message:
          "Signature invalide."

      });

    }


    /*
    ====================================
    PAYLOAD
    ====================================
    */

    const payload =
      req.body || {};


    console.log(
      "📦 PAYLOAD CHARIOW:"
    );

    console.log(
      JSON.stringify(
        payload,
        null,
        2
      )
    );


    /*
    ====================================
    CLIENT
    ====================================
    */

    const email =
      payload.customer?.email ||
      payload.customer_email ||
      payload.email ||
      payload.buyer?.email ||
      null;


    /*
    ====================================
    MONTANT
    ====================================
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
    ====================================
    PRODUIT
    ====================================
    */

    const product =
      payload.product?.name ||
      payload.product_name ||
      payload.name ||
      PRODUCT_NAME;


    /*
    ====================================
    ID VENTE
    ====================================
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
      "🛒 Produit:",
      product
    );

    console.log(
      "🧾 Payment ID:",
      paymentId
    );


    /*
    ====================================
    PRODUIT
    ====================================
    */

    if (
      product &&
      product !== PRODUCT_NAME &&
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

      return res.json({

        success: true,

        ignored: true

      });

    }


    /*
    ====================================
    MONTANT
    ====================================
    */

    if (
      amount &&
      amount !== RECHARGE_AMOUNT
    ) {

      console.log(
        "⚠️ Montant différent:",
        amount
      );

      return res.json({

        success: true,

        ignored: true

      });

    }


    /*
    ====================================
    EMAIL OBLIGATOIRE
    ====================================
    */

    if (!email) {

      console.error(
        "❌ Email client absent."
      );

      return res.status(400).json({

        success: false,

        message:
          "Email client absent."

      });

    }


    /*
    ====================================
    RECHERCHE CLIENT
    ====================================
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


        if (!user) {

          console.error(
            "❌ Client NOSMYBOOST introuvable:",
            email
          );

          return res.status(404).json({

            success: false,

            message:
              "Compte NOSMYBOOST introuvable."

          });

        }


        /*
        ==================================
        ID PAIEMENT
        ==================================
        */

        const finalPaymentId =
          paymentId ||
          crypto
            .createHash("sha256")
            .update(
              JSON.stringify(payload)
            )
            .digest("hex");


        const reference =
          `CHARIOW:${finalPaymentId}`;


        /*
        ==================================
        PROTECTION DOUBLE CRÉDIT
        ==================================
        */

        db.get(

          `
          SELECT id
          FROM deposits
          WHERE proof = ?
          LIMIT 1
          `,

          [reference],

          (checkError, existing) => {

            if (checkError) {

              console.error(
                "❌ Vérification paiement:",
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
                finalPaymentId
              );

              return res.json({

                success: true,

                alreadyProcessed: true

              });

            }


            /*
            ================================
            CRÉDIT
            ================================
            */

            db.serialize(() => {

              db.run(
                "BEGIN TRANSACTION"
              );


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

                function(insertError) {

                  if (insertError) {

                    console.error(
                      "❌ Création dépôt:",
                      insertError
                    );

                    db.run(
                      "ROLLBACK"
                    );

                    return res.status(500).json({

                      success: false,

                      message:
                        "Impossible d'enregistrer le paiement."

                    });

                  }


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

                        db.run(
                          "ROLLBACK"
                        );

                        return res.status(500).json({

                          success: false,

                          message:
                            "Impossible de créditer le compte."

                        });

                      }


                      db.run(
                        "COMMIT",
                        (commitError) => {

                          if (commitError) {

                            console.error(
                              "❌ Commit:",
                              commitError
                            );

                            db.run(
                              "ROLLBACK"
                            );

                            return res.status(500).json({

                              success: false,

                              message:
                                "Erreur validation paiement."

                            });

                          }


                          console.log(
                            `✅ ${RECHARGE_AMOUNT} CDF crédités à ${email}`
                          );


                          return res.json({

                            success: true,

                            credited: true,

                            amount:
                              RECHARGE_AMOUNT,

                            userId:
                              user.id

                          });

                        }
                      );

                    }
                  );

                }
              );

            });

          }
        );

      }
    );

  }
);


module.exports = router;
