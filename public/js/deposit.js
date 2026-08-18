/*
========================================
NOSMYBOOST🇧🇪
DÉPÔTS CLIENT
========================================
*/

const TOKEN_KEY = "nosmyboost_token";

const token =
  localStorage.getItem(TOKEN_KEY);


/*
========================================
PROTECTION
========================================
*/

if (!token) {

  window.location.href =
    "/login.html";

}


/*
========================================
ÉTAT DU DÉPÔT
========================================
*/

let selectedAmount = 0;

let selectedMethod = "";


/*
========================================
NUMÉROS DE PAIEMENT
========================================

⚠️ À REMPLACER PAR TES VRAIS NUMÉROS
AVANT LA MISE EN PRODUCTION.
*/

const PAYMENT_NUMBERS = {

  airtel:
    "À CONFIGURER",

  mpesa:
    "À CONFIGURER",

  orange:
    "À CONFIGURER"

};


/*
========================================
NOMS DES MOYENS
========================================
*/

const PAYMENT_NAMES = {

  airtel:
    "Airtel Money",

  mpesa:
    "Vodacom M-Pesa",

  orange:
    "Orange Money"

};


/*
========================================
CHOIX DU MONTANT
========================================
*/

document
  .querySelectorAll(
    ".amount-btn"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        selectedAmount =
          Number(
            button.dataset.amount
          );


        const customAmount =
          document.getElementById(
            "customAmount"
          );

        const depositAmount =
          document.getElementById(
            "depositAmount"
          );


        if (customAmount) {

          customAmount.value = "";

        }


        if (depositAmount) {

          depositAmount.value =
            selectedAmount;

        }


        document
          .querySelectorAll(
            ".amount-btn"
          )
          .forEach(item => {

            item.classList.remove(
              "btn-primary"
            );

            item.classList.add(
              "btn-outline"
            );

          });


        button.classList.remove(
          "btn-outline"
        );

        button.classList.add(
          "btn-primary"
        );

      }
    );

  });


/*
========================================
MONTANT PERSONNALISÉ
========================================
*/

const customAmount =
  document.getElementById(
    "customAmount"
  );


if (customAmount) {

  customAmount.addEventListener(
    "input",
    () => {

      const value =
        Number(
          customAmount.value
        );


      selectedAmount =
        Number.isFinite(value)
          ? value
          : 0;


      const depositAmount =
        document.getElementById(
          "depositAmount"
        );


      if (depositAmount) {

        depositAmount.value =
          selectedAmount || "";

      }


      document
        .querySelectorAll(
          ".amount-btn"
        )
        .forEach(item => {

          item.classList.remove(
            "btn-primary"
          );

          item.classList.add(
            "btn-outline"
          );

        });

    }
  );

}


/*
========================================
CHOIX DU MOYEN DE PAIEMENT
========================================
*/

document
  .querySelectorAll(
    ".payment-method"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        selectedMethod =
          button.dataset.method;


        const instructions =
          document.getElementById(
            "paymentInstructions"
          );

        const text =
          document.getElementById(
            "selectedPaymentText"
          );

        const number =
          document.getElementById(
            "paymentNumber"
          );


        /*
        ================================
        STYLE SÉLECTION
        ================================
        */

        document
          .querySelectorAll(
            ".payment-method"
          )
          .forEach(item => {

            item.style.borderColor =
              "#e7ebf1";

          });


        button.style.borderColor =
          "#111827";


        /*
        ================================
        AFFICHAGE INSTRUCTIONS
        ================================
        */

        if (instructions) {

          instructions.style.display =
            "block";

        }


        if (text) {

          text.textContent =
            `Vous avez choisi ${PAYMENT_NAMES[selectedMethod]}. Effectuez le paiement avec le numéro ci-dessous.`;

        }


        if (number) {

          number.textContent =
            PAYMENT_NUMBERS[
              selectedMethod
            ] ||
            "À configurer";

        }

      }
    );

  });


/*
========================================
ENVOI DU DÉPÔT
========================================
*/

const depositForm =
  document.getElementById(
    "depositForm"
  );


if (depositForm) {

  depositForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const message =
        document.getElementById(
          "depositMessage"
        );

      const button =
        document.getElementById(
          "depositButton"
        );

      const proof =
        document.getElementById(
          "proof"
        ).value
        .trim();


      /*
      ================================
      VALIDATION
      ================================
      */

      if (
        !selectedAmount ||
        selectedAmount < 1000
      ) {

        message.textContent =
          "Le montant minimum est de 1 000 CDF.";

        return;

      }


      if (!selectedMethod) {

        message.textContent =
          "Choisissez un moyen de paiement.";

        return;

      }


      if (!proof) {

        message.textContent =
          "Veuillez fournir la référence ou la preuve du paiement.";

        return;

      }


      /*
      ================================
      CHARGEMENT
      ================================
      */

      button.disabled = true;

      button.textContent =
        "Envoi en cours...";

      message.textContent = "";


      try {

        const response =
          await fetch(
            "/api/deposits",
            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json",

                "Authorization":
                  `Bearer ${token}`

              },

              body:
                JSON.stringify({

                  amount:
                    selectedAmount,

                  method:
                    selectedMethod,

                  proof

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
            "Impossible d'envoyer la demande.";

          return;

        }


        /*
        ================================
        SUCCÈS
        ================================
        */

        message.textContent =
          "Demande envoyée avec succès. Votre dépôt est en attente de validation par l'administrateur.";


        depositForm.reset();


        selectedAmount = 0;

        selectedMethod = "";


        const instructions =
          document.getElementById(
            "paymentInstructions"
          );


        if (instructions) {

          instructions.style.display =
            "none";

        }


        document
          .querySelectorAll(
            ".amount-btn"
          )
          .forEach(item => {

            item.classList.remove(
              "btn-primary"
            );

            item.classList.add(
              "btn-outline"
            );

          });


        document
          .querySelectorAll(
            ".payment-method"
          )
          .forEach(item => {

            item.style.borderColor =
              "#e7ebf1";

          });


      } catch (error) {

        console.error(error);

        message.textContent =
          "Impossible de contacter le serveur.";

      } finally {

        button.disabled = false;

        button.textContent =
          "Envoyer la demande";

      }

    }
  );

          }
