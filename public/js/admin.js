document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("nosmyboost_token");

  const pendingDeposits =
    document.getElementById("pendingDeposits");

  const adminMessage =
    document.getElementById("adminMessage");

  const logoutButton =
    document.getElementById("logoutButton");


  /*
  ========================================
  VÉRIFIER LA SESSION
  ========================================
  */

  if (!token) {
    window.location.href = "/login.html";
    return;
  }


  /*
  ========================================
  DÉCONNEXION
  ========================================
  */

  logoutButton.addEventListener("click", () => {

    localStorage.removeItem("nosmyboost_token");
    localStorage.removeItem("nosmyboost_user");

    window.location.href = "/login.html";

  });


  /*
  ========================================
  CHARGER LES DÉPÔTS EN ATTENTE
  ========================================
  */

  async function loadPendingDeposits() {

    pendingDeposits.innerHTML =
      "<p>Chargement...</p>";

    try {

      const response = await fetch(
        "/api/admin/deposits/pending",
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


      if (response.status === 403) {

        pendingDeposits.innerHTML =
          "<p>Accès administrateur refusé.</p>";

        return;

      }


      if (!response.ok || !data.success) {

        pendingDeposits.innerHTML =
          `<p>${data.message || "Impossible de charger les dépôts."}</p>`;

        return;

      }


      if (!data.deposits.length) {

        pendingDeposits.innerHTML =
          "<p>Aucun dépôt en attente.</p>";

        return;

      }


      pendingDeposits.innerHTML = "";


      /*
      ====================================
      CRÉER CHAQUE DÉPÔT
      ====================================
      */

      data.deposits.forEach((deposit) => {

        const card =
          document.createElement("article");


        const title =
          document.createElement("h3");

        title.textContent =
          `Dépôt #${deposit.id}`;


        const client =
          document.createElement("p");

        client.textContent =
          `Client : ${deposit.name}`;


        const email =
          document.createElement("p");

        email.textContent =
          `Email : ${deposit.email}`;


        const whatsapp =
          document.createElement("p");

        whatsapp.textContent =
          `WhatsApp : ${deposit.whatsapp || "Non renseigné"}`;


        const amount =
          document.createElement("p");

        amount.textContent =
          `Montant : ${Number(deposit.amount).toLocaleString("fr-FR")} CDF`;


        const method =
          document.createElement("p");

        method.textContent =
          `Paiement : ${deposit.method}`;


        const proof =
          document.createElement("p");

        proof.textContent =
          `Preuve : ${deposit.proof}`;


        const date =
          document.createElement("p");

        date.textContent =
          `Date : ${deposit.created_at}`;


        /*
        ================================
        BOUTON VALIDER
        ================================
        */

        const approveButton =
          document.createElement("button");

        approveButton.type = "button";

        approveButton.textContent =
          "Valider le dépôt";


        approveButton.addEventListener(
          "click",
          async () => {

            const confirmed =
              window.confirm(
                `Confirmer la validation de ${Number(deposit.amount).toLocaleString("fr-FR")} CDF ?`
              );


            if (!confirmed) {
              return;
            }


            await processDeposit(
              deposit.id,
              "approve"
            );

          }
        );


        /*
        ================================
        BOUTON REFUSER
        ================================
        */

        const rejectButton =
          document.createElement("button");

        rejectButton.type = "button";

        rejectButton.textContent =
          "Refuser le dépôt";


        rejectButton.addEventListener(
          "click",
          async () => {

            const confirmed =
              window.confirm(
                "Confirmer le refus de ce dépôt ?"
              );


            if (!confirmed) {
              return;
            }


            await processDeposit(
              deposit.id,
              "reject"
            );

          }
        );


        card.appendChild(title);
        card.appendChild(client);
        card.appendChild(email);
        card.appendChild(whatsapp);
        card.appendChild(amount);
        card.appendChild(method);
        card.appendChild(proof);
        card.appendChild(date);

        card.appendChild(approveButton);
        card.appendChild(rejectButton);

        pendingDeposits.appendChild(card);

      });


    } catch (error) {

      console.error(error);

      pendingDeposits.innerHTML =
        "<p>Erreur de connexion au serveur.</p>";

    }

  }


  /*
  ========================================
  TRAITER UN DÉPÔT
  ========================================
  */

  async function processDeposit(
    depositId,
    action
  ) {

    adminMessage.textContent =
      "Traitement en cours...";


    try {

      const response = await fetch(
        `/api/admin/deposits/${depositId}/${action}`,
        {
          method: "POST",

          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
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

        adminMessage.textContent =
          data.message ||
          "Opération impossible.";

        return;

      }


      adminMessage.textContent =
        data.message;


      await loadPendingDeposits();


    } catch (error) {

      console.error(error);

      adminMessage.textContent =
        "Erreur de connexion au serveur.";

    }

  }


  /*
  ========================================
  INITIALISATION
  ========================================
  */

  await loadPendingDeposits();

});
