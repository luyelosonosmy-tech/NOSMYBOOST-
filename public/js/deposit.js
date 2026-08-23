"use strict";

/*
========================================
NOSMYBOOST 🇧🇪
DEPOSIT JAVASCRIPT
========================================
*/

const CHARIOW_CHECKOUT_URL =
  "https://iayzxtqb.mychariow.co/prd_szcsq1ct/checkout";


/*
========================================
ÉLÉMENTS
========================================
*/

const depositForm =
  document.getElementById("depositForm");

const amountInput =
  document.getElementById("amount");

const paymentMethod =
  document.getElementById("paymentMethod");

const paymentInstructions =
  document.getElementById("paymentInstructions");

const referenceInput =
  document.getElementById("reference");

const balanceElement =
  document.getElementById("balance");

const depositsList =
  document.getElementById("depositsList");

const submitButton =
  depositForm
    ? depositForm.querySelector(
        'button[type="submit"]'
      )
    : null;


/*
========================================
TAUX / MONTANT
========================================
*/

const MIN_AMOUNT = 1000;


/*
========================================
TOKEN
========================================
*/

const token =
  localStorage.getItem(
    "nosmyboost_token"
  );


/*
========================================
API
========================================
*/

async function api(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        ...options,

        headers: {
          ...(options.headers || {}),

          "Authorization":
            `Bearer ${token}`,

          "Content-Type":
            "application/json"
        }
      }
    );


  const data =
    await response
      .json()
      .catch(() => ({}));


  if (
    response.status === 401 ||
    response.status === 403
  ) {

    localStorage.removeItem(
      "nosmyboost_token"
    );

    window.location.href =
      "/login.html";

    throw new Error(
      "Session expirée."
    );

  }


  if (!response.ok) {

    throw new Error(
      data.message ||
      "Erreur serveur."
    );

  }


  return data;

}


/*
========================================
FORMAT ARGENT
========================================
*/

function formatMoney(
  amount
) {

  return Number(
    amount || 0
  ).toLocaleString(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );

}


/*
========================================
CHARGER LE SOLDE
========================================
*/

async function loadBalance() {

  try {

    const data =
      await api(
        "/api/auth/me"
      );


    const user =
      data.user || {};


    const balance =
      Number(
        user.balance || 0
      );


    if (balanceElement) {

      balanceElement.textContent =
        `${formatMoney(balance)} CDF`;

    }

  } catch (error) {

    console.error(
      "Erreur solde:",
      error
    );

    if (balanceElement) {

      balanceElement.textContent =
        "0 CDF";

    }

  }

}


/*
========================================
INSTRUCTIONS PAIEMENT
========================================
*/

function showPaymentInstructions() {

  if (!paymentInstructions)
    return;


  const method =
    paymentMethod
      ? paymentMethod.value
      : "";


  if (!method) {

    paymentInstructions.innerHTML = `
      <p>
        Choisissez un moyen de paiement
        pour voir les instructions.
      </p>
    `;

    return;

  }


  if (
    method === "airtel" ||
    method === "Airtel Money"
  ) {

    paymentInstructions.innerHTML = `
      <div class="payment-box">

        <strong>
          🔴 Airtel Money
        </strong>

        <p>
          Effectuez votre paiement,
          puis utilisez la référence
          de transaction pour confirmer
          votre recharge.
        </p>

      </div>
    `;

    return;

  }


  if (
    method === "mpesa" ||
    method === "Vodacom M-Pesa"
  ) {

    paymentInstructions.innerHTML = `
      <div class="payment-box">

        <strong>
          🟢 Vodacom M-Pesa
        </strong>

        <p>
          Effectuez votre paiement,
          puis utilisez la référence
          de transaction pour confirmer
          votre recharge.
        </p>

      </div>
    `;

    return;

  }


  if (
    method === "orange" ||
    method === "Orange Money"
  ) {

    paymentInstructions.innerHTML = `
      <div class="payment-box">

        <strong>
          🟠 Orange Money
        </strong>

        <p>
          Effectuez votre paiement,
          puis utilisez la référence
          de transaction pour confirmer
          votre recharge.
        </p>

      </div>
    `;

    return;

  }


  paymentInstructions.innerHTML = `
    <p>
      Choisissez un moyen de paiement
      valide.
    </p>
  `;

}


/*
========================================
BOUTON CHARIOW
========================================
*/

function createChariowButton() {

  const container =
    document.getElementById(
      "chariowPayment"
    );


  if (!container)
    return;


  container.innerHTML = `

    <div class="chariow-box">

      <h3>
        ⚡ Paiement automatique
      </h3>

      <p>
        Rechargez votre compte NOSMYBOOST
        directement avec Chariow.
      </p>

      <button
        type="button"
        id="chariowButton"
        class="btn btn-primary"
      >
        💳 Payer 2 500 CDF
      </button>

      <p class="small-text">
        Après confirmation du paiement,
        votre recharge sera traitée.
      </p>

    </div>

  `;


  const button =
    document.getElementById(
      "chariowButton"
    );


  if (button) {

    button.addEventListener(
      "click",
      () => {

        window.location.href =
          CHARIOW_CHECKOUT_URL;

      }
    );

  }

}


/*
========================================
ENVOYER DEMANDE DE DÉPÔT
========================================
*/

async function submitDeposit(
  event
) {

  event.preventDefault();


  const amount =
    Number(
      amountInput
        ? amountInput.value
        : 0
    );


  const method =
    paymentMethod
      ? paymentMethod.value
      : "";


  const reference =
    referenceInput
      ? referenceInput.value.trim()
      : "";


  /*
  ==============================
  VALIDATION MONTANT
  ==============================
  */

  if (
    !Number.isFinite(amount) ||
    amount < MIN_AMOUNT
  ) {

    alert(
      `Le montant minimum est de ${formatMoney(MIN_AMOUNT)} CDF.`
    );

    return;

  }


  /*
  ==============================
  VALIDATION MOYEN
  ==============================
  */

  if (!method) {

    alert(
      "Veuillez choisir un moyen de paiement."
    );

    return;

  }


  /*
  ==============================
  VALIDATION RÉFÉRENCE
  ==============================
  */

  if (!reference) {

    alert(
      "Veuillez entrer la référence du paiement."
    );

    return;

  }


  /*
  ==============================
  BOUTON
  ==============================
  */

  if (submitButton) {

    submitButton.disabled = true;

    submitButton.textContent =
      "Envoi en cours...";

  }


  try {

    const data =
      await api(
        "/api/deposits",
        {
          method: "POST",

          body: JSON.stringify({

            amount:
              amount,

            payment_method:
              method,

            reference:
              reference

          })

        }
      );


    alert(
      data.message ||
      "Votre demande de dépôt a été envoyée."
    );


    if (referenceInput) {

      referenceInput.value =
        "";

    }


    await loadBalance();

    await loadDeposits();


  } catch (error) {

    console.error(
      "Erreur dépôt:",
      error
    );


    alert(
      error.message ||
      "Impossible d'envoyer la demande."
    );


  } finally {

    if (submitButton) {

      submitButton.disabled =
        false;

      submitButton.textContent =
        "Envoyer la demande";

    }

  }

}


/*
========================================
HISTORIQUE DES DÉPÔTS
========================================
*/

async function loadDeposits() {

  if (!depositsList)
    return;


  try {

    const data =
      await api(
        "/api/deposits/my"
      );


    const deposits =
      data.deposits || [];


    if (!deposits.length) {

      depositsList.innerHTML = `

        <div class="empty-state">

          <span>💳</span>

          <p>
            Aucun dépôt pour le moment.
          </p>

        </div>

      `;

      return;

    }


    depositsList.innerHTML =
      "";


    deposits.forEach(
      deposit => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          "deposit-item";


        item.innerHTML = `

          <div>

            <strong>
              ${formatMoney(
                deposit.amount
              )} CDF
            </strong>

            <small>
              ${deposit.created_at || ""}
            </small>

          </div>

          <span
            class="deposit-status"
          >
            ${escapeHtml(
              deposit.status ||
              "pending"
            )}
          </span>

        `;


        depositsList.appendChild(
          item
        );

      }
    );


  } catch (error) {

    console.error(
      "Erreur historique dépôts:",
      error
    );


    depositsList.innerHTML = `

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
SÉCURITÉ HTML
========================================
*/

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/*
========================================
ÉVÉNEMENTS
========================================
*/

if (paymentMethod) {

  paymentMethod.addEventListener(
    "change",
    showPaymentInstructions
  );

}


if (depositForm) {

  depositForm.addEventListener(
    "submit",
    submitDeposit
  );

}


/*
========================================
DÉMARRAGE
========================================
*/

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    createChariowButton();

    showPaymentInstructions();

    await loadBalance();

    await loadDeposits();

  }
);
