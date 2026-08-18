const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../database/database");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "CHANGE_THIS_SECRET";


/*
========================================
INSCRIPTION
========================================
*/

router.post("/register", async (req, res) => {

  try {

    const {
      name,
      email,
      whatsapp,
      country,
      password
    } = req.body;


    const cleanName =
      String(name || "").trim();

    const cleanEmail =
      String(email || "").trim().toLowerCase();

    const cleanWhatsapp =
      String(whatsapp || "").trim();

    const cleanCountry =
      String(country || "CD").trim();


    /*
    ================================
    VALIDATION
    ================================
    */

    if (!cleanName) {

      return res.status(400).json({
        success: false,
        message: "Le nom est obligatoire."
      });

    }


    if (!cleanEmail) {

      return res.status(400).json({
        success: false,
        message: "L'adresse email est obligatoire."
      });

    }


    if (!cleanEmail.includes("@")) {

      return res.status(400).json({
        success: false,
        message: "Adresse email invalide."
      });

    }


    if (!password || password.length < 8) {

      return res.status(400).json({
        success: false,
        message:
          "Le mot de passe doit contenir au moins 8 caractères."
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
      [cleanEmail],
      async (findError, existingUser) => {

        if (findError) {

          console.error(findError);

          return res.status(500).json({
            success: false,
            message: "Erreur de base de données."
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
        HASH MOT DE PASSE
        ==============================
        */

        const hashedPassword =
          await bcrypt.hash(password, 12);


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
            password
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            cleanName,
            cleanEmail,
            cleanWhatsapp,
            cleanCountry,
            hashedPassword
          ],
          function (insertError) {

            if (insertError) {

              console.error(insertError);

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
      message: "Erreur serveur."
    });

  }

});


/*
========================================
CONNEXION
========================================
*/

router.post("/login", (req, res) => {

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
        "Email et mot de passe obligatoires."
    });

  }


  db.get(
    `
    SELECT *
    FROM users
    WHERE email = ?
    `,
    [email],
    async (error, user) => {

      if (error) {

        console.error(error);

        return res.status(500).json({
          success: false,
          message: "Erreur de base de données."
        });

      }


      if (!user) {

        return res.status(401).json({
          success: false,
          message:
            "Email ou mot de passe incorrect."
        });

      }


      /*
      ================================
      VÉRIFIER MOT DE PASSE
      ================================
      */

      const passwordCorrect =
        await bcrypt.compare(
          password,
          user.password
        );


      if (!passwordCorrect) {

        return res.status(401).json({
          success: false,
          message:
            "Email ou mot de passe incorrect."
        });

      }


      /*
      ================================
      CRÉER TOKEN
      ================================
      */

      const token =
        jwt.sign(
          {
            id: user.id,
            email: user.email
          },
          JWT_SECRET,
          {
            expiresIn: "7d"
          }
        );


      /*
      ================================
      RÉPONSE
      ================================
      */

      res.json({

        success: true,

        message:
          "Connexion réussie.",

        token,

        user: {

          id:
            user.id,

          name:
            user.name,

          email:
            user.email,

          whatsapp:
            user.whatsapp,

          country:
            user.country,

          balance:
            user.balance,

          total_deposited:
            user.total_deposited,

          total_spent:
            user.total_spent

        }

      });

    }
  );

});


module.exports = router;
