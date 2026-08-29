"use strict";

const { Pool } = require("pg");

/*
========================================
NOSMYBOOST 🇧🇪
DATABASE POSTGRESQL
CLIENT WALLET + ADMIN FINANCIAL HISTORY
========================================
*/

const DATABASE_URL =
  String(process.env.DATABASE_URL || "").trim();

if (!DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL manque dans les variables d'environnement."
  );

  process.exit(1);
}


/*
========================================
CONNEXION POSTGRESQL
========================================
*/

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000
});


pool.on("connect", () => {

  console.log(
    "Base de données PostgreSQL NOSMYBOOST 🇧🇪 connectée."
  );

});


pool.on("error", (error) => {

  console.error(
    "❌ Erreur PostgreSQL:",
    error.message
  );

});


/*
========================================
INITIALISATION BASE
========================================
*/

async function initializeDatabase() {

  const client =
    await pool.connect();

  try {

    await client.query("BEGIN");


    /*
    ========================================
    USERS
    ========================================
    */

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (

        id BIGSERIAL PRIMARY KEY,

        name TEXT NOT NULL,

        email TEXT NOT NULL UNIQUE,

        whatsapp TEXT,

        country TEXT DEFAULT 'CD',

        password TEXT NOT NULL,

        /*
        WALLET CLIENT UNIQUEMENT
        */

        balance NUMERIC(14,2)
          NOT NULL
          DEFAULT 0,

        /*
        TOTAL DES DÉPÔTS DU CLIENT
        */

        total_deposited NUMERIC(14,2)
          NOT NULL
          DEFAULT 0,

        /*
        TOTAL DÉPENSÉ PAR LE CLIENT
        */

        total_spent NUMERIC(14,2)
          NOT NULL
          DEFAULT 0,

        created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP

      )
    `);


    /*
    ========================================
    SERVICES
    ========================================
    */

    await client.query(`
      CREATE TABLE IF NOT EXISTS services (

        id BIGSERIAL PRIMARY KEY,

        platform TEXT NOT NULL,

        name TEXT NOT NULL,

        description TEXT,

        price NUMERIC(14,2)
          NOT NULL,

        min_quantity INTEGER
          NOT NULL
          DEFAULT 100,

        max_quantity INTEGER
          NOT NULL
          DEFAULT 1000000,

        provider TEXT,

        provider_service_id TEXT,

        active INTEGER
          NOT NULL
          DEFAULT 1,

        created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP

      )
    `);


    /*
    ========================================
    ORDERS
    ========================================
    */

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (

        id BIGSERIAL PRIMARY KEY,

        user_id BIGINT NOT NULL,

        service_id BIGINT NOT NULL,

        link TEXT NOT NULL,

        quantity INTEGER NOT NULL,

        price NUMERIC(14,2) NOT NULL,

        status TEXT
          NOT NULL
          DEFAULT 'pending',

        provider_service_id TEXT,

        provider_order_id TEXT,

        created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP

      )
    `);


    /*
    ========================================
    DEPOSITS
    ========================================
    */

    await client.query(`
      CREATE TABLE IF NOT EXISTS deposits (

        id BIGSERIAL PRIMARY KEY,

        user_id BIGINT NOT NULL,

        amount NUMERIC(14,2) NOT NULL,

        method TEXT NOT NULL,

        proof TEXT,

        status TEXT
          NOT NULL
          DEFAULT 'pending',

        provider TEXT,

        provider_payment_id TEXT UNIQUE,

        created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP

      )
    `);


    /*
    ========================================
    TRANSACTIONS
    ========================================
    
    HISTORIQUE FINANCIER
    
    deposit    = dépôt client
    purchase   = achat/service
    refund     = remboursement
    adjustment = correction manuelle admin
    
    IMPORTANT:
    Cette table est un HISTORIQUE.
    Elle ne constitue PAS un wallet admin.
    ========================================
    */

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (

        id BIGSERIAL PRIMARY KEY,

        user_id BIGINT NOT NULL,

        type TEXT NOT NULL,

        amount NUMERIC(14,2) NOT NULL,

        balance_before NUMERIC(14,2),

        balance_after NUMERIC(14,2),

        reference_id BIGINT,

        reason TEXT,

        created_by TEXT,

        created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP

      )
    `);


    /*
    ========================================
    INDEX USERS
    ========================================
    */

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email)
    `);


    /*
    ========================================
    INDEX SERVICES
    ========================================
    */

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_services_platform
      ON services(platform)
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_services_active
      ON services(active)
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_services_provider_service_id
      ON services(provider_service_id)
    `);


    /*
    ========================================
    INDEX ORDERS
    ========================================
    */

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id
      ON orders(user_id)
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_service_id
      ON orders(service_id)
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status
      ON orders(status)
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_orders_provider_order_id
      ON orders(provider_order_id)
    `);


    /*
    ========================================
    INDEX DEPOSITS
    ========================================
    */

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_deposits_user_id
      ON deposits(user_id)
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_deposits_status
      ON deposits(status)
    `);


    /*
    ========================================
    INDEX TRANSACTIONS
    ========================================
    */

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_transactions_user_id
      ON transactions(user_id)
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_transactions_type
      ON transactions(type)
    `);


    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_transactions_created_at
      ON transactions(created_at)
    `);


    /*
    ========================================
    COLONNES EXISTANTES
    ========================================
    */

    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS
      provider_service_id TEXT
    `);


    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS
      provider_order_id TEXT
    `);


    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS
      provider TEXT
    `);


    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS
      provider_service_id TEXT
    `);


    await client.query(`
      ALTER TABLE deposits
      ADD COLUMN IF NOT EXISTS
      provider TEXT
    `);


    await client.query(`
      ALTER TABLE deposits
      ADD COLUMN IF NOT EXISTS
      provider_payment_id TEXT
    `);


    /*
    ========================================
    FOREIGN KEY ORDERS → USERS
    ========================================
    */

    await client.query(`
      DO $$
      BEGIN

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'orders_user_id_fkey'
        ) THEN

          ALTER TABLE orders
          ADD CONSTRAINT
          orders_user_id_fkey
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;

        END IF;

      END
      $$;
    `);


    /*
    ========================================
    FOREIGN KEY ORDERS → SERVICES
    ========================================
    */

    await client.query(`
      DO $$
      BEGIN

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'orders_service_id_fkey'
        ) THEN

          ALTER TABLE orders
          ADD CONSTRAINT
          orders_service_id_fkey
          FOREIGN KEY (service_id)
          REFERENCES services(id)
          ON DELETE RESTRICT;

        END IF;

      END
      $$;
    `);


    /*
    ========================================
    FOREIGN KEY DEPOSITS → USERS
    ========================================
    */

    await client.query(`
      DO $$
      BEGIN

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'deposits_user_id_fkey'
        ) THEN

          ALTER TABLE deposits
          ADD CONSTRAINT
          deposits_user_id_fkey
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;

        END IF;

      END
      $$;
    `);


    /*
    ========================================
    FOREIGN KEY TRANSACTIONS → USERS
    ========================================
    */

    await client.query(`
      DO $$
      BEGIN

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'transactions_user_id_fkey'
        ) THEN

          ALTER TABLE transactions
          ADD CONSTRAINT
          transactions_user_id_fkey
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;

        END IF;

      END
      $$;
    `);


    /*
    ========================================
    FIN
    ========================================
    */

    await client.query("COMMIT");


    console.log(
      "========================================"
    );

    console.log(
      "✅ BASE NOSMYBOOST PRÊTE"
    );

    console.log(
      "========================================"
    );

    console.log(
      "✅ Users"
    );

    console.log(
      "✅ Services"
    );

    console.log(
      "✅ Orders"
    );

    console.log(
      "✅ Deposits"
    );

    console.log(
      "✅ Transactions"
    );

    console.log(
      "========================================"
    );


  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "❌ ERREUR INITIALISATION POSTGRESQL:",
      error
    );

    throw error;

  } finally {

    client.release();

  }

}


/*
========================================
INITIALISATION AUTOMATIQUE
========================================
*/

initializeDatabase()
  .catch((error) => {

    console.error(
      "❌ Impossible d'initialiser PostgreSQL."
    );

    console.error(
      error.message
    );

  });


/*
========================================
EXPORT
========================================
*/

module.exports = pool;
