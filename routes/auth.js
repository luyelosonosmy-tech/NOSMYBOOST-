const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../database/database");

const router = express.Router();

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

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nom, email et mot de passe sont obligatoires."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    db.get(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail],
      async (err, existingUser) => {

        if (err) {
          console.error(err);

          return res.status(500).json({
            success: false,
            message: "Erreur de base de données."
          });
        }

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: "Cette adresse email est déjà utilisée."
          });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        db.run(
          `
          INSERT INTO users
          (name, email, whatsapp, country, password)
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            name.trim(),
            cleanEmail,
            whatsapp || "",
            country || "CD",
            hashedPassword
          ],
          function (insertError) {

            if (insertError) {
              console.error(insertError);

              return res.status(500).json({
                success: false,
                message: "Impossible de créer le compte."
              });
            }

            return res.status(201).json({
              success: true,
              message: "Compte créé avec succès.",
              userId: this.lastID
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

  const {
    email,
    password
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email et mot de passe sont obligatoires."
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  db.get(
    `
    SELECT *
    FROM users
    WHERE email = ?
    `,
    [cleanEmail],
    async (err, user) => {

      if (err) {
        console.error(err);

        return res.status(500).json({
          success: false,
          message: "Erreur de base de données."
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Email ou mot de passe incorrect."
        });
      }

      const passwordCorrect = await bcrypt.compare(
        password,
        user.password
      );

      if (!passwordCorrect) {
        return res.status(401).json({
          success: false,
          message: "Email ou mot de passe incorrect."
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d"
        }
      );

      return res.json({
        success: true,
        message: "Connexion réussie.",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          whatsapp: user.whatsapp,
          country: user.country,
          balance: user.balance
        }
      });

    }
  );

});


module.exports = router;
