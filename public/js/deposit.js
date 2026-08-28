"use strict";

require("dotenv").config();

/*
========================================
NOSMYBOOST 🇧🇪
DEPOSIT — CHARIOW
========================================
*/

const CHARIOW_CHECKOUT_URL =
  "https://iayzxtqb.mychariow.co/prd_szcsq1ct/checkout";

/*
========================================
MONTANT MINIMUM
========================================
*/

const MIN_AMOUNT = 1000;

/*
========================================
ÉLÉMENTS
========================================
*/

const currentBalance =
  document.getElementById("currentBalance");

const selectedAmount =
  document.getElementById("selectedAmount");

const selectedUsd =
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

const amountButtons =
  document.querySelectorAll(".amount-btn");

/*
========================================
TOKEN
========================================
*/

const token =
  localStorage.getItem("nosmyboost_token");

/*
========================================
WHATSAPP
========================================
*/

const WHATSAPP_NUMBER =
  "243XXXXXXXXX";

/*
========================================
FORMAT ARGENT
========================================
*/

function formatMoney(amount) {

  return Number(amount || 0)
    .toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

}

/*
========================================
API
========================================
*/

async function api(url, options = {}) {

  if (!token) {

    window.location.href = "/login.html";

    throw new Error("Session expirée.");

  }

  const response =
    await fetch(url, {

      ...options,

      headers: {

        ...(options.headers || {}),

        "Authorization":
          `Bearer ${token}`,

        "Content-Type":
          "application/json"

      }

    });

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
UTILISATEUR + SOLDE
========================================
*/

async function loadUser() {

  try {

    const data =
      await api("/api/auth/me");

    const user =
      data.user || {};

    const balance =
      Number(user.balance || 0);

    if (currentBalance) {

      currentBalance.textContent =
        `${formatMoney(balance)} CDF`;

    }

    if (userName) {

      userName.textContent =
        user.first_name ||
        user.name ||
        user.email ||
        "Compte";

    }

  } catch (error) {

    console.error(
      "Erreur chargement utilisateur:",
      error
    );

  }

}

/*
========================================
MONTANT SÉLECTIONNÉ
========================================
*/

let selectedValue = MIN_AMOUNT;

/*
========================================
MISE À JOUR
========================================
*/

function updateSelectedAmount(
  amount,
  usd
) {

  selectedValue =
    Number(amount);

  if (
    !Number.isFinite(selectedValue) ||
    selectedValue < MIN_AMOUNT
  ) {

    selectedValue =
      MIN_AMOUNT;

    usd = 0.40;

  }

  if (selectedAmount) {

    selectedAmount.textContent =
      `${formatMoney(selectedValue)} CDF`;

  }

  if (selectedUsd) {

    selectedUsd.textContent =
      `$${Number(usd || 0).toFixed(2)} USD`;

  }

  if (payButton) {

    payButton.textContent =
      `💳 Payer ${formatMoney(selectedValue)} CDF`;

  }

  amountButtons.forEach(button => {

    const buttonAmount =
      Number(button.dataset.amount);

    button.classList.toggle(
      "active",
      buttonAmount === selectedValue
    );

  });

}

/*
========================================
BOUTONS MONTANTS
========================================
*/

amountButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const amount =
        Number(button.dataset.amount);

      const usd =
        Number(button.dataset.usd);

      updateSelectedAmount(
        amount,
        usd
      );

    }
  );

});

/*
========================================
CHARIOW
========================================

ATTENTION :

Le checkout actuel est celui de 2 500 CDF.

Il n'est donc pas possible de faire croire
à Chariow qu'un même checkout représente
automatiquement 1 000, 5 000 ou 10 000 CDF.

Pour l'instant :

- 2 500 CDF → checkout Chariow actuel
- autres montants → WhatsApp

========================================
*/

function goToChariow() {

  if (selectedValue !== 2500) {

    alert(
      "Le paiement automatique Chariow est actuellement disponible uniquement pour 2 500 CDF. Pour les autres montants, utilisez WhatsApp."
    );

    return;

  }

  if (payButton) {

    payButton.textContent =
      "⏳ Ouverture du paiement...";

    payButton.style.pointerEvents =
      "none";

  }

  window.location.href =
    CHARIOW_CHECKOUT_URL;

}

/*
========================================
BOUTON PAIEMENT
========================================
*/

if (payButton) {

  payButton.addEventListener(
    "click",
    event => {

      event.preventDefault();

      goToChariow();

    }
  );

}

/*
========================================
WHATSAPP
========================================
*/

function setupWhatsApp() {

  const message =
    encodeURIComponent(
      "Bonjour NOSMYBOOST 🇧🇪, je souhaite recharger mon compte."
    );

  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  if (whatsappButton) {

    whatsappButton.href =
      url;

  }

  if (manualWhatsapp) {

    manualWhatsapp.href =
      url;

  }

}

setupWhatsApp();

/*
========================================
HISTORIQUE DÉPÔTS
========================================
*/

async function loadDeposits() {

  if (!depositHistory)
    return;

  try {

    const data =
      await api("/api/deposits/my");

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

    depositHistory.innerHTML = "";

    deposits.forEach(deposit => {

      const item =
        document.createElement("div");

      item.className =
        "deposit-item";

      const amount =
        formatMoney(deposit.amount);

      const status =
        String(
          deposit.status || "pending"
        );

      let statusClass =
        "status-pending";

      if (status === "completed") {

        statusClass =
          "status-completed";

      }

      if (status === "failed") {

        statusClass =
          "status-failed";

      }

      item.innerHTML = `

        <div>

          <div class="deposit-amount">
            ${amount} CDF
          </div>

          <div class="deposit-date">
            ${escapeHtml(
              deposit.created_at || ""
            )}
          </div>

        </div>

        <span class="${statusClass}">
          ${escapeHtml(status)}
        </span>

      `;

      depositHistory.appendChild(item);

    });

  } catch (error) {

    console.error(
      "Erreur historique dépôts:",
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
SÉCURITÉ HTML
========================================
*/

function escapeHtml(value) {

  return String(value ?? "")

    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    updateSelectedAmount(
      1000,
      0.40
    );

    await loadUser();

    await loadDeposits();

  }
);
