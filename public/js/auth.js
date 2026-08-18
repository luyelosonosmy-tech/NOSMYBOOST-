/*
========================================
NOSMYBOOST🇧🇪
AUTH JAVASCRIPT
========================================
*/


/*
========================================
INSCRIPTION
========================================
*/

const registerForm =
  document.getElementById(
    "registerForm"
  );


if (registerForm) {

  registerForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const name =
        document.getElementById(
          "name"
        )?.value.trim();


      const email =
        document.getElementById(
          "email"
        )?.value.trim();


      const whatsapp =
        document.getElementById(
          "whatsapp"
        )?.value.trim();


      const country =
        document.getElementById(
          "country"
        )?.value || "CD";


      const password =
        document.getElementById(
          "password"
        )?.value;


      const message =
        document.getElementById(
          "authMessage"
        );


      if (!name || !email || !password) {

        showAuthMessage(
          message,
          "Veuillez remplir tous les champs obligatoires.",
          "error"
        );

        return;

      }


      if (password.length < 8) {

        showAuthMessage(
          message,
          "Le mot de passe doit contenir au moins 8 caractères.",
          "error"
        );

        return;

      }


      try {

        showAuthMessage(
          message,
          "Création du compte...",
          "info"
        );


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


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Impossible de créer le compte."
          );

        }


        showAuthMessage(
          message,
          "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
          "success"
        );


        setTimeout(
          () => {

            window.location.href =
              "/login.html";

          },
          1200
        );


      } catch (error) {

        console.error(
          error
        );


        showAuthMessage(
          message,
          error.message,
          "error"
        );

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
  document.getElementById(
    "loginForm"
  );


if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const email =
        document.getElementById(
          "email"
        )?.value.trim();


      const password =
        document.getElementById(
          "password"
        )?.value;


      const message =
        document.getElementById(
          "authMessage"
        );


      if (!email || !password) {

        showAuthMessage(
          message,
          "Email et mot de passe requis.",
          "error"
        );

        return;

      }


      try {

        showAuthMessage(
          message,
          "Connexion...",
          "info"
        );


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


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Connexion impossible."
          );

        }


        /*
        ==============================
        SAUVEGARDER JWT
        ==============================
        */

        localStorage.setItem(
          "nosmyboost_token",
          data.token
        );


        showAuthMessage(
          message,
          "Connexion réussie. Bienvenue !",
          "success"
        );


        setTimeout(
          () => {

            window.location.href =
              "/dashboard.html";

          },
          600
        );


      } catch (error) {

        console.error(
          error
        );


        showAuthMessage(
          message,
          error.message,
          "error"
        );

      }

    }
  );

}


/*
========================================
MESSAGE
========================================
*/

function showAuthMessage(
  element,
  text,
  type
) {

  if (!element)
    return;


  element.textContent =
    text;


  element.style.padding =
    "12px 16px";


  element.style.borderRadius =
    "10px";


  element.style.marginTop =
    "15px";


  if (type === "success") {

    element.style.background =
      "#ecfdf3";

    element.style.color =
      "#067647";

  }


  if (type === "error") {

    element.style.background =
      "#fef3f2";

    element.style.color =
      "#b42318";

  }


  if (type === "info") {

    element.style.background =
      "#eff8ff";

    element.style.color =
      "#175cd1";

  }

          }
