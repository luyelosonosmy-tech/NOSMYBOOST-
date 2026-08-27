"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const JWT_SECRET =
  String(process.env.JWT_SECRET || "").trim();


/*
========================================
NOSMYBOOST 🇧🇪
AUTHENTIFICATION POSTGRESQL + JWT
========================================
*/


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
      ========================================
      VALIDATION NOM
      ========================================
      */

      if (!name) {

        return res.status(400).json({

          success: false,

          message:
            "Veuillez entrer votre nom."

        });

      }


      /*
      ========================================
      VALIDATION EMAIL
      ========================================
      */

      if (!email) {

        return res.status(400).json({

          success: false,

          message:
            "Veuillez entrer votre adresse Gmail/email."

        });

      }


      if (!email.includes("@")) {

        return res.status(400).json({

          success: false,

          message:
            "Adresse email invalide."

        });

      }


      /*
      ========================================
      VALIDATION MOT DE PASSE
      ========================================
      */

      if (password.length < 8) {

        return res.status(400).json({

          success: false,

          message:
            "Le mot de passe doit contenir au moins 8 caractères."

        });

      }


      /*
      ========================================
      VÉRIFIER JWT_SECRET
      ========================================
      */

      if (!JWT_SECRET) {

        return res.status(500).json({

          success: false,

          message:
            "JWT_SECRET n'est pas configuré."

        });

      }


      /*
      ========================================
      VÉRIFIER EMAIL EXISTANT
      ========================================
      */

      const existingResult =
        await db.query(
          `
          SELECT id
          FROM users
          WHERE email = $1
          LIMIT 1
          `,
          [email]
        );


      if (existingResult.rows.length > 0) {

        return res.status(409).json({

          success: false,

          message:
            "Cette adresse email est déjà utilisée."

        });

      }


      /*
      ========================================
      HASH PASSWORD
      ========================================
      */

      const hashedPassword =
        await bcrypt.hash(
          password,
          12
        );


      /*
      ========================================
      CRÉER UTILISATEUR
      ========================================
      */

      const insertResult =
        await db.query(
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
            $1,
            $2,
            $3,
            $4,
            $5,
            0,
            0,
            0
          )

          RETURNING
            id,
            name,
            email,
            whatsapp,
            country,
            balance,
            total_deposited,
            total_spent,
            created_at
          `,
          [
            name,
            email,
            whatsapp,
            country,
            hashedPassword
          ]
        );


      const user =
        insertResult.rows[0];


      /*
      ========================================
      SUCCÈS
      ========================================
      */

      return res.status(201).json({

        success: true,

        message:
          "Compte créé avec succès.",

        userId:
          user.id

      });


    } catch (error) {

      console.error(
        "❌ Erreur inscription PostgreSQL:",
        error
      );


      /*
      ========================================
      EMAIL UNIQUE
      ========================================
      */

      if (
        error.code === "23505"
      ) {

        return res.status(409).json({

          success: false,

          message:
            "Cette adresse email est déjà utilisée."

        });

      }


      return res.status(500).json({

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
  async (req, res) => {

    try {

      const email =
        String(req.body.email || "")
          .trim()
          .toLowerCase();

      const password =
        String(req.body.password || "");


      /*
      ========================================
      VALIDATION
      ========================================
      */

      if (!email || !password) {

        return res.status(400).json({

          success: false,

          message:
            "Email et mot de passe requis."

        });

      }


      /*
      ========================================
      JWT SECRET
      ========================================
      */

      if (!JWT_SECRET) {

        return res.status(500).json({

          success: false,

          message:
            "JWT_SECRET n'est pas configuré."

        });

      }


      /*
      ========================================
      RECHERCHER UTILISATEUR
      ========================================
      */

      const result =
        await db.query(
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
            total_spent,
            created_at

          FROM users

          WHERE email = $1

          LIMIT 1
          `,
          [email]
        );


      const user =
        result.rows[0];


      /*
      ========================================
      UTILISATEUR INEXISTANT
      ========================================
      */

      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "Email ou mot de passe incorrect."

        });

      }


      /*
      ========================================
      VÉRIFIER PASSWORD
      ========================================
      */

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
      ========================================
      CRÉER TOKEN JWT
      ========================================
      */

      const token =
        createToken(user);


      /*
      ========================================
      NE JAMAIS ENVOYER PASSWORD
      ========================================
      */

      delete user.password;


      /*
      ========================================
      SUCCÈS
      ========================================
      */

      return res.json({

        success: true,

        message:
          "Connexion réussie.",

        token,

        user

      });


    } catch (error) {

      console.error(
        "❌ Erreur connexion PostgreSQL:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Erreur serveur."

      });

    }

  }
);


/*
========================================
MON PROFIL
========================================
*/

router.get(
  "/me",
  authenticateToken,
  async (req, res) => {

    try {

      const userId =
        Number(req.user.id);


      /*
      ========================================
      VALIDATION ID
      ========================================
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
      ========================================
      RÉCUPÉRER UTILISATEUR
      ========================================
      */

      const result =
        await db.query(
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

          WHERE id = $1

          LIMIT 1
          `,
          [userId]
        );


      const user =
        result.rows[0];


      /*
      ========================================
      UTILISATEUR INTROUVABLE
      ========================================
      */

      if (!user) {

        return res.status(404).json({

          success: false,

          message:
            "Utilisateur introuvable."

        });

      }


      /*
      ========================================
      SUCCÈS
      ========================================
      */

      return res.json({

        success: true,

        user

      });


    } catch (error) {

      console.error(
        "❌ Erreur récupération profil PostgreSQL:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer votre profil."

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
