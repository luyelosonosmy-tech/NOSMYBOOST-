/*
========================================
NOSMYBOOST🇧🇪 — AUTHENTIFICATION
========================================
*/


/*
========================================
INSCRIPTION
========================================
*/

const registerForm =
  document.getElementById("registerForm");


if (registerForm) {

  registerForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const name =
        document.getElementById("name")
          .value
          .trim();

      const email =
        document.getElementById("email")
          .value
          .trim();

      const whatsapp =
        document.getElementById("whatsapp")
          .value
          .trim();

      const country =
        document.getElementById("country")
          .value;

      const password =
        document.getElementById("password")
          .value;

      const passwordConfirm =
        document.getElementById("passwordConfirm")
          .value;

      const message =
        document.getElementById("registerMessage");

      const button =
        document.getElementById("registerButton");


      /*
      ================================
      VALIDATION
      ================================
      */

      if (
        password !== passwordConfirm
      ) {

        message.textContent =
          "Les deux mots de passe ne correspondent pas.";

        return;

      }


      if (password.length < 8) {

        message.textContent =
          "Le mot de passe doit contenir au moins 8 caractères.";

        return;

      }


      /*
      ================================
      CHARGEMENT
      ================================
      */

      button.disabled = true;

      button.textContent =
        "Création en cours...";

      message.textContent = "";


      try {

        const response =
          await fetch(
            "/api/auth/register",
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  name,
                  email,
                  whatsapp,
                  country,
                  password

                })

            }
          );


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          message.textContent =
            data.message ||
            "Impossible de créer le compte.";

          return;

        }


        /*
        ================================
        SUCCÈS
        ================================
        */

        message.textContent =
          "Compte créé avec succès. Redirection vers la connexion...";


        setTimeout(() => {

          window.location.href =
            "/login.html";

        }, 1200);


      } catch (error) {

        console.error(error);

        message.textContent =
          "Impossible de contacter le serveur.";

      } finally {

        button.disabled = false;

        button.textContent =
          "Créer mon compte";

      }

    }
  );

}


/*
========================================
CONNEXION
========================================
*/

const loginForm =
  document.getElementById("loginForm");


if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const email =
        document.getElementById("email")
          .value
          .trim();

      const password =
        document.getElementById("password")
          .value;

      const message =
        document.getElementById("loginMessage");

      const button =
        document.getElementById("loginButton");


      /*
      ================================
      CHARGEMENT
      ================================
      */

      button.disabled = true;

      button.textContent =
        "Connexion...";

      message.textContent = "";


      try {

        const response =
          await fetch(
            "/api/auth/login",
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  email,
                  password

                })

            }
          );


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          message.textContent =
            data.message ||
            "Connexion impossible.";

          return;

        }


        /*
        ================================
        SAUVEGARDER SESSION
        ================================
        */

        localStorage.setItem(
          "nosmyboost_token",
          data.token
        );


        localStorage.setItem(
          "nosmyboost_user",
          JSON.stringify(data.user)
        );


        message.textContent =
          "Connexion réussie. Redirection...";


        /*
        ================================
        DASHBOARD
        ================================
        */

        setTimeout(() => {

          window.location.href =
            "/dashboard.html";

        }, 700);


      } catch (error) {

        console.error(error);

        message.textContent =
          "Impossible de contacter le serveur.";

      } finally {

        button.disabled = false;

        button.textContent =
          "Se connecter";

      }

    }
  );

    }
