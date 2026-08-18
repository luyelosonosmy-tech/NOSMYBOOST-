/*
========================================
NOSMYBOOST🇧🇪
DEPOSIT JAVASCRIPT
========================================
*/

const token =
  localStorage.getItem("nosmyboost_token");

if (!token) {
  window.location.href = "/login.html";
}


/*
========================================
ÉLÉMENTS
========================================
*/

const depositForm =
  document.getElementById("depositForm");

const amountInput =
  document.getElementById("amount");

const methodInput =
  document.getElementById("method");

const proofInput =
  document.getElementById("proof");

const paymentInstructions =
  document.getElementById(
    "paymentInstructions"
  );

const depositMessage =
  document.getElementById(
    "depositMessage"
  );

const depositButton =
  document.getElementById(
    "depositButton"
  );

const currentBalance =
  document.getElementById(
    "currentBalance"
  );

const depositHistory =
  document.getElementById(
    "depositHistory"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );


/*
========================================
NUMÉROS DE PAIEMENT
========================================

⚠️ LAISSÉS VIDES POUR LE MOMENT.
On les configurera ensemble avant la mise
en production.
========================================
*/

const PAYMENT_METHODS = {

  airtel: {
    name: "Airtel Money",
    number: ""
  },

  mpesa: {
    name: "Vodacom M-Pesa",
    number: ""
  },

  orange: {
    name: "Orange Money",
    number: ""
  }

};


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
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${token}`,

          ...(options.headers || {})
        }
      }
    );


  const data =
    await response.json()
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
      "Une erreur est survenue."
    );

  }


  return data;

}


/*
========================================
INSTRUCTIONS PAIEMENT
========================================
*/

function showPaymentInstructions(
  method
) {

  if (!paymentInstructions)
    return;


  if (!method) {

    paymentInstructions.innerHTML = `
      <p>
        Choisissez un moyen de paiement
        pour voir les instructions.
      </p>
    `;

    return;

  }


  const payment =
    PAYMENT_METHODS[method];


  if (!payment)
    return;


  if (!payment.number) {

    paymentInstructions.innerHTML = `

      <div>

        <strong>
          ${payment.name}
        </strong>

        <p>
          Le numéro de paiement sera affiché
          après configuration du compte de
          paiement NOSMYBOOST🇧🇪.
        </p>

      </div>

    `;

    return;

  }


  paymentInstructions.innerHTML = `

    <div>

      <strong>
        ${payment.name}
      </strong>

      <p>
        Envoyez votre montant au numéro :
      </p>

      <strong>
        ${escapeHtml(payment.number)}
      </strong>

      <p>
        Après le paiement, indiquez votre
        référence de transaction ci-dessous.
      </p>

    </div>

  `;

}


/*
========================================
CHANGEMENT MÉTHODE
========================================
*/

if (methodInput) {

  methodInput.addEventListener(
    "change",
    () => {

      showPaymentInstructions(
        methodInput.value
      );

    }
  );

}


/*
========================================
ENVOYER DÉPÔT
========================================
*/

if (depositForm) {

  depositForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const amount =
        Number(
          amountInput?.value
        );


      const method =
        methodInput?.value;


      const proof =
        proofInput?.value.trim();


      /*
      ==============================
      VALIDATION
      ==============================
      */

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        showMessage(
          "Veuillez entrer un montant valide.",
          "error"
        );

        return;

      }


      if (!method) {

        showMessage(
          "Veuillez choisir un moyen de paiement.",
          "error"
        );

        return;

      }


      if (!proof) {

        showMessage(
          "Veuillez entrer la référence du paiement.",
          "error"
        );

        return;

      }


      try {

        depositButton.disabled =
          true;

        depositButton.textContent =
          "Envoi en cours...";


        showMessage(
          "Enregistrement de votre demande...",
          "info"
        );


        /*
        ==============================
        API
        ==============================
        */

        const data =
          await api(
            "/api/deposits",
            {
              method: "POST",

              body:
                JSON.stringify({

                  amount,

                  method,

                  proof

                })

            }
          );


        showMessage(
          data.message ||
          "Votre demande de dépôt a été envoyée.",
          "success"
        );


        depositForm.reset();

        showPaymentInstructions("");


        await loadBalance();

        await loadDepositHistory();


      } catch (error) {

        console.error(
          error
        );


        showMessage(
          error.message,
          "error"
        );


      } finally {

        depositButton.disabled =
          false;

        depositButton.textContent =
          "Envoyer la demande";

      }

    }
  );

}


/*
========================================
CHARGER SOLDE
========================================
*/

async function loadBalance() {

  if (!currentBalance)
    return;


  try {

    const data =
      await api(
        "/api/auth/me"
      );


    const user =
      data.user;


    currentBalance.textContent =
      formatMoney(
        user.balance
      ) + " CDF";


  } catch (error) {

    console.error(
      error
    );


    currentBalance.textContent =
      "—";

  }

}


/*
========================================
HISTORIQUE DÉPÔTS
========================================
*/

async function loadDepositHistory() {

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

          <span>
            💳
          </span>

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
          "order-item";


        item.innerHTML = `

          <div>

            <strong>
              Dépôt #${deposit.id}
            </strong>

            <p>
              ${formatMethod(
                deposit.method
              )}
            </p>

          </div>


          <div>

            <strong>
              ${formatMoney(
                deposit.amount
              )} CDF
            </strong>

            <span
              class="order-status ${getStatusClass(
                deposit.status
              )}"
            >
              ${formatStatus(
                deposit.status
              )}
            </span>

          </div>

        `;


        depositHistory.appendChild(
          item
        );

      }
    );


  } catch (error) {

    console.error(
      error
    );

  }

}


/*
========================================
MESSAGE
========================================
*/

function showMessage(
  text,
  type
) {

  if (!depositMessage)
    return;


  depositMessage.textContent =
    text;


  depositMessage.style.padding =
    "12px 16px";

  depositMessage.style.marginTop =
    "15px";

  depositMessage.style.borderRadius =
    "10px";


  if (type === "success") {

    depositMessage.style.background =
      "#ecfdf3";

    depositMessage.style.color =
      "#067647";

  }


  if (type === "error") {

    depositMessage.style.background =
      "#fef3f2";

    depositMessage.style.color =
      "#b42318";

  }


  if (type === "info") {

    depositMessage.style.background =
      "#eff8ff";

    depositMessage.style.color =
      "#175cd1";

  }

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
FORMAT MÉTHODE
========================================
*/

function formatMethod(
  method
) {

  const methods = {

    airtel:
      "Airtel Money",

    mpesa:
      "Vodacom M-Pesa",

    orange:
      "Orange Money"

  };


  return methods[
    String(method || "")
      .toLowerCase()
  ] || method || "—";

}


/*
========================================
FORMAT STATUT
========================================
*/

function formatStatus(
  status
) {

  const statuses = {

    pending:
      "⏳ En attente",

    approved:
      "✅ Validé",

    rejected:
      "❌ Refusé"

  };


  return statuses[
    String(status || "")
      .toLowerCase()
  ] || status || "Inconnu";

}


/*
========================================
CLASSE STATUT
========================================
*/

function getStatusClass(
  status
) {

  const value =
    String(
      status || ""
    ).toLowerCase();


  if (value === "approved")
    return "status-success";


  if (value === "rejected")
    return "status-danger";


  return "status-pending";

}


/*
========================================
SÉCURITÉ
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

async function initDeposit() {

  await loadBalance();

  await loadDepositHistory();

}


initDeposit();
