"use strict";

/*
========================================
NOSMYBOOST🇧🇪
ADMIN JAVASCRIPT
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

const adminName =
  document.getElementById("adminName");

const adminLogout =
  document.getElementById("adminLogout");

const pendingDeposits =
  document.getElementById("pendingDeposits");

const pendingDepositsCount =
  document.getElementById(
    "pendingDepositsCount"
  );

const adminOrders =
  document.getElementById("adminOrders");

const ordersCount =
  document.getElementById("ordersCount");

const adminMessage =
  document.getElementById("adminMessage");


/*
========================================
RESTAURATION SOLDE
========================================
*/

const restoreBalanceForm =
  document.getElementById(
    "restoreBalanceForm"
  );

const restoreUserId =
  document.getElementById(
    "restoreUserId"
  );

const restoreAmount =
  document.getElementById(
    "restoreAmount"
  );

const restoreReason =
  document.getElementById(
    "restoreReason"
  );

const restoreBalanceButton =
  document.getElementById(
    "restoreBalanceButton"
  );

const restoreBalanceMessage =
  document.getElementById(
    "restoreBalanceMessage"
  );


/*
========================================
API
========================================
*/

async function api(url, options = {}) {

  const response =
    await fetch(url, {

      ...options,

      headers: {

        "Content-Type":
          "application/json",

        "Authorization":
          `Bearer ${token}`,

        ...(options.headers || {})

      }

    });


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
      "Accès administrateur refusé."
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
CHARGER DÉPÔTS EN ATTENTE
========================================
*/

async function loadPendingDeposits() {

  if (!pendingDeposits)
    return;

  try {

    const data =
      await api(
        "/api/admin/deposits/pending"
      );


    const deposits =
      data.deposits || [];


    if (pendingDepositsCount) {

      pendingDepositsCount.textContent =
        deposits.length;

    }


    if (!deposits.length) {

      pendingDeposits.innerHTML = `

        <p style="
          grid-column:1/-1;
          text-align:center;
          color:#667085;
        ">

          ✅ Aucun dépôt en attente.

        </p>

      `;

      return;

    }


    pendingDeposits.innerHTML = "";


    deposits.forEach(
      deposit => {

        const card =
          document.createElement(
            "article"
          );


        card.className =
          "feature-card";


        card.innerHTML = `

          <p>
            <strong>
              Dépôt #${deposit.id}
            </strong>
          </p>

          <p>
            Client :
            ${escapeHtml(
              deposit.name || "—"
            )}
          </p>

          <p>
            Email :
            ${escapeHtml(
              deposit.email || "—"
            )}
          </p>

          <p>
            WhatsApp :
            ${escapeHtml(
              deposit.whatsapp || "—"
            )}
          </p>

          <p>
            Moyen :
            <strong>
              ${formatMethod(
                deposit.method
              )}
            </strong>
          </p>

          <p>
            Montant :
            <strong>
              ${formatMoney(
                deposit.amount
              )} CDF
            </strong>
          </p>

          <p>
            Référence :
            <strong>
              ${escapeHtml(
                deposit.proof || "—"
              )}
            </strong>
          </p>

          <p>
            Date :
            ${escapeHtml(
              deposit.created_at || "—"
            )}
          </p>


          <div style="
            display:flex;
            gap:10px;
            margin-top:20px;
            flex-wrap:wrap;
          ">

            <button
              type="button"
              class="btn btn-primary"
              onclick="approveDeposit(${deposit.id})"
            >
              ✅ Valider
            </button>

            <button
              type="button"
              class="btn btn-outline"
              onclick="rejectDeposit(${deposit.id})"
            >
              ❌ Refuser
            </button>

          </div>

        `;


        pendingDeposits.appendChild(
          card
        );

      }
    );


  } catch (error) {

    console.error(
      "Admin deposits:",
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
VALIDER DÉPÔT
========================================
*/

async function approveDeposit(
  depositId
) {

  const confirmed =
    window.confirm(
      "Confirmer la validation de ce dépôt ? Le montant sera crédité sur le compte du client."
    );


  if (!confirmed)
    return;


  try {

    showMessage(
      "Validation en cours...",
      "info"
    );


    const data =
      await api(
        `/api/admin/deposits/${depositId}/approve`,
        {
          method: "POST"
        }
      );


    showMessage(
      data.message ||
      "✅ Dépôt validé et compte client crédité.",
      "success"
    );


    await loadPendingDeposits();


  } catch (error) {

    console.error(
      "Approve deposit:",
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
  depositId
) {

  const confirmed =
    window.confirm(
      "Confirmer le refus de ce dépôt ?"
    );


  if (!confirmed)
    return;


  try {

    showMessage(
      "Refus en cours...",
      "info"
    );


    const data =
      await api(
        `/api/admin/deposits/${depositId}/reject`,
        {
          method: "POST"
        }
      );


    showMessage(
      data.message ||
      "❌ Dépôt refusé.",
      "success"
    );


    await loadPendingDeposits();


  } catch (error) {

    console.error(
      "Reject deposit:",
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
RESTAURER LE SOLDE CLIENT
========================================
*/

if (restoreBalanceForm) {

  restoreBalanceForm.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      const userId =
        Number(
          restoreUserId?.value
        );


      const amount =
        Number(
          restoreAmount?.value
        );


      const reason =
        String(
          restoreReason?.value || ""
        ).trim();


      /*
      ==============================
      VALIDATION
      ==============================
      */

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {

        showRestoreMessage(
          "❌ ID client invalide.",
          "error"
        );

        return;

      }


      if (
        !Number.isInteger(amount) ||
        amount <= 0
      ) {

        showRestoreMessage(
          "❌ Montant invalide.",
          "error"
        );

        return;

      }


      if (!reason) {

        showRestoreMessage(
          "❌ Le motif est obligatoire.",
          "error"
        );

        return;

      }


      /*
      ==============================
      CONFIRMATION
      ==============================
      */

      const confirmed =
        window.confirm(
          `Restaurer ${formatMoney(amount)} CDF sur le compte du client #${userId} ?`
        );


      if (!confirmed)
        return;


      try {

        if (restoreBalanceButton) {

          restoreBalanceButton.disabled =
            true;

          restoreBalanceButton.textContent =
            "⏳ Restauration en cours...";

        }


        showRestoreMessage(
          "Restauration en cours...",
          "info"
        );


        /*
        ==============================
        API BACKEND
        ==============================
        */

        const data =
          await api(
            `/api/admin/users/${userId}/restore-balance`,
            {
              method: "POST",

              body: JSON.stringify({

                amount: amount,

                reason: reason

              })

            }
          );


        /*
        ==============================
        SUCCÈS
        ==============================
        */

        let message =
          data.message ||
          "✅ Solde restauré avec succès.";


        if (
          data.balance &&
          Number.isFinite(
            Number(
              data.balance.current
            )
          )
        ) {

          message +=
            ` Nouveau solde : ${formatMoney(
              data.balance.current
            )} CDF.`;

        }


        showRestoreMessage(
          message,
          "success"
        );


        /*
        ==============================
        VIDER FORMULAIRE
        ==============================
        */

        restoreBalanceForm.reset();


      } catch (error) {

        console.error(
          "Restore balance:",
          error
        );


        showRestoreMessage(
          error.message,
          "error"
        );


      } finally {

        if (restoreBalanceButton) {

          restoreBalanceButton.disabled =
            false;

          restoreBalanceButton.textContent =
            "💰 Restaurer le solde";

        }

      }

    }
  );

}


/*
========================================
MESSAGE RESTAURATION
========================================
*/

function showRestoreMessage(
  message,
  type
) {

  if (!restoreBalanceMessage)
    return;


  restoreBalanceMessage.textContent =
    message;


  if (type === "success") {

    restoreBalanceMessage.style.color =
      "#067647";

  }

  else if (type === "error") {

    restoreBalanceMessage.style.color =
      "#b42318";

  }

  else {

    restoreBalanceMessage.style.color =
      "#175cd1";

  }

}


/*
========================================
COMMANDES ADMIN
========================================
*/

async function loadOrders() {

  if (!adminOrders)
    return;


  try {

    const data =
      await api(
        "/api/admin/orders"
      );


    const orders =
      data.orders || [];


    if (ordersCount) {

      ordersCount.textContent =
        orders.length;

    }


    if (!orders.length) {

      adminOrders.innerHTML = `

        <p style="
          grid-column:1/-1;
          text-align:center;
          color:#667085;
        ">

          📦 Aucune commande.

        </p>

      `;

      return;

    }


    adminOrders.innerHTML = "";


    orders
      .slice(0, 20)
      .forEach(
        order => {

          const card =
            document.createElement(
              "article"
            );


          card.className =
            "feature-card";


          card.innerHTML = `

            <p>
              <strong>
                Commande #${order.id}
              </strong>
            </p>

            <p>
              Client :
              ${escapeHtml(
                order.user_name || "—"
              )}
            </p>

            <p>
              Service :
              ${escapeHtml(
                order.service_name || "—"
              )}
            </p>

            <p>
              Quantité :
              ${formatMoney(
                order.quantity
              )}
            </p>

            <p>
              Montant :
              <strong>
                ${formatMoney(
                  order.price
                )} CDF
              </strong>
            </p>

            <p>
              Statut :
              <strong>
                ${formatStatus(
                  order.status
                )}
              </strong>
            </p>

          `;


          adminOrders.appendChild(
            card
          );

        }
      );


  } catch (error) {

    console.error(
      "Admin orders:",
      error
    );


    adminOrders.innerHTML = `

      <p style="
        grid-column:1/-1;
        text-align:center;
        color:#b42318;
      ">

        Impossible de charger les commandes.

      </p>

    `;

  }

}


/*
========================================
MESSAGE ADMIN
========================================
*/

function showMessage(
  message,
  type
) {

  if (!adminMessage)
    return;


  adminMessage.textContent =
    message;


  if (type === "success") {

    adminMessage.style.color =
      "#067647";

  }

  else if (type === "error") {

    adminMessage.style.color =
      "#b42318";

  }

  else {

    adminMessage.style.color =
      "#175cd1";

  }

}


/*
========================================
MOYEN DE PAIEMENT
========================================
*/

function formatMethod(
  method
) {

  const methods = {

    airtel:
      "🔴 Airtel Money",

    mpesa:
      "🟢 Vodacom M-Pesa",

    orange:
      "🟠 Orange Money"

  };


  return methods[
    String(method || "")
      .toLowerCase()
  ] || method || "—";

}


/*
========================================
STATUT
========================================
*/

function formatStatus(
  status
) {

  const statuses = {

    pending:
      "⏳ En attente",

    processing:
      "🔄 En cours",

    completed:
      "✅ Terminé",

    cancelled:
      "❌ Annulé",

    rejected:
      "❌ Refusé",

    failed:
      "❌ Échoué"

  };


  return statuses[
    String(status || "")
      .toLowerCase()
  ] || status || "—";

}


/*
========================================
ARGENT
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
      maximumFractionDigits: 2
    }
  );

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
