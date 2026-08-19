/*
========================================
NOSMYBOOST🇧🇪
NEW ORDER JAVASCRIPT
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

const orderForm =
  document.getElementById("orderForm");

const platformInput =
  document.getElementById("platform");

const serviceInput =
  document.getElementById("service");

const linkInput =
  document.getElementById("link");

const quantityInput =
  document.getElementById("quantity");

const totalPrice =
  document.getElementById("totalPrice");

const currentBalance =
  document.getElementById("currentBalance");

const orderMessage =
  document.getElementById("orderMessage");

const orderButton =
  document.getElementById("orderButton");

const quantityInfo =
  document.getElementById("quantityInfo");


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
    await response.json().catch(() => ({}));

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
SERVICES
========================================
*/

let services = [];


/*
========================================
CHARGER LES SERVICES
========================================
*/

async function loadServices() {

  try {

    const data =
      await api("/api/services");

    services =
      data.services || [];

    updateServiceList();

  } catch (error) {

    console.error(
      "Erreur services:",
      error
    );

    showMessage(
      "Impossible de charger les services.",
      "error"
    );
  }
}


/*
========================================
AFFICHER SERVICES
========================================
*/

function updateServiceList() {

  if (!serviceInput)
    return;

  const platform =
    platformInput?.value || "";

  serviceInput.innerHTML = `
    <option value="">
      Choisissez un service
    </option>
  `;

  serviceInput.disabled =
    !platform;

  if (!platform)
    return;

  const filtered =
    services.filter(
      service =>
        String(service.platform || "")
          .toLowerCase() ===
        String(platform)
          .toLowerCase()
    );

  filtered.forEach(service => {

    const option =
      document.createElement("option");

    option.value =
      service.id;

    option.textContent =
      `${service.name} — ${
        formatMoney(service.price)
      } CDF / 1000`;

    serviceInput.appendChild(
      option
    );
  });

  if (!filtered.length) {

    serviceInput.innerHTML = `
      <option value="">
        Aucun service disponible
      </option>
    `;
  }
}


/*
========================================
SERVICE SÉLECTIONNÉ
========================================
*/

function getSelectedService() {

  const id =
    serviceInput?.value;

  if (!id)
    return null;

  return services.find(
    service =>
      String(service.id) ===
      String(id)
  ) || null;
}


/*
========================================
CALCUL PRIX
========================================
*/

function calculatePrice() {

  const service =
    getSelectedService();

  const quantity =
    Number(
      quantityInput?.value
    );

  if (
    !service ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {

    if (totalPrice) {
      totalPrice.textContent =
        "0 CDF";
    }

    return 0;
  }

  const rate =
    Number(service.price || 0);

  const price =
    (quantity / 1000) *
    rate;

  if (totalPrice) {

    totalPrice.textContent =
      formatMoney(price) +
      " CDF";
  }

  return price;
}


/*
========================================
LIMITES SERVICE
========================================
*/

function updateQuantityInfo() {

  const service =
    getSelectedService();

  if (!quantityInfo)
    return;

  if (!service) {

    quantityInfo.textContent =
      "Choisissez un service pour voir les limites.";

    return;
  }

  const min =
    Number(
      service.min_quantity || 1
    );

  const max =
    Number(
      service.max_quantity || 1000000
    );

  quantityInfo.textContent =
    `Minimum : ${formatMoney(min)} — Maximum : ${formatMoney(max)}`;
}


/*
========================================
CHANGEMENT PLATEFORME
========================================
*/

if (platformInput) {

  platformInput.addEventListener(
    "change",
    () => {

      updateServiceList();

      if (quantityInput) {
        quantityInput.value = "";
      }

      if (totalPrice) {
        totalPrice.textContent =
          "0 CDF";
      }

      updateQuantityInfo();
    }
  );
}


/*
========================================
CHANGEMENT SERVICE
========================================
*/

if (serviceInput) {

  serviceInput.addEventListener(
    "change",
    () => {

      updateQuantityInfo();

      calculatePrice();
    }
  );
}


/*
========================================
CHANGEMENT QUANTITÉ
========================================
*/

if (quantityInput) {

  quantityInput.addEventListener(
    "input",
    () => {

      calculatePrice();
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
      await api("/api/auth/me");

    const balance =
      data.user?.balance || 0;

    currentBalance.textContent =
      formatMoney(balance) +
      " CDF";

  } catch (error) {

    console.error(
      "Erreur solde:",
      error
    );

    currentBalance.textContent =
      "—";
  }
}


/*
========================================
ENVOYER COMMANDE
========================================
*/

if (orderForm) {

  orderForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const service =
        getSelectedService();

      const link =
        linkInput?.value.trim();

      const quantity =
        Number(
          quantityInput?.value
        );


      if (!service) {

        showMessage(
          "Veuillez choisir un service.",
          "error"
        );

        return;
      }


      if (!link) {

        showMessage(
          "Veuillez entrer le lien.",
          "error"
        );

        return;
      }


      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {

        showMessage(
          "Veuillez entrer une quantité valide.",
          "error"
        );

        return;
      }


      const min =
        Number(
          service.min_quantity || 1
        );

      const max =
        Number(
          service.max_quantity ||
          1000000
        );


      if (quantity < min) {

        showMessage(
          `La quantité minimum est de ${formatMoney(min)}.`,
          "error"
        );

        return;
      }


      if (quantity > max) {

        showMessage(
          `La quantité maximum est de ${formatMoney(max)}.`,
          "error"
        );

        return;
      }


      const price =
        calculatePrice();


      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {

        showMessage(
          "Prix du service invalide.",
          "error"
        );

        return;
      }


      try {

        orderButton.disabled =
          true;

        orderButton.textContent =
          "Commande en cours...";


        showMessage(
          "Vérification et création de votre commande...",
          "info"
        );


        const data =
          await api(
            "/api/orders",
            {
              method: "POST",

              body:
                JSON.stringify({

                  serviceId:
                    service.id,

                  link,

                  quantity

                })
            }
          );


        showMessage(
          data.message ||
          "Commande créée avec succès.",
          "success"
        );


        orderForm.reset();

        serviceInput.disabled =
          true;

        totalPrice.textContent =
          "0 CDF";

        quantityInfo.textContent =
          "Choisissez un service pour voir les limites.";


        await loadBalance();


      } catch (error) {

        console.error(
          "Erreur commande:",
          error
        );

        showMessage(
          error.message,
          "error"
        );


      } finally {

        orderButton.disabled =
          false;

        orderButton.textContent =
          "🛒 Commander maintenant";
      }
    }
  );
}


/*
========================================
MESSAGE
========================================
*/

function showMessage(text, type) {

  if (!orderMessage)
    return;

  orderMessage.textContent =
    text;

  orderMessage.style.padding =
    "12px 16px";

  orderMessage.style.marginTop =
    "15px";

  orderMessage.style.borderRadius =
    "10px";


  if (type === "success") {

    orderMessage.style.background =
      "#ecfdf3";

    orderMessage.style.color =
      "#067647";
  }


  if (type === "error") {

    orderMessage.style.background =
      "#fef3f2";

    orderMessage.style.color =
      "#b42318";
  }


  if (type === "info") {

    orderMessage.style.background =
      "#eff8ff";

    orderMessage.style.color =
      "#175cd1";
  }
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
DÉMARRAGE
========================================
*/

async function initOrder() {

  await loadBalance();

  await loadServices();
}

initOrder();
