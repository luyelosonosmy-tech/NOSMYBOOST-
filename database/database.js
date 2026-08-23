const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "nosmyboost.sqlite3");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(
      "Erreur connexion base de données :",
      err.message
    );
  } else {
    console.log(
      "Base de données NOSMYBOOST🇧🇪 connectée."
    );
  }
});

db.serialize(() => {

  /*
  ========================================
  UTILISATEURS
  ========================================
  */

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      whatsapp TEXT,
      country TEXT DEFAULT 'CD',
      password TEXT NOT NULL,
      balance REAL DEFAULT 0,
      total_deposited REAL DEFAULT 0,
      total_spent REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);


  /*
  ========================================
  SERVICES
  ========================================
  */

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      min_quantity INTEGER DEFAULT 100,
      max_quantity INTEGER DEFAULT 1000000,
      provider TEXT,
      provider_service_id TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);


  /*
  ========================================
  COMMANDES
  ========================================
  */

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      link TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      provider_service_id TEXT,
      provider_order_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);


  /*
  ========================================
  DÉPÔTS
  ========================================
  */

  db.run(`
  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    proof TEXT,
    status TEXT DEFAULT 'pending',
    provider TEXT,
    provider_payment_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);


  /*
  ========================================
  MIGRATION ORDERS
  ========================================
  */

  db.all(
    `PRAGMA table_info(orders)`,
    [],
    (err, columns) => {

      if (err) {

        console.error(
          "Erreur vérification table orders :",
          err.message
        );

        return;

      }


      const columnNames =
        columns.map(
          column => column.name
        );


      /*
      ------------------------------
      provider_service_id
      ------------------------------
      */

      if (
        !columnNames.includes(
          "provider_service_id"
        )
      ) {

        db.run(
          `
          ALTER TABLE orders
          ADD COLUMN provider_service_id TEXT
          `,
          (error) => {

            if (error) {

              console.error(
                "Erreur ajout provider_service_id :",
                error.message
              );

            } else {

              console.log(
                "✅ orders.provider_service_id ajouté."
              );

            }

          }
        );

      } else {

        console.log(
          "✅ orders.provider_service_id existe déjà."
        );

      }


      /*
      ------------------------------
      provider_order_id
      ------------------------------
      */

      if (
        !columnNames.includes(
          "provider_order_id"
        )
      ) {

        db.run(
          `
          ALTER TABLE orders
          ADD COLUMN provider_order_id TEXT
          `,
          (error) => {

            if (error) {

              console.error(
                "Erreur ajout provider_order_id :",
                error.message
              );

            } else {

              console.log(
                "✅ orders.provider_order_id ajouté."
              );

            }

          }
        );

      } else {

        console.log(
          "✅ orders.provider_order_id existe déjà."
        );

      }

    }
  );

});


module.exports = db;
