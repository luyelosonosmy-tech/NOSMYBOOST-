"use strict";

/*

NOSMYBOOST 🇧🇪
DEPOSIT — CHARIOW + PAIEMENT MANUEL

*/

/*

CHARIOW

*/

const CHARIOW_CHECKOUT_URL =
"https://iayzxtqb.mychariow.co/prd_szcsq1ct/checkout";

/*

MONTANT MINIMUM

*/

const MIN_AMOUNT = 1000;

/*

MONTANT MINIMUM CHARIOW

*/

const CHARIOW_MIN_AMOUNT = 2500;

/*

ÉLÉMENTS

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

TOKEN

*/

const token =
localStorage.getItem("nosmyboost_token");

/*

WHATSAPP

*/

const WHATSAPP_NUMBER =
"243843066709";

/*

FORMAT ARGENT

*/

function formatMoney(amount) {

return Number(amount || 0)
.toLocaleString("fr-FR", {
minimumFractionDigits: 0,
maximumFractionDigits: 2
});

}

/*

API

*/

async function api(url, options = {}) {

if (!token) {

window.location.href =
  "/login.html";

throw new Error(
  "Session expirée."
);

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

CHARGER UTILISATEUR

*/

async function loadUser() {

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
  error.message
);

}

}

/*

PRIX

*/

const DEPOSIT_PRICES = {

1000: 0.40,

2500: 1.00,

5000: 2.00,

10000: 4.00,

25000: 10.00,

50000: 20.00,

100000: 40.00,

250000: 100.00,

500000: 200.00

};

/*

MONTANT SÉLECTIONNÉ

*/

let selectedValue =
MIN_AMOUNT;

/*

WHATSAPP URL

*/

function getWhatsAppUrl(amount) {

const message =
"Bonjour NOSMYBOOST 🇧🇪, je souhaite recharger mon compte avec ${formatMoney(amount)} CDF. Merci de m'indiquer la procédure de paiement et de validation.";

return "https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}";

}

/*

METTRE À JOUR LE MONTANT

*/

function updateSelectedAmount(amount) {

amount =
Number(amount);

if (
!Number.isFinite(amount) ||
amount < MIN_AMOUNT
) {

amount =
  MIN_AMOUNT;

}

selectedValue =
amount;

const usd =
DEPOSIT_PRICES[amount] || 0;

if (selectedAmount) {

selectedAmount.textContent =
  `${formatMoney(amount)} CDF`;

}

if (selectedUsd) {

selectedUsd.textContent =
  `$${usd.toFixed(2)} USD`;

}

/*

1 000 CDF

*/

if (
amount < CHARIOW_MIN_AMOUNT
) {

if (payButton) {

  payButton.textContent =
    "💬 Payer 1 000 CDF via WhatsApp";

  payButton.style.background =
    "#25D366";

}


if (whatsappButton) {

  whatsappButton.style.display =
    "none";

}


if (manualWhatsapp) {

  manualWhatsapp.style.display =
    "block";

  manualWhatsapp.href =
    getWhatsAppUrl(amount);

}

}

/*

2 500 CDF ET PLUS

*/

else {

if (payButton) {

  payButton.textContent =
    `💳 Payer ${formatMoney(amount)} CDF`;

  payButton.style.background =
    "#111827";

}


if (whatsappButton) {

  whatsappButton.style.display =
    "block";

  whatsappButton.href =
    getWhatsAppUrl(amount);

}


if (manualWhatsapp) {

  manualWhatsapp.style.display =
    "block";

  manualWhatsapp.href =
    getWhatsAppUrl(amount);

}

}

/*

BOUTON ACTIF

*/

amountButtons.forEach(
button => {

  const buttonAmount =
    Number(
      button.dataset.amount
    );


  button.classList.toggle(
    "active",
    buttonAmount === amount
  );

}

);

}

/*

BOUTONS MONTANTS

*/

amountButtons.forEach(
button => {

button.addEventListener(
  "click",
  () => {

    const amount =
      Number(
        button.dataset.amount
      );


    updateSelectedAmount(
      amount
    );

  }
);

}
);

/*

PAIEMENT

*/

function startPayment() {

/*

1 000 CDF

*/

if (
selectedValue < CHARIOW_MIN_AMOUNT
) {

const whatsappUrl =
  getWhatsAppUrl(
    selectedValue
  );


window.open(
  whatsappUrl,
  "_blank"
);

return;

}

/*

CHARIOW

*/

if (!CHARIOW_CHECKOUT_URL) {

alert(
  "Le lien de paiement est indisponible."
);

return;

}

if (payButton) {

payButton.textContent =
  "⏳ Ouverture du paiement...";

payButton.style.pointerEvents =
  "none";

}

const checkout =
window.open(
CHARIOW_CHECKOUT_URL,
"_blank"
);

if (!checkout) {

alert(
  "Le navigateur a bloqué l'ouverture du paiement. Autorise les fenêtres pop-up puis réessaie."
);

}

setTimeout(
() => {

  if (payButton) {

    payButton.textContent =
      `💳 Payer ${formatMoney(selectedValue)} CDF`;

    payButton.style.pointerEvents =
      "auto";

  }

},
3000

);

}

/*

BOUTON PAYER

*/

if (payButton) {

payButton.addEventListener(
"click",
function(event) {

  event.preventDefault();

  startPayment();

}

);

}

/*

WHATSAPP

*/

function setupWhatsApp() {

const url =
getWhatsAppUrl(
selectedValue
);

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

HISTORIQUE DÉPÔTS

*/

async function loadDeposits() {

if (!depositHistory)
return;

try {

const data =
  await api(
    "/api/deposits/my"
  );


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
  "";


deposits.forEach(
  deposit => {

    const item =
      document.createElement(
        "div"
      );


    item.className =
      "deposit-item";


    const amount =
      formatMoney(
        deposit.amount
      );


    const status =
      String(
        deposit.status ||
        "pending"
      );


    let statusClass =
      "status-pending";


    if (
      status === "completed"
    ) {

      statusClass =
        "status-completed";

    }


    if (
      status === "failed"
    ) {

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

      <span
        class="${statusClass}"
      >
        ${escapeHtml(status)}
      </span>

    `;


    depositHistory.appendChild(
      item
    );

  }
);

} catch (error) {

console.error(
  "Erreur historique dépôts:",
  error.message
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

SÉCURITÉ HTML

*/

function escapeHtml(value) {

return String(
value ?? ""
)

.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");

}

/*

DÉCONNEXION

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

DÉMARRAGE

*/

document.addEventListener(
"DOMContentLoaded",
async () => {

updateSelectedAmount(
  MIN_AMOUNT
);

setupWhatsApp();

await loadUser();

await loadDeposits();

}
);
