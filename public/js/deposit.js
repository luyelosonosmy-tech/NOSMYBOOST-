"use strict";

const token =
  localStorage.getItem("nosmyboost_token");

const WHATSAPP =
  "243891981638";

/*
IMPORTANT :
Mets ici le vrai lien Chariow
qui correspond au produit/recharge.
*/

const CHARIOW_URL =
  "TON_VRAI_LIEN_CHARIOW_ICI";


let selectedAmount = 2500;
let selectedUsd = 1;


/*
========================================
ÉLÉMENTS
========================================
*/

const currentBalance =
  document.getElementById("currentBalance");

const selectedAmountElement =
  document.getElementById("selectedAmount");

const selectedUsdElement =
  document.getElementById("selectedUsd");

const payButton =
  document.getElementById("payButton");

const whatsappButton =
  document.getElementById("whatsappButton");

const manualWhatsapp =
  document.getElementById("manualWhatsapp");

const depositHistory =
  document.getElementById("depositHistory");

const userName =
  document.getElementById("userName");

const logoutButton =
  document.getElementById("logoutButton");


/*
========================================
FORMAT
========================================
*/

function formatMoney(amount) {

  return Number(
    amount || 0
  ).toLocaleString(
    "fr-FR"
  );

}


/*
========================================
WHATSAPP
========================================
*/

function whatsappLink(amount) {

  const message =
    `Bonjour NOSMYBOOST🇧🇪, je souhaite recharger mon solde de ${formatMoney(amount)} CDF. Merci de m'indiquer la procédure de paiement manuel.`;

  return `https://wa.me/${WHATSAPP}?text=${
    encodeURIComponent(message)
  }`;

}


/*
========================================
METTRE À JOUR LE MONTANT
========================================
*/

function updatePayment() {

  selectedAmountElement.textContent =
    `${formatMoney(selectedAmount)} CDF`;

  selectedUsdElement.textContent =
    `$${Number(selectedUsd).toFixed(2)} USD`;


  payButton.textContent =
    `💳 Payer ${formatMoney(selectedAmount)} CDF`;


  /*
  Si tu as un vrai lien Chariow
  */

  if (
    CHARIOW_URL &&
    !CHARIOW_URL.includes(
      "TON_VRAI_LIEN"
    )
  ) {

    payButton.href =
      CHARIOW_URL;

  } else {

    payButton.href =
      whatsappLink(selectedAmount);

  }


  whatsappButton.href =
    whatsappLink(selectedAmount);


  manualWhatsapp.href =
    whatsappLink(selectedAmount);

}


/*
========================================
CHOIX MONTANT
========================================
*/

document
  .querySelectorAll(".amount-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".amount-btn")
          .forEach(btn => {

            btn.classList.remove(
              "active"
            );

          });


        button.classList.add(
          "active"
        );


        selectedAmount =
          Number(
            button.dataset.amount
          );


        selectedUsd =
          Number(
            button.dataset.usd
          );


        updatePayment();

      }
    );

  });


/*
========================================
PREMIER MONTANT
========================================
*/

const firstAmount =
  document.querySelector(
    ".amount-btn"
  );

if (firstAmount) {

  firstAmount.classList.add(
    "active"
  );

}


/*
========================================
CHARGER PROFIL
========================================
*/

async function loadProfile() {

  try {

    const response =
      await fetch(
        "/api/auth/me",
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(
        data.message ||
        "Impossible de charger le profil."
      );

    }


    const user =
      data.user || {};


    if (userName) {

      userName.textContent =
        user.name ||
        user.email ||
        "";

    }


    if (currentBalance) {

      currentBalance.textContent =
        `${formatMoney(
          user.balance
        )} CDF`;

    }

  } catch (error) {

    console.error(
      "Profil:",
      error
    );

  }

}


/*
========================================
HISTORIQUE DÉPÔTS
========================================
*/

async function loadDeposits() {

  try {

    const response =
      await fetch(
        "/api/deposits/my",
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Impossible de charger l'historique."
      );

    }


    const deposits =
      data.deposits || [];


    if (!deposits.length) {

      depositHistory.innerHTML = `

        <div class="empty-state">

          <span>💳</span>

          <p>
            Aucun dépôt pour le moment.
          </p>

        </div>

      `;

      return;

    }


    depositHistory.innerHTML =
      deposits.map(
        deposit => {

          const status =
            String(
              deposit.status || ""
            ).toLowerCase();


          let statusClass =
            "status-pending";


          if (
            status === "completed" ||
            status === "approved"
          ) {

            statusClass =
              "status-completed";

          }


          if (
            status === "failed" ||
            status === "rejected" ||
            status === "cancelled"
          ) {

            statusClass =
              "status-failed";

          }


          return `

            <div class="deposit-item">

              <div>

                <div class="deposit-amount">
                  ${formatMoney(
                    deposit.amount
                  )} CDF
                </div>

                <div class="deposit-date">
                  ${deposit.created_at || ""}
                </div>

              </div>

              <strong
                class="${statusClass}"
              >
                ${status || "pending"}
              </strong>

            </div>

          `;

        }
      ).join("");


  } catch (error) {

    console.error(
      "Dépôts:",
      error
    );


    depositHistory.innerHTML = `

      <div class="empty-state">

        <span>⚠️</span>

        <p>
          Impossible de charger l'historique.
        </p>

      </div>

    `;

  }

}


/*
========================================
DÉCONNEXION
========================================
*/

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        "nosmyboost_token"
      );

      window.location.href =
        "/login.html";

    }
  );

}


/*
========================================
DÉMARRAGE
========================================
*/

updatePayment();

loadProfile();

loadDeposits();
