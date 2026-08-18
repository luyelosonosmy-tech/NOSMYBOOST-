document.addEventListener("DOMContentLoaded", () => {

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

        const message =
          document.getElementById("registerMessage");

        const name =
          document.getElementById("name").value.trim();

        const email =
          document.getElementById("email").value.trim();

        const whatsapp =
          document.getElementById("whatsapp").value.trim();

        const country =
          document.getElementById("country").value;

        const password =
          document.getElementById("password").value;

        const confirmPassword =
          document.getElementById("confirmPassword").value;


        if (password !== confirmPassword) {

          message.textContent =
            "Les deux mots de passe ne correspondent pas.";

          return;

        }


        if (password.length < 8) {

          message.textContent =
            "Le mot de passe doit contenir au moins 8 caractères.";

          return;

        }


        message.textContent =
          "Création du compte...";


        try {

          const response =
            await fetch("/api/auth/register", {

              method: "POST",

              headers: {
                "Content-Type": "application/json"
              },

              body: JSON.stringify({
                name,
                email,
                whatsapp,
                country,
                password
              })

            });


          const data =
            await response.json();


          if (!response.ok || !data.success) {

            message.textContent =
              data.message ||
              "Impossible de créer le compte.";

            return;

          }


          message.textContent =
            "Compte créé avec succès. Redirection...";


          setTimeout(() => {

            window.location.href =
              "/login.html";

          }, 1000);


        } catch (error) {

          console.error(error);

          message.textContent =
            "Impossible de contacter le serveur.";

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


        const message =
          document.getElementById("loginMessage");


        const email =
          document.getElementById("email").value.trim();

        const password =
          document.getElementById("password").value;


        message.textContent =
          "Connexion...";


        try {

          const response =
            await fetch("/api/auth/login", {

              method: "POST",

              headers: {
                "Content-Type": "application/json"
              },

              body: JSON.stringify({
                email,
                password
              })

            });


          const data =
            await response.json();


          if (!response.ok || !data.success) {

            message.textContent =
              data.message ||
              "Connexion impossible.";

            return;

          }


          /*
          ================================
          SAUVEGARDE DE LA SESSION
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


          setTimeout(() => {

            window.location.href =
              "/dashboard.html";

          }, 700);


        } catch (error) {

          console.error(error);

          message.textContent =
            "Impossible de contacter le serveur.";

        }

      }
    );

  }

});
