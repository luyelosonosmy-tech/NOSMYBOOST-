document.addEventListener("DOMContentLoaded", async () => {

  const token =
    localStorage.getItem("nosmyboost_token");

  const savedUser =
    localStorage.getItem("nosmyboost_user");

  /*
  ========================================
  VÉRIFICATION SESSION
  ========================================
  */

  if (!token || !savedUser) {

    window.location.href = "/login.html";

    return;

  }


  let user;

  try {

    user = JSON.parse(savedUser);

  } catch (error) {

    localStorage.removeItem("nosmyboost_token");
    localStorage.removeItem("nosmyboost_user");

    window.location.href = "/login.html";

    return;

  }


  /*
  ========================================
  AFFICHER UTILISATEUR
  ========================================
  */

  const userName =
    document.getElementById("userName");

  const welcomeUser =
    document.getElementById("welcomeUser");

  const balance =
    document.getElementById("balance");

  const totalDeposited =
    document.getElementById("totalDeposited");

  const totalSpent =
    document.getElementById("totalSpent");


  if (userName) {

    userName.textContent =
      `@${user.name}`;

  }


  if (welcomeUser) {

    welcomeUser.textContent =
      `Bienvenue, ${user.name}`;

  }


  if (balance) {

    balance.textContent =
      `${Number(user.balance || 0).toLocaleString("fr-FR")} CDF`;

  }


  if (totalDeposited) {

    totalDeposited.textContent =
      "0 CDF";

  }


  if (totalSpent) {

    totalSpent.textContent =
      "0 CDF";

  }


  /*
  ========================================
  DÉCONNEXION
  ========================================
  */

  const logoutButton =
    document.getElementById("logoutButton");


  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      () => {

        localStorage.removeItem(
          "nosmyboost_token"
        );

        localStorage.removeItem(
          "nosmyboost_user"
        );

        window.location.href =
          "/login.html";

      }
    );

  }


  /*
  ========================================
  CHARGER SERVICES
  ========================================
  */

  const platformButtons =
    document.querySelectorAll(
      "#platforms button"
    );

  const servicesContainer =
    document.getElementById("services");

  const dashboardMessage =
    document.getElementById(
      "dashboardMessage"
    );


  platformButtons.forEach((button) => {

    button.addEventListener(
      "click",
      async () => {

        const platform =
          button.dataset.platform;

        if (!servicesContainer) {
          return;
        }


        servicesContainer.innerHTML =
          "<p>Chargement des services...</p>";


        try {

          const response =
            await fetch(
              `/api/services/platform/${encodeURIComponent(platform)}`
            );


          const data =
            await response.json();


          if (!response.ok || !data.success) {

            servicesContainer.innerHTML =
              "<p>Impossible de charger les services.</p>";

            return;

          }


          if (!data.services.length) {

            servicesContainer.innerHTML =
              "<p>Aucun service disponible pour cette plateforme.</p>";

            return;

          }


          servicesContainer.innerHTML = "";


          data.services.forEach((service) => {

            const card =
              document.createElement("article");


            const title =
              document.createElement("h3");

            title.textContent =
              service.name;


            const description =
              document.createElement("p");

            description.textContent =
              service.description || "";


            const price =
              document.createElement("strong");

            price.textContent =
              `${Number(service.price).toLocaleString("fr-FR")} CDF`;


            const limits =
              document.createElement("p");

            limits.textContent =
              `Min: ${service.min_quantity} — Max: ${service.max_quantity}`;


            card.appendChild(title);
            card.appendChild(description);
            card.appendChild(price);
            card.appendChild(limits);


            servicesContainer.appendChild(card);

          });


        } catch (error) {

          console.error(error);

          servicesContainer.innerHTML =
            "<p>Erreur de connexion au serveur.</p>";

        }

      }
    );

  });


  /*
  ========================================
  MESSAGE
  ========================================
  */

  if (dashboardMessage) {

    dashboardMessage.textContent = "";

  }

});
