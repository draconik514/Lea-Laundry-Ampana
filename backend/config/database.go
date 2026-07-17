package config

import (
    "database/sql"
    "fmt"
    "log"
    "os"
    "time"

    _ "github.com/tursodatabase/libsql-client-go/libsql"
)

var DB *sql.DB

func InitDB() {
    var err error
    dbURL := os.Getenv("DB_URL")
    
    DB, err = sql.Open("libsql", dbURL)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    DB.SetMaxOpenConns(5)
    DB.SetMaxIdleConns(2)
    DB.SetConnMaxLifetime(5 * time.Minute)
    DB.SetConnMaxIdleTime(2 * time.Minute)

    if err = DB.Ping(); err != nil {
        log.Fatal("Failed to ping database:", err)
    }

    fmt.Println("Database connected successfully!")
    createTables()
}

func createTables() {
    queries := []string{
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'owner',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'Umum',
            description TEXT DEFAULT '',
            price_per_kg REAL NOT NULL,
            estimated_day INTEGER DEFAULT 2,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            customer_id INTEGER REFERENCES customers(id),
            service_id INTEGER REFERENCES services(id),
            weight REAL NOT NULL,
            total_price REAL NOT NULL,
            status TEXT DEFAULT 'pending_pickup',
            note TEXT,
            order_source TEXT DEFAULT 'website',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS status_histories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER REFERENCES orders(id),
            status TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS feedbacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_code TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON orders(code)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)`,
        `CREATE INDEX IF NOT EXISTS idx_status_histories_order_id ON status_histories(order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at)`,
    }

    for _, query := range queries {
        _, err := DB.Exec(query)
        if err != nil {
            log.Printf("Error creating table: %v", err)
        }
    }

    // Migrate: tambah kolom baru kalau belum ada (abaikan error kalau sudah ada)
    DB.Exec(`ALTER TABLE services ADD COLUMN category TEXT DEFAULT 'Umum'`)
    DB.Exec(`ALTER TABLE services ADD COLUMN description TEXT DEFAULT ''`)
    DB.Exec(`ALTER TABLE services ADD COLUMN unit TEXT DEFAULT 'Kg'`)

    // Insert default services if not exists
    var count int
    DB.QueryRow("SELECT COUNT(*) FROM services").Scan(&count)
    if count == 0 {
        defaultServices := []struct {
            name, category, description string
            price                       float64
            day                         int
        }{
            // Cuci Komplit
            {"Cuci Komplit — Reguler", "Cuci Komplit", "Cuci, Setrika, Lipat · 1-2 Hari", 10000, 2},
            {"Cuci Komplit — Express 12 Jam", "Cuci Komplit", "Cuci, Setrika, Lipat · 12 Jam", 14000, 1},
            {"Cuci Komplit — Express 6 Jam", "Cuci Komplit", "Cuci, Setrika, Lipat · 6 Jam", 17000, 1},
            {"Cuci Komplit — Express 3 Jam", "Cuci Komplit", "Cuci, Setrika, Lipat · 3 Jam", 20000, 1},
            // Setrika
            {"Setrika — Reguler", "Setrika", "Hanya Setrika · 1-2 Hari", 8000, 2},
            {"Setrika — Express 12 Jam", "Setrika", "Hanya Setrika · 12 Jam", 10000, 1},
            {"Setrika — Express 6 Jam", "Setrika", "Hanya Setrika · 6 Jam", 13000, 1},
            {"Setrika — Express 3 Jam", "Setrika", "Hanya Setrika · 3 Jam", 15000, 1},
            // Cuci Lipat
            {"Cuci Lipat — Reguler", "Cuci Lipat", "Cuci, Kering, Lipat · 1-2 Hari", 8000, 2},
            {"Cuci Lipat — Express 12 Jam", "Cuci Lipat", "Cuci, Kering, Lipat · 12 Jam", 10000, 1},
            {"Cuci Lipat — Express 6 Jam", "Cuci Lipat", "Cuci, Kering, Lipat · 6 Jam", 13000, 1},
            {"Cuci Lipat — Express 3 Jam", "Cuci Lipat", "Cuci, Kering, Lipat · 3 Jam", 15000, 1},
            // Cuci Satuan
            {"Sprei", "Cuci Satuan", "Cuci Satuan · 1-2 Hari", 12000, 2},
            {"Selimut", "Cuci Satuan", "Cuci Satuan · 1-2 Hari", 12000, 2},
            {"Kameja Dinas", "Cuci Satuan", "Cuci Satuan · 1-2 Hari", 15000, 2},
            {"Jas", "Cuci Satuan", "Cuci Satuan · 1-2 Hari", 20000, 2},
            {"Gorden", "Cuci Satuan", "Cuci Satuan · 1-2 Hari", 12000, 2},
            {"Bedcover", "Cuci Satuan", "Cuci Satuan · 1-2 Hari", 10000, 2},
            {"Kemeja Putih", "Cuci Satuan", "Cuci Satuan · 1-2 Hari", 12000, 2},
            {"Sepatu", "Cuci Satuan", "Cuci Satuan · 1-2 Hari", 20000, 2},
        }
        for _, s := range defaultServices {
            DB.Exec(`INSERT INTO services (name, category, description, price_per_kg, estimated_day) VALUES (?, ?, ?, ?, ?)`,
                s.name, s.category, s.description, s.price, s.day)
        }
        fmt.Println("Default services created")
    }

    // Migrate: update unit Cuci Satuan yang sudah ada tapi unit-nya NULL atau 'Kg' (salah)
    DB.Exec(`UPDATE services SET unit = 'Pcs' WHERE name IN ('Sprei','Selimut','Kemeja Putih','Sepatu') AND category = 'Cuci Satuan'`)
    DB.Exec(`UPDATE services SET unit = 'Set' WHERE name IN ('Kameja Dinas','Jas') AND category = 'Cuci Satuan'`)
    DB.Exec(`UPDATE services SET unit = 'Kg'  WHERE name IN ('Gorden','Bedcover') AND category = 'Cuci Satuan'`)

    // Seed Cuci Satuan jika belum ada (untuk DB yang sudah existing)
    var satuanCount int
    DB.QueryRow("SELECT COUNT(*) FROM services WHERE category = 'Cuci Satuan'").Scan(&satuanCount)
    if satuanCount == 0 {
        satuanServices := []struct {
            name, description, unit string
            price                   float64
        }{
            {"Sprei",        "Cuci Satuan · 1-2 Hari", "Pcs", 12000},
            {"Selimut",      "Cuci Satuan · 1-2 Hari", "Pcs", 12000},
            {"Kameja Dinas", "Cuci Satuan · 1-2 Hari", "Set", 15000},
            {"Jas",          "Cuci Satuan · 1-2 Hari", "Set", 20000},
            {"Gorden",       "Cuci Satuan · 1-2 Hari", "Kg",  12000},
            {"Bedcover",     "Cuci Satuan · 1-2 Hari", "Kg",  10000},
            {"Kemeja Putih", "Cuci Satuan · 1-2 Hari", "Pcs", 12000},
            {"Sepatu",       "Cuci Satuan · 1-2 Hari", "Pcs", 20000},
        }
        for _, s := range satuanServices {
            DB.Exec(`INSERT INTO services (name, category, description, price_per_kg, estimated_day, unit) VALUES (?, 'Cuci Satuan', ?, ?, 2, ?)`,
                s.name, s.description, s.price, s.unit)
        }
        fmt.Println("Cuci Satuan services seeded")
    }

    fmt.Println("Tables created successfully")
}