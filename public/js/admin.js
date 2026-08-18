/*
========================================
NOSMYBOOST🇧🇪
ADMIN JAVASCRIPT
========================================
*/

const token =
  localStorage.getItem("nosmyboost_token");


/*
========================================
VÉRIFIER SESSION
========================================
*/

if (!token) {

  window.location.href =
    "/login.html";

}


/*
========================================
ÉLÉMENTS
========================================
*/

const message =
  document.getElementById(
    "adminMessage"
  );

const depositsContainer =
  document.getElementById(
    "pendingDeposits"
  );

const depositsCount =
  document.getElementById(
    "pendingDepositsCount"
  );

const ordersContainer =
  document.getElementById(
    "adminOrders"
  );

const adminName =
  document.getElementById(
    "adminName"
  );


/*
========================================
MESSAGE
========================================
*/

function showMessage(
  text,
  type = "info"
) {

  if (!message) return;

  message.textContent = text;

  message.style.padding =
    "12px 16px";

  message.style.borderRadius =
    "10px";


  if (type === "success") {

    message.style.background =
      "#ecfdf3";

    message.style.color =
      "#067647";

  }


  if (type === "error") {

    message.style.background =
      "#fef3f2";

    message.style.color =
      "#b42318";

  }


  if (type === "info") {

    message.style.background =
      "#eff8ff";

    message.style.color =
      "#175cd3";

  }

}


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
      data.message ||
      "Accès refusé."
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
CHARGER PROFIL ADMIN
========================================
*/

async function loadAdminProfile() {

  try {

    const data =
      await api(
        "/api/auth/me"
      );


    if (adminName) {

      adminName.textContent =
        data.user.name ||
        data.user.email;

    }


  } catch (error) {

    console.error(
      error
    );

  }

}


/*
========================================
CHARGER DÉPÔTS
========================================
*/

async function loadDeposits() {

  if (!depositsContainer)
    return;


  depositsContainer.innerHTML =
    `
      <p
        style="
          grid-column:1/-1;
          text-align:center;
          color:#667085;
        "
      >
        Chargement...
      </p>
    `;


  try {

    const data =
      await api(
        "/api/admin/deposits/pending"
      );


    const deposits =
      data.deposits || [];


    if (depositsCount) {

      depositsCount.textContent =
        deposits.length;

    }


    if (!deposits.length) {

      depositsContainer.innerHTML =
        `
          <p
            style="
              grid-column:1/-1;
              text-align:center;
              color:#667085;
            "
          >
            Aucun dépôt en attente.
          </p>
        `;

      return;

    }


    depositsContainer.innerHTML =
      "";


    deposits.forEach(
      deposit => {

        const card =
          document.createElement(
            "article"
          );


        card.className =
          "feature-card";


        card.innerHTML = `

          <h3>
            Dépôt #${deposit.id}
          </h3>

          <p>
            <strong>Client :</strong>
            ${escapeHtml(
              deposit.name || "-"
            )}
          </p>

          <p>
            <strong>Email :</strong>
            ${escapeHtml(
              deposit.email || "-"
            )}
          </p>

          <p>
            <strong>WhatsApp :</strong>
            ${escapeHtml(
              deposit.whatsapp || "-"
            )}
          </p>

          <p>
            <strong>Montant :</strong>
            ${formatMoney(
              deposit.amount
            )}
            CDF
          </p>

          <p>
            <strong>Moyen :</strong>
            ${formatMethod(
              deposit.method
            )}
          </p>

          <p>
            <strong>Preuve :</strong>
            ${escapeHtml(
              deposit.proof || "-"
            )}
          </p>

          <p>
            <strong>Statut :</strong>
            ⏳ En attente
          </p>

          <div
            style="
              display:flex;
              gap:10px;
              margin-top:20px;
              flex-wrap:wrap;
            "
          >

            <button
              type="button"
              class="btn"
              data-action="approve"
              data-id="${deposit.id}"
            >
              ✅ Valider
            </button>

            <button
              type="button"
              class="btn btn-outline"
              data-action="reject"
              data-id="${deposit.id}"
            >
              ❌ Refuser
            </button>

          </div>

        `;


        depositsContainer.appendChild(
          card
        );

      }
    );


  } catch (error) {

    console.error(
      error
    );


    depositsContainer.innerHTML =
      `
        <p
          style="
            grid-column:1/-1;
            text-align:center;
            color:#b42318;
          "
        >
          ${escapeHtml(
            error.message
          )}
        </p>
      `;

  }

}


/*
========================================
VALIDER DÉPÔT
========================================
*/

async function approveDeposit(
  id
) {

  const confirmed =
    window.confirm(
      `Voulez-vous vraiment valider le dépôt #${id} ?`
    );


  if (!confirmed)
    return;


  try {

    showMessage(
      "Validation du dépôt...",
      "info"
    );


    const data =
      await api(
        `/api/admin/deposits/${id}/approve`,
        {
          method: "POST"
        }
      );


    showMessage(
      data.message ||
      "Dépôt validé.",
      "success"
    );


    await loadDeposits();


  } catch (error) {

    console.error(
      error
    );


    showMessage(
      error.message,
      "error"
    );

  }

}


/*
========================================
REFUSER DÉPÔT
========================================
*/

async function rejectDeposit(
  id
) {

  const confirmed =
    window.confirm(
      `Voulez-vous vraiment refuser le dépôt #${id} ?`
    );


  if (!confirmed)
    return;


  try {

    showMessage(
      "Refus du dépôt...",
      "info"
    );


    const data =
      await api(
        `/api/admin/deposits/${id}/reject`,
        {
          method: "POST"
        }
      );


    showMessage(
      data.message ||
      "Dépôt refusé.",
      "success"
    );


    await loadDeposits();


  } catch (error) {

    console.error(
      error
    );


    showMessage(
      error.message,
      "error"
    );

  }

}


/*
========================================
COMMANDES ADMIN
========================================

Pour cette étape, on affiche simplement
un message. On créera ensuite une vraie
route admin/orders.
========================================
*/

async function loadOrders() {

  if (!ordersContainer)
    return;


  ordersContainer.innerHTML =
    `
      <p
        style="
          grid-column:1/-1;
          text-align:center;
          color:#667085;
        "
      >
        La gestion complète des commandes
        sera activée dans l'étape suivante.
      </p>
    `;

}


/*
========================================
ACTIONS DES BOUTONS
========================================
*/

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "button[data-action]"
      );


    if (!button)
      return;


    const id =
      Number(
        button.dataset.id
      );


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      return;

    }


    if (
      button.dataset.action ===
      "approve"
    ) {

      approveDeposit(id);

    }


    if (
      button.dataset.action ===
      "reject"
    ) {

      rejectDeposit(id);

    }

  }
);


/*
========================================
DÉCONNEXION
========================================
*/

const logoutButton =
  document.getElementById(
    "adminLogout"
  );


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
SÉCURITÉ AFFICHAGE
========================================
*/

function escapeHtml(value) {

  return String(value ?? "")
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
FORMAT MONNAIE
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
FORMAT PAIEMENT
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
  ] || method;

}


/*
========================================
DÉMARRAGE
========================================
*/

async function initAdmin() {

  await loadAdminProfile();

  await loadDeposits();

  await loadOrders();

}


initAdmin();
