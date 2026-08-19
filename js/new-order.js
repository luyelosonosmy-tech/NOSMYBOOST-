/*
========================================
NOSMYBOOST🇧🇪
NEW ORDER JAVASCRIPT
========================================
*/

"use strict";

/*
========================================
AUTHENTIFICATION
========================================
*/

const token = localStorage.getItem("nosmyboost_token");

if (!token) {
  window.location.href = "/login.html";
}


/*
========================================
ÉLÉMENTS
========================================
*/

const orderForm = document.getElementById("orderForm");
const platformInput = document.getElementById("platform");
const serviceInput = document.getElementById("service");
const linkInput = document.getElementById("link");
const quantityInput = document.getElementById("quantity");
const totalPrice = document.getElementById("totalPrice");
const currentBalance = document.getElementById("currentBalance");
const orderMessage = document.getElementById("orderMessage");
const orderButton = document.getElementById("orderButton");
const quantityInfo = document.getElementById("quantityInfo");


/*
========================================
SERVICES
========================================
*/

let services = [];


/*
========================================
API
========================================
*/

async function api(url, options = {}) {

  const response = await fetch(url, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      "Authorization": `Bearer ${token}`,

      ...(options.headers || {})
    }
  });

  const data = await response
    .json()
    .catch(() => ({}));


  /*
  ==============================
  SESSION EXPIRÉE
  ==============================
  */

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


  /*
  ==============================
  ERREUR API
  ==============================
  */

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
CHARGER LES SERVICES
========================================
*/

async function loadServices() {

  try {

    showMessage(
      "Chargement des services...",
      "info"
    );


    const platform =
      platformInput?.value?.trim() || "";


    let url =
      "/api/services";


    /*
    Si une plateforme est déjà sélectionnée,
    on demande uniquement ses services.
    */

    if (platform) {

      url +=
        "?platform=" +
        encodeURIComponent(
          platform
        );
    }


    const data =
      await api(url);


    services =
      Array.isArray(
        data.services
      )
        ? data.services
        : [];


    updateServiceList();


    /*
    ==============================
    MESSAGE
    ==============================
    */

    if (!services.length) {

      showMessage(
        "Aucun service disponible pour le moment.",
        "error"
      );

    } else {

      clearMessage();

    }


  } catch (error) {

    console.error(
      "NOSMYBOOST - Erreur services:",
      error
    );


    services = [];


    updateServiceList();


    showMessage(
      error.message ||
      "Impossible de charger les services.",
      "error"
    );
  }
}


/*
========================================
AFFICHER LA LISTE DES SERVICES
========================================
*/

function updateServiceList() {

  if (!serviceInput)
    return;


  const platform =
    platformInput?.value?.trim() || "";


  serviceInput.innerHTML = `
    <option value="">
      Choisissez un service
    </option>
  `;


  serviceInput.disabled =
    !platform;


  if (!platform)
    return;


  /*
  ==============================
  FILTRER LES SERVICES
  ==============================
  */

  const filtered =
    services.filter(service => {

      return String(
        service.platform || ""
      )
        .trim()
        .toLowerCase() ===
      platform
        .toLowerCase();

    });


  /*
  ==============================
  AJOUTER SERVICES
  ==============================
  */

  filtered.forEach(service => {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      String(service.id);


    const price =
      Number(
        service.price || 0
      );


    option.textContent =
      `${service.name} — ${formatMoney(price)} CDF / 1000`;


    serviceInput.appendChild(
      option
    );

  });


  /*
  ==============================
  AUCUN SERVICE
  ==============================
  */

  if (!filtered.length) {

    serviceInput.innerHTML = `
      <option value="">
        Aucun service disponible
      </option>
    `;

    serviceInput.disabled =
      true;
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
CALCUL DU PRIX
========================================

Le backend utilise :

price × quantity / 1000

Exemple :

1 000 = prix du service
2 000 = prix × 2
5 000 = prix × 5
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
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {

    if (totalPrice) {

      totalPrice.textContent =
        "0 CDF";
    }


    return 0;
  }


  const rate =
    Number(
      service.price || 0
    );


  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {

    if (totalPrice) {

      totalPrice.textContent =
        "0 CDF";
    }


    return 0;
  }


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
LIMITES DU SERVICE
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
    async () => {

      /*
      Réinitialiser le service
      */

      if (serviceInput) {

        serviceInput.innerHTML = `
          <option value="">
            Chargement des services...
          </option>
        `;

        serviceInput.disabled =
          true;
      }


      if (quantityInput) {

        quantityInput.value =
          "";
      }


      if (linkInput) {

        linkInput.value =
          "";
      }


      if (totalPrice) {

        totalPrice.textContent =
          "0 CDF";
      }


      updateQuantityInfo();


      /*
      Recharger les services
      */

      await loadServices();

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

      clearMessage();

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

      clearMessage();

    }
  );
}


/*
========================================
CHARGER LE SOLDE
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


    const balance =
      Number(
        data.user?.balance || 0
      );


    currentBalance.textContent =
      formatMoney(balance) +
      " CDF";


  } catch (error) {

    console.error(
      "NOSMYBOOST - Erreur solde:",
      error
    );


    currentBalance.textContent =
      "—";
  }
}


/*
========================================
ENVOYER LA COMMANDE
========================================
*/

if (orderForm) {

  orderForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      /*
      ==============================
      RÉCUPÉRER LES DONNÉES
      ==============================
      */

      const service =
        getSelectedService();


      const link =
        String(
          linkInput?.value || ""
        ).trim();


      const quantity =
        Number(
          quantityInput?.value
        );


      /*
      ==============================
      SERVICE
      ==============================
      */

      if (!service) {

        showMessage(
          "Veuillez choisir un service.",
          "error"
        );

        return;
      }


      /*
      ==============================
      LIEN
      ==============================
      */

      if (!link) {

        showMessage(
          "Veuillez entrer le lien de votre publication ou profil.",
          "error"
        );

        linkInput?.focus();

        return;
      }


      /*
      ==============================
      QUANTITÉ
      ==============================
      */

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {

        showMessage(
          "Veuillez entrer une quantité entière valide.",
          "error"
        );

        quantityInput?.focus();

        return;
      }


      /*
      ==============================
      LIMITES
      ==============================
      */

      const min =
        Number(
          service.min_quantity || 1
        );


      const max =
        Number(
          service.max_quantity || 1000000
        );


      if (quantity < min) {

        showMessage(
          `La quantité minimum est de ${formatMoney(min)}.`,
          "error"
        );

        quantityInput?.focus();

        return;
      }


      if (quantity > max) {

        showMessage(
          `La quantité maximum est de ${formatMoney(max)}.`,
          "error"
        );

        quantityInput?.focus();

        return;
      }


      /*
      ==============================
      CALCUL PRIX
      ==============================
      */

      const price =
        calculatePrice();


      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {

        showMessage(
          "Impossible de calculer le prix de ce service.",
          "error"
        );

        return;
      }


      /*
      ==============================
      CONFIRMATION VISUELLE
      ==============================
      */

      const confirmation =
        window.confirm(
          `Confirmer la commande ?\n\n` +
          `Service : ${service.name}\n` +
          `Quantité : ${formatMoney(quantity)}\n` +
          `Prix : ${formatMoney(price)} CDF\n\n` +
          `Le montant sera déduit de votre solde.`
        );


      if (!confirmation)
        return;


      /*
      ==============================
      ENVOI
      ==============================
      */

      try {

        if (orderButton) {

          orderButton.disabled =
            true;

          orderButton.textContent =
            "⏳ Commande en cours...";
        }


        showMessage(
          "Vérification de votre solde et création de la commande...",
          "info"
        );


        /*
        ==============================
        API
        ==============================
        */

        const data =
          await api(
            "/api/orders",
            {
              method: "POST",

              body:
                JSON.stringify({

                  serviceId:
                    Number(service.id),

                  link,

                  quantity

                })
            }
          );


        /*
        ==============================
        SUCCÈS
        ==============================
        */

        showMessage(
          data.message ||
          "✅ Commande créée avec succès.",
          "success"
        );


        /*
        ==============================
        RÉINITIALISER
        ==============================
        */

        orderForm.reset();


        if (serviceInput) {

          serviceInput.innerHTML = `
            <option value="">
              Choisissez un service
            </option>
          `;

          serviceInput.disabled =
            true;
        }


        if (totalPrice) {

          totalPrice.textContent =
            "0 CDF";
        }


        if (quantityInfo) {

          quantityInfo.textContent =
            "Choisissez un service pour voir les limites.";
        }


        /*
        ==============================
        ACTUALISER SOLDE
        ==============================
        */

        await loadBalance();


      } catch (error) {

        console.error(
          "NOSMYBOOST - Erreur commande:",
          error
        );


        showMessage(
          error.message ||
          "Impossible de créer la commande.",
          "error"
        );


      } finally {

        if (orderButton) {

          orderButton.disabled =
            false;

          orderButton.textContent =
            "🛒 Commander maintenant";
        }
      }
    }
  );
}


/*
========================================
MESSAGE
========================================
*/

function showMessage(
  text,
  type = "info"
) {

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


  else if (type === "error") {

    orderMessage.style.background =
      "#fef3f2";

    orderMessage.style.color =
      "#b42318";
  }


  else {

    orderMessage.style.background =
      "#eff8ff";

    orderMessage.style.color =
      "#175cd1";
  }
}


/*
========================================
EFFACER MESSAGE
========================================
*/

function clearMessage() {

  if (!orderMessage)
    return;


  orderMessage.textContent =
    "";

  orderMessage.style.padding =
    "";

  orderMessage.style.marginTop =
    "";

  orderMessage.style.background =
    "";

  orderMessage.style.color =
    "";
}


/*
========================================
FORMAT ARGENT
========================================
*/

function formatMoney(amount) {

  const value =
    Number(amount);


  if (
    !Number.isFinite(value)
  ) {

    return "0";
  }


  return value.toLocaleString(
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

  if (!token)
    return;


  /*
  Solde
  */

  await loadBalance();


  /*
  Services
  */

  await loadServices();

}


/*
========================================
LANCEMENT
========================================
*/

initOrder();
