/*
========================================
NOSMYBOOST🇧🇪
DASHBOARD CLIENT
========================================
*/

const TOKEN_KEY = "nosmyboost_token";
const USER_KEY = "nosmyboost_user";


/*
========================================
TOKEN
========================================
*/

const token =
  localStorage.getItem(TOKEN_KEY);


if (!token) {

  window.location.href =
    "/login.html";

}


/*
========================================
UTILITAIRE API
========================================
*/

async function apiRequest(
  url,
  options = {}
) {

  const headers = {

    "Content-Type":
      "application/json",

    ...(options.headers || {})

  };


  headers.Authorization =
    `Bearer ${token}`;


  const response =
    await fetch(
      url,
      {
        ...options,
        headers
      }
    );


  let data;

  try {

    data =
      await response.json();

  } catch {

    data = {
      success: false,
      message:
        "Réponse serveur invalide."
    };

  }


  if (
    response.status === 401
  ) {

    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    window.location.href =
      "/login.html";

    return null;

  }


  return data;

}


/*
========================================
AFFICHAGE UTILISATEUR
========================================
*/

function displayUser(user) {

  if (!user) return;


  const name =
    user.name || "Client";


  const userName =
    document.getElementById(
      "userName"
    );

  const welcomeName =
    document.getElementById(
      "welcomeName"
    );


  if (userName) {

    userName.textContent =
      name;

  }


  if (welcomeName) {

    welcomeName.textContent =
      name;

  }

}


/*
========================================
FORMAT MONNAIE
========================================
*/

function formatCDF(amount) {

  const value =
    Number(amount) || 0;


  return (
    new Intl.NumberFormat(
      "fr-FR"
    ).format(value)
    + " CDF"
  );

}


/*
========================================
CHARGER PROFIL
========================================
*/

async function loadProfile() {

  const data =
    await apiRequest(
      "/api/auth/me"
    );


  if (!data) return;


  if (
    !data.success ||
    !data.user
  ) {

    return;

  }


  displayUser(
    data.user
  );


  const balance =
    document.getElementById(
      "balance"
    );

  const totalDeposited =
    document.getElementById(
      "totalDeposited"
    );

  const totalSpent =
    document.getElementById(
      "totalSpent"
    );


  if (balance) {

    balance.textContent =
      formatCDF(
        data.user.balance
      );

  }


  if (totalDeposited) {

    totalDeposited.textContent =
      formatCDF(
        data.user.total_deposited
      );

  }


  if (totalSpent) {

    totalSpent.textContent =
      formatCDF(
        data.user.total_spent
      );

  }

}


/*
========================================
CHARGER SERVICES
========================================
*/

async function loadServices(
  platform
) {

  const list =
    document.getElementById(
      "servicesList"
    );

  const title =
    document.getElementById(
      "selectedPlatform"
    );


  if (!list) return;


  title.textContent =
    platform;


  list.innerHTML = `

    <p
      style="
        grid-column:1/-1;
        text-align:center;
        color:#667085;
      "
    >
      Chargement des services...
    </p>

  `;


  const data =
    await apiRequest(
      `/api/services?platform=${encodeURIComponent(platform)}`
    );


  if (!data) return;


  if (
    !data.success ||
    !Array.isArray(data.services)
  ) {

    list.innerHTML = `

      <p
        style="
          grid-column:1/-1;
          text-align:center;
          color:#667085;
        "
      >
        Aucun service disponible.
      </p>

    `;

    return;

  }


  if (
    data.services.length === 0
  ) {

    list.innerHTML = `

      <p
        style="
          grid-column:1/-1;
          text-align:center;
          color:#667085;
        "
      >
        Aucun service disponible pour
        ${platform}.
      </p>

    `;

    return;

  }


  list.innerHTML =
    data.services
      .map(service => {

        return `

          <article
            class="feature-card"
          >

            <div
              class="feature-icon"
            >
              🚀
            </div>

            <h3>
              ${escapeHTML(
                service.name
              )}
            </h3>

            <p>
              ${escapeHTML(
                service.description || ""
              )}
            </p>

            <p
              style="
                margin-top:12px;
                font-weight:800;
              "
            >
              ${formatCDF(
                service.price
              )}
            </p>

            <p
              style="
                margin-top:5px;
                color:#667085;
                font-size:13px;
              "
            >
              Min:
              ${service.min_quantity}

              —

              Max:
              ${service.max_quantity}
            </p>

            <button
              type="button"
              class="btn btn-primary"
              style="
                width:100%;
                margin-top:18px;
              "
              onclick="selectService(${service.id})"
            >
              Commander
            </button>

          </article>

        `;

      })
      .join("");

}


/*
========================================
SÉLECTION SERVICE
========================================
*/

function selectService(
  serviceId
) {

  /*
  Cette fonction sera reliée au
  formulaire de commande dans
  l'étape suivante.
  */

  localStorage.setItem(
    "nosmyboost_selected_service",
    serviceId
  );


  alert(
    "Service sélectionné. Le formulaire de commande sera disponible dans l'étape suivante."
  );

}


/*
========================================
CHARGER COMMANDES
========================================
*/

async function loadOrders() {

  const list =
    document.getElementById(
      "ordersList"
    );

  if (!list) return;


  const data =
    await apiRequest(
      "/api/orders/my"
    );


  if (!data) return;


  if (
    !data.success ||
    !Array.isArray(data.orders)
  ) {

    list.innerHTML = `

      <p
        style="
          grid-column:1/-1;
          text-align:center;
          color:#667085;
        "
      >
        Impossible de récupérer
        les commandes.
      </p>

    `;

    return;

  }


  const orders =
    data.orders;


  const count =
    document.getElementById(
      "ordersCount"
    );


  if (count) {

    count.textContent =
      orders.length;

  }


  if (orders.length === 0) {

    list.innerHTML = `

      <p
        style="
          grid-column:1/-1;
          text-align:center;
          color:#667085;
        "
      >
        Aucune commande.
      </p>

    `;

    return;

  }


  list.innerHTML =
    orders
      .slice(0, 10)
      .map(order => {

        return `

          <article
            class="feature-card"
          >

            <h3>
              Commande #${order.id}
            </h3>

            <p
              style="
                margin-top:7px;
                color:#667085;
              "
            >
              ${escapeHTML(
                order.service_name ||
                "Service"
              )}
            </p>

            <p
              style="
                margin-top:10px;
              "
            >
              Quantité:
              <strong>
                ${order.quantity}
              </strong>
            </p>

            <p>
              Prix:
              <strong>
                ${formatCDF(
                  order.price
                )}
              </strong>
            </p>

            <p
              style="
                margin-top:10px;
                font-weight:700;
              "
            >
              Statut:
              ${escapeHTML(
                order.status
              )}
            </p>

          </article>

        `;

      })
      .join("");

}


/*
========================================
PROTECTION HTML
========================================
*/

function escapeHTML(
  value
) {

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
PLATEFORMES
========================================
*/

document
  .querySelectorAll(
    "[data-platform]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const platform =
          button.dataset.platform;


        loadServices(
          platform
        );


        document
          .getElementById(
            "serviceResults"
          )
          ?.scrollIntoView({
            behavior: "smooth"
          });

      }
    );

  });


/*
========================================
DÉCONNEXION
========================================
*/

const logoutButton =
  document.getElementById(
    "logoutButton"
  );


if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        TOKEN_KEY
      );

      localStorage.removeItem(
        USER_KEY
      );

      window.location.href =
        "/login.html";

    }
  );

}


/*
========================================
INITIALISATION
========================================
*/

(async function init() {

  const savedUser =
    localStorage.getItem(
      USER_KEY
    );


  if (savedUser) {

    try {

      displayUser(
        JSON.parse(
          savedUser
        )
      );

    } catch {

      localStorage.removeItem(
        USER_KEY
      );

    }

  }


  await loadProfile();

  await loadOrders();

})();
