const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/database");

const router = express.Router();

const JWT_SECRET =
  String(process.env.JWT_SECRET || "").trim();


/*
========================================
UTILITAIRE
========================================
*/

function createToken(user) {

  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );

}


/*
========================================
INSCRIPTION
========================================
*/

router.post(
  "/register",
  async (req, res) => {

    try {

      const name =
        String(req.body.name || "").trim();

      const email =
        String(req.body.email || "")
          .trim()
          .toLowerCase();

      const whatsapp =
        String(req.body.whatsapp || "").trim();

      const country =
        String(req.body.country || "CD")
          .trim();

      const password =
        String(req.body.password || "");


      /*
      ================================
      VALIDATION
      ================================
      */

      if (!name) {

        return res.status(400).json({
          success: false,
          message: "Veuillez entrer votre nom."
        });

      }


      if (!email) {

        return res.status(400).json({
          success: false,
          message: "Veuillez entrer votre adresse Gmail/email."
        });

      }


      if (!email.includes("@")) {

        return res.status(400).json({
          success: false,
          message: "Adresse email invalide."
        });

      }


      if (password.length < 8) {

        return res.status(400).json({
          success: false,
          message:
            "Le mot de passe doit contenir au moins 8 caractères."
        });

      }


      if (!JWT_SECRET) {

        return res.status(500).json({
          success: false,
          message:
            "JWT_SECRET n'est pas configuré."
        });

      }


      /*
      ================================
      VÉRIFIER EMAIL EXISTANT
      ================================
      */

      db.get(
        `
        SELECT id
        FROM users
        WHERE email = ?
        `,
        [email],
        async (error, existingUser) => {

          if (error) {

            console.error(error);

            return res.status(500).json({
              success: false,
              message:
                "Erreur de base de données."
            });

          }


          if (existingUser) {

            return res.status(409).json({
              success: false,
              message:
                "Cette adresse email est déjà utilisée."
            });

          }


          /*
          ==============================
          HASH PASSWORD
          ==============================
          */

          const hashedPassword =
            await bcrypt.hash(
              password,
              12
            );


          /*
          ==============================
          CRÉER UTILISATEUR
          ==============================
          */

          db.run(
            `
            INSERT INTO users
            (
              name,
              email,
              whatsapp,
              country,
              password,
              balance,
              total_deposited,
              total_spent
            )

            VALUES
            (
              ?,
              ?,
              ?,
              ?,
              ?,
              0,
              0,
              0
            )
            `,
            [
              name,
              email,
              whatsapp,
              country,
              hashedPassword
            ],
            function (insertError) {

              if (insertError) {

                console.error(
                  insertError
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Impossible de créer le compte."
                });

              }


              res.status(201).json({

                success: true,

                message:
                  "Compte créé avec succès.",

                userId:
                  this.lastID

              });

            }
          );

        }
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Erreur serveur."

      });

    }

  }
);


/*
========================================
CONNEXION
========================================
*/

router.post(
  "/login",
  (req, res) => {

    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(req.body.password || "");


    if (!email || !password) {

      return res.status(400).json({

        success: false,

        message:
          "Email et mot de passe requis."

      });

    }


    if (!JWT_SECRET) {

      return res.status(500).json({

        success: false,

        message:
          "JWT_SECRET n'est pas configuré."

      });

    }


    db.get(
      `
      SELECT
        id,
        name,
        email,
        whatsapp,
        country,
        password,
        balance,
        total_deposited,
        total_spent
      FROM users
      WHERE email = ?
      `,
      [email],
      async (error, user) => {

        if (error) {

          console.error(error);

          return res.status(500).json({

            success: false,

            message:
              "Erreur de base de données."

          });

        }


        if (!user) {

          return res.status(401).json({

            success: false,

            message:
              "Email ou mot de passe incorrect."

          });

        }


        const passwordValid =
          await bcrypt.compare(
            password,
            user.password
          );


        if (!passwordValid) {

          return res.status(401).json({

            success: false,

            message:
              "Email ou mot de passe incorrect."

          });

        }


        /*
        ==============================
        TOKEN
        ==============================
        */

        const token =
          createToken(user);


        delete user.password;


        res.json({

          success: true,

          message:
            "Connexion réussie.",

          token,

          user

        });

      }
    );

  }
);


/*
========================================
MON PROFIL
========================================
*/

const authenticateToken =
  require("../middleware/auth");


router.get(
  "/me",
  authenticateToken,
  (req, res) => {

    const userId =
      Number(req.user.id);


    db.get(
      `
      SELECT
        id,
        name,
        email,
        whatsapp,
        country,
        balance,
        total_deposited,
        total_spent,
        created_at
      FROM users
      WHERE id = ?
      `,
      [userId],
      (error, user) => {

        if (error) {

          console.error(error);

          return res.status(500).json({

            success: false,

            message:
              "Impossible de récupérer votre profil."

          });

        }


        if (!user) {

          return res.status(404).json({

            success: false,

            message:
              "Utilisateur introuvable."

          });

        }


        res.json({

          success: true,

          user

        });

      }
    );

  }
);


module.exports = router;
