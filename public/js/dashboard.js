"use strict";

/*
========================================
NOSMYBOOST🇧🇪
DASHBOARD JAVASCRIPT
========================================
*/

/*
========================================
TOKEN
========================================
*/

const token = "";


/*
========================================
ÉLÉMENTS
========================================
*/

const userName =
  document.getElementById("userName");

const welcomeName =
  document.getElementById("welcomeName");

const balance =
  document.getElementById("balance");

const balanceStat =
  document.getElementById("balanceStat");

const totalDeposited =
  document.getElementById("totalDeposited");

const totalSpent =
  document.getElementById("totalSpent");

const ordersCount =
  document.getElementById("ordersCount");

const recentOrders =
  document.getElementById("recentOrders");

const logoutButton =
  document.getElementById("logoutButton");


/*
========================================
API
========================================
*/

async function api(url) {

  const headers = {};

  /*
  Si un token existe, on l'envoie.
  */

  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers
      }
    );


  const data =
    await response.json()
      .catch(() => ({}));


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
CHARGER DASHBOARD
========================================
*/

async function loadDashboard() {

  try {

    /*
    ==============================
    PROFIL
    ==============================
    */

    const profile =
      await api(
        "/api/auth/me"
      );


    const user =
      profile.user || {};


    if (userName) {

      userName.textContent =
        user.name ||
        user.email ||
        "Utilisateur";

    }


    if (welcomeName) {

      welcomeName.textContent =
        user.name ||
        "👋";

    }


    /*
    ==============================
    STATISTIQUES
    ==============================
    */

    const userBalance =
      Number(
        user.balance || 0
      );


    const deposited =
      Number(
        user.total_deposited || 0
      );


    const spent =
      Number(
        user.total_spent || 0
      );


    if (balance) {

      balance.textContent =
        formatMoney(
          userBalance
        ) + " CDF";

    }


    if (balanceStat) {

      balanceStat.textContent =
        formatMoney(
          userBalance
        ) + " CDF";

    }


    if (totalDeposited) {

      totalDeposited.textContent =
        formatMoney(
          deposited
        ) + " CDF";

    }


    if (totalSpent) {

      totalSpent.textContent =
        formatMoney(
          spent
        ) + " CDF";

    }


    /*
    ==============================
    COMMANDES
    ==============================
    */

    await loadRecentOrders();


  } catch (error) {

    console.error(
      "❌ Dashboard:",
      error
    );


    if (recentOrders) {

      recentOrders.innerHTML = `
        <div class="empty-state">

          <span>⚠️</span>

          <p>
            ${escapeHtml(
              error.message
            )}
          </p>

        </div>
      `;

    }

  }

}


/*
========================================
COMMANDES RÉCENTES
========================================
*/

async function loadRecentOrders() {

  if (!recentOrders) {
    return;
  }


  try {

    const data =
      await api(
        "/api/orders/my"
      );


    const orders =
      data.orders || [];


    if (ordersCount) {

      ordersCount.textContent =
        orders.length;

    }


    if (!orders.length) {

      recentOrders.innerHTML = `

        <div class="empty-state">

          <span>📦</span>

          <p>
            Aucune commande
          </p>

        </div>

      `;

      return;

    }


    /*
    ==============================
    5 DERNIÈRES COMMANDES
    ==============================
    */

    const latest =
      orders.slice(0, 5);


    recentOrders.innerHTML =
      "";


    latest.forEach(
      order => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          "order-item";


        item.innerHTML = `

          <div>

            <strong>
              Commande #${escapeHtml(
                order.id
              )}
            </strong>

            <p>
              ${escapeHtml(
                order.service_name ||
                "Service"
              )}
            </p>

          </div>


          <div>

            <strong>
              ${formatMoney(
                order.price
              )} CDF
            </strong>

            <span
              class="order-status ${getStatusClass(
                order.status
              )}"
            >
              ${formatStatus(
                order.status
              )}
            </span>

          </div>

        `;


        recentOrders.appendChild(
          item
        );

      }
    );


  } catch (error) {

    console.error(
      "❌ Orders:",
      error
    );


    recentOrders.innerHTML = `

      <div class="empty-state">

        <span>📦</span>

        <p>
          Impossible de charger les commandes.
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

      /*
      Nettoyage éventuel
      */

      localStorage.removeItem(
        "nosmyboost_token"
      );


      localStorage.removeItem(
        "token"
      );


      window.location.href =
        "/login.html";

    }
  );

}


/*
========================================
FORMAT ARGENT
========================================
*/

function formatMoney(amount) {

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
STATUT
========================================
*/

function formatStatus(status) {

  const statuses = {

    pending:
      "En attente",

    processing:
      "En cours",

    completed:
      "Terminé",

    partial:
      "Partiel",

    cancelled:
      "Annulé",

    canceled:
      "Annulé",

    failed:
      "Échec"

  };


  return (
    statuses[
      String(status || "")
        .toLowerCase()
    ] ||
    status ||
    "Inconnu"
  );

}


/*
========================================
CLASSE STATUT
========================================
*/

function getStatusClass(status) {

  const value =
    String(
      status || ""
    ).toLowerCase();


  if (
    value === "completed"
  ) {

    return "status-success";

  }


  if (
    value === "cancelled" ||
    value === "canceled" ||
    value === "failed"
  ) {

    return "status-danger";

  }


  if (
    value === "processing"
  ) {

    return "status-processing";

  }


  return "status-pending";

}


/*
========================================
SÉCURITÉ AFFICHAGE
========================================
*/

function escapeHtml(value) {

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
DÉMARRAGE
========================================
*/

loadDashboard();
