document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("nosmyboost_token");

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const amountInput = document.getElementById("amount");
  const proofInput = document.getElementById("proof");
  const paymentMethods = document.getElementById("paymentMethods");
  const depositButton = document.getElementById("depositButton");
  const depositMessage = document.getElementById("depositMessage");
  const depositHistory = document.getElementById("depositHistory");

  let selectedMethod = null;


  /*
  ========================================
  CHARGER LES MOYENS DE PAIEMENT
  ========================================
  */

  async function loadPaymentMethods() {

    try {

      const response = await fetch("/api/deposits/methods");

      const data = await response.json();

      if (!response.ok || !data.success) {

        paymentMethods.innerHTML =
          "<p>Impossible de charger les moyens de paiement.</p>";

        return;

      }

      paymentMethods.innerHTML = "";

      data.methods.forEach((method) => {

        const button = document.createElement("button");

        button.type = "button";

        button.textContent = method.name;

        button.dataset.method = method.id;

        button.addEventListener("click", () => {

          selectedMethod = method.id;

          document
            .querySelectorAll("#paymentMethods button")
            .forEach((item) => {
              item.removeAttribute("data-selected");
            });

          button.setAttribute("data-selected", "true");

        });

        paymentMethods.appendChild(button);

      });

    } catch (error) {

      console.error(error);

      paymentMethods.innerHTML =
        "<p>Erreur de connexion au serveur.</p>";

    }

  }


  /*
  ========================================
  ENVOYER UN DÉPÔT
  ========================================
  */

  depositButton.addEventListener("click", async () => {

    const amount = Number(amountInput.value);

    const proof = proofInput.value.trim();


    if (!Number.isFinite(amount) || amount <= 0) {

      depositMessage.textContent =
        "Veuillez entrer un montant valide.";

      return;

    }


    if (!selectedMethod) {

      depositMessage.textContent =
        "Veuillez choisir un moyen de paiement.";

      return;

    }


    if (!proof) {

      depositMessage.textContent =
        "Veuillez entrer la référence de paiement.";

      return;

    }


    depositButton.disabled = true;

    depositMessage.textContent =
      "Envoi de la demande...";


    try {

      const response = await fetch(
        "/api/deposits",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },

          body: JSON.stringify({
            amount,
            method: selectedMethod,
            proof
          })
        }
      );


      const data = await response.json();


      if (response.status === 401) {

        localStorage.removeItem("nosmyboost_token");
        localStorage.removeItem("nosmyboost_user");

        window.location.href = "/login.html";

        return;

      }


      if (!response.ok || !data.success) {

        depositMessage.textContent =
          data.message ||
          "Impossible d'envoyer le dépôt.";

        return;

      }


      depositMessage.textContent =
        "Dépôt envoyé. En attente de validation par l'administrateur.";

      amountInput.value = "";
      proofInput.value = "";
      selectedMethod = null;

      document
        .querySelectorAll("#paymentMethods button")
        .forEach((button) => {
          button.removeAttribute("data-selected");
        });


      await loadDepositHistory();


    } catch (error) {

      console.error(error);

      depositMessage.textContent =
        "Erreur de connexion au serveur.";

    } finally {

      depositButton.disabled = false;

    }

  });


  /*
  ========================================
  HISTORIQUE DES DÉPÔTS
  ========================================
  */

  async function loadDepositHistory() {

    try {

      const response = await fetch(
        "/api/deposits/my",
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );


      const data = await response.json();


      if (response.status === 401) {

        localStorage.removeItem("nosmyboost_token");
        localStorage.removeItem("nosmyboost_user");

        window.location.href = "/login.html";

        return;

      }


      if (!response.ok || !data.success) {

        depositHistory.innerHTML =
          "<p>Impossible de charger l'historique.</p>";

        return;

      }


      if (!data.deposits.length) {

        depositHistory.innerHTML =
          "<p>Aucun dépôt pour le moment.</p>";

        return;

      }


      depositHistory.innerHTML = "";


      data.deposits.forEach((deposit) => {

        const item = document.createElement("article");

        const amount = document.createElement("strong");

        amount.textContent =
          `${Number(deposit.amount).toLocaleString("fr-FR")} CDF`;


        const method = document.createElement("p");

        method.textContent =
          `Méthode : ${deposit.method}`;


        const status = document.createElement("p");

        status.textContent =
          `Statut : ${deposit.status}`;


        const date = document.createElement("small");

        date.textContent =
          deposit.created_at;


        item.appendChild(amount);
        item.appendChild(method);
        item.appendChild(status);
        item.appendChild(date);

        depositHistory.appendChild(item);

      });


    } catch (error) {

      console.error(error);

      depositHistory.innerHTML =
        "<p>Erreur de connexion au serveur.</p>";

    }

  }


  /*
  ========================================
  INITIALISATION
  ========================================
  */

  await loadPaymentMethods();

  await loadDepositHistory();

});
