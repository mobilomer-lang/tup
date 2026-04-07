import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import multer from "multer";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/uploads", express.static(uploadsDir));

// Database setup
const dbUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
const dbToken = process.env.TURSO_AUTH_TOKEN;
const db = createClient({ url: dbUrl, authToken: dbToken });

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer', -- 'customer', 'courier', 'admin', 'super_admin'
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Ensure is_active exists in users
  try {
    await db.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1");
  } catch (e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT DEFAULT 'Su & Tüp',
      logo_url TEXT,
      contact_phone TEXT DEFAULT '444 42 44',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Ensure contact_phone exists in settings
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN contact_phone TEXT DEFAULT '444 42 44'");
  } catch (e) {}

  // Migration: Ensure logo_url exists in settings
  try {
    await db.execute("ALTER TABLE settings ADD COLUMN logo_url TEXT");
  } catch (e) {}

  // Initialize settings if empty
  const settingsCheck = await db.execute("SELECT COUNT(*) as count FROM settings");
  if (Number(settingsCheck.rows[0].count) === 0) {
    await db.execute("INSERT INTO settings (app_name) VALUES ('Su & Tüp')");
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL, -- 'water', 'gas', 'pet'
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      deposit_category TEXT -- 'damacana', 'tup', NULL
    )
  `);

  // Migration: Ensure deposit_category exists in products
  try {
    await db.execute("ALTER TABLE products ADD COLUMN deposit_category TEXT");
  } catch (e) {}

  // Migration: Ensure is_active exists in products
  try {
    await db.execute("ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT 1");
  } catch (e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      address_text TEXT NOT NULL,
      lat REAL,
      lng REAL,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Migration: Ensure is_active exists in addresses
  try {
    await db.execute("ALTER TABLE addresses ADD COLUMN is_active BOOLEAN DEFAULT 1");
  } catch (e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      courier_id INTEGER,
      status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'on_the_way', 'delivered', 'cancelled'
      total_price REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash_on_delivery',
      address_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(courier_id) REFERENCES users(id),
      FOREIGN KEY(address_id) REFERENCES addresses(id)
    )
  `);

  // Migration: Ensure payment_method exists in orders
  try {
    await db.execute("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cash_on_delivery'");
  } catch (e) {}

  // Migration: Ensure empty container flags exist in orders
  try {
    await db.execute("ALTER TABLE orders ADD COLUMN has_empty_damacana BOOLEAN DEFAULT 0");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE orders ADD COLUMN has_empty_tup BOOLEAN DEFAULT 0");
  } catch (e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL, -- positive for addition, negative for subtraction
      type TEXT NOT NULL, -- 'sale', 'manual_adjustment', 'return'
      order_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    )
  `);

  // Migration: Ensure description exists in stock_movements
  try {
    await db.execute("ALTER TABLE stock_movements ADD COLUMN description TEXT");
  } catch (e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      gradient TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      expires_at DATETIME,
      badge TEXT,
      type TEXT DEFAULT 'general'
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_deposits (
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL, -- 'damacana', 'tup'
      count INTEGER DEFAULT 0,
      PRIMARY KEY(user_id, category),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS deposit_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL, -- positive for addition, negative for subtraction
      type TEXT NOT NULL, -- 'order_delivery', 'manual_adjustment', 'return'
      order_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    )
  `);

  // Migration: Ensure all columns exist in campaigns
  const campaignCols = [
    { name: 'gradient', type: 'TEXT' },
    { name: 'is_active', type: 'INTEGER DEFAULT 1' },
    { name: 'sort_order', type: 'INTEGER DEFAULT 0' },
    { name: 'expires_at', type: 'DATETIME' },
    { name: 'badge', type: 'TEXT' },
    { name: 'type', type: "TEXT DEFAULT 'general'" }
  ];

  for (const col of campaignCols) {
    try {
      await db.execute(`ALTER TABLE campaigns ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {}
  }

  // Seed initial campaigns if empty
  const campaignsCount = await db.execute("SELECT COUNT(*) as count FROM campaigns");
  if (Number(campaignsCount.rows[0].count) === 0) {
    await db.execute({
      sql: "INSERT INTO campaigns (title, description, image_url, gradient, badge, type, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        "DAMACANA HEDİYE", 
        "Mobilden yapacağınız her 10. siparişinizde 1 adet damacana hediye!", 
        "https://picsum.photos/seed/kardelen-banner/800/400", 
        "from-blue-900/90 via-blue-800/40 to-transparent", 
        "pH 8.30", 
        "loyalty",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      ]
    });
  }

  // Seed initial admin user if empty
  const admins = await db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
  if (Number(admins.rows[0].count) === 0) {
    const adminPassword = await bcrypt.hash("admin123", 10);
    await db.execute({
      sql: "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)",
      args: ["Admin User", "admin@sutupsiparis.com", adminPassword, "admin", "0500 000 00 00"]
    });
  }

  // Seed initial products if empty
  const products = await db.execute("SELECT COUNT(*) as count FROM products");
  if (Number(products.rows[0].count) === 0) {
    await db.execute({
      sql: "INSERT INTO products (name, category, price, stock, image_url, description) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["Damacana (19L)", "water", 12.00, 100, "https://picsum.photos/seed/water1/400/400", "Ph 8.30 alkali özelliği ve doğal zengin mineralli yapısıyla sağlıklı ve lezzetli su."]
    });
    await db.execute({
      sql: "INSERT INTO products (name, category, price, stock, image_url, description) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["Pet Şişe (0.5L x 12)", "water", 6.00, 200, "https://picsum.photos/seed/water2/400/400", "Pratik ve taze su."]
    });
    await db.execute({
      sql: "INSERT INTO products (name, category, price, stock, image_url, description) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["Mutfak Tüpü (12kg)", "gas", 120.00, 50, "https://picsum.photos/seed/gas1/400/400", "Ev tipi mutfak tüpü."]
    });
  }
}

initDb().catch(console.error);

app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

const authorize = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    next();
  };
};

// API Routes
app.post("/api/auth/register", async (req, res) => {
  const { name, phone, password, role, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userEmail = email || `${phone}@sutupsiparis.com`;
  try {
    // Check for existing soft-deleted user
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE phone = ?",
      args: [phone ?? null]
    });

    if (existing.rows.length > 0) {
      const userId = Number(existing.rows[0].id);
      await db.execute({
        sql: "UPDATE users SET name = ?, password = ?, role = ?, email = ?, is_active = 1 WHERE id = ?",
        args: [name ?? null, hashedPassword ?? null, role || 'customer', userEmail, userId]
      });
      const token = jwt.sign({ id: userId, phone, role: role || 'customer' }, JWT_SECRET);
      return res.json({ token, user: { id: userId, name, phone, role: role || 'customer', email: userEmail } });
    }

    const result = await db.execute({
      sql: "INSERT INTO users (name, phone, password, role, email) VALUES (?, ?, ?, ?, ?)",
      args: [name ?? null, phone ?? null, hashedPassword ?? null, role || 'customer', userEmail]
    });
    const userId = Number(result.lastInsertRowid);
    const token = jwt.sign({ id: userId, phone, role: role || 'customer' }, JWT_SECRET);
    res.json({ token, user: { id: userId, name, phone, role: role || 'customer', email: userEmail } });
  } catch (e) {
    console.error("Registration error:", e);
    res.status(400).json({ error: "Phone number or email already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE phone = ? AND is_active = 1",
    args: [phone ?? null]
  });
  const user = result.rows[0];
  if (user && await bcrypt.compare(password, user.password as string)) {
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  } else {
    res.status(401).json({ error: "Invalid credentials or account inactive" });
  }
});

app.get("/api/products", async (req, res) => {
  const result = await db.execute("SELECT * FROM products WHERE is_active = 1");
  res.json(result.rows);
});

app.get("/api/orders", authenticateToken, async (req: any, res) => {
  let query = "SELECT o.*, u.name as customer_name, u.phone as customer_phone, a.address_text, a.lat, a.lng FROM orders o JOIN users u ON o.user_id = u.id JOIN addresses a ON o.address_id = a.id";
  let args: any[] = [];

  if (req.user.role === 'customer') {
    query += " WHERE o.user_id = ?";
    args.push(req.user.id);
  } else if (req.user.role === 'courier') {
    query += " WHERE o.courier_id = ? OR o.status = 'pending'";
    args.push(req.user.id);
  } else if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    // Admin sees all orders, no filter needed
  }

  const result = await db.execute({ sql: query, args });
  res.json(result.rows);
});

app.get("/api/orders/:id", authenticateToken, async (req: any, res) => {
  const orderId = req.params.id;
  try {
    const orderResult = await db.execute({
      sql: "SELECT o.*, u.name as customer_name, u.phone as customer_phone, a.address_text, a.lat, a.lng FROM orders o JOIN users u ON o.user_id = u.id JOIN addresses a ON o.address_id = a.id WHERE o.id = ?",
      args: [orderId]
    });
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Sipariş bulunamadı" });
    }
    
    const itemsResult = await db.execute({
      sql: "SELECT oi.*, p.name as product_name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?",
      args: [orderId]
    });
    
    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (e) {
    console.error("Get order error:", e);
    res.status(500).json({ error: "Sipariş detayları alınırken bir hata oluştu" });
  }
});

app.post("/api/orders", authenticateToken, async (req: any, res) => {
  const { items, total_price, address_id, payment_method, has_empty_damacana, has_empty_tup } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Sepetiniz boş olamaz" });
  }

  if (!address_id) {
    return res.status(400).json({ error: "Lütfen bir adres seçin" });
  }

  try {
    const result = await db.execute({
      sql: "INSERT INTO orders (user_id, total_price, address_id, payment_method, has_empty_damacana, has_empty_tup) VALUES (?, ?, ?, ?, ?, ?)",
      args: [req.user.id, total_price ?? 0, address_id, payment_method || 'cash_at_door', has_empty_damacana ? 1 : 0, has_empty_tup ? 1 : 0]
    });
    const orderId = Number(result.lastInsertRowid);

    for (const item of items) {
      await db.execute({
        sql: "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        args: [orderId, item.product_id ?? null, item.quantity ?? 0, item.price ?? 0]
      });
    }
    res.json({ id: orderId, status: 'pending' });
  } catch (e) {
    console.error("Order creation error:", e);
    res.status(500).json({ error: "Sipariş oluşturulurken bir hata oluştu" });
  }
});

app.patch("/api/orders/:id", authenticateToken, async (req: any, res) => {
  const { status, courier_id, payment_method, total_price, has_empty_damacana, has_empty_tup } = req.body;
  const orderId = req.params.id;
  
  try {
    // If status is being updated to 'delivered', we need to check if it was already delivered
    // to avoid double stock deduction.
    if (status === 'delivered') {
      const currentOrder = await db.execute({
        sql: "SELECT status FROM orders WHERE id = ?",
        args: [orderId]
      });
      
      if (currentOrder.rows.length > 0 && currentOrder.rows[0].status !== 'delivered') {
        // Fetch order items to deduct stock
        const items = await db.execute({
          sql: "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
          args: [orderId]
        });
        
        for (const item of items.rows) {
          const productId = item.product_id as number;
          const quantity = item.quantity as number;
          
          if (productId) {
            await db.execute({
              sql: "UPDATE products SET stock = stock - ? WHERE id = ?",
              args: [quantity, productId]
            });
            
            await db.execute({
              sql: "INSERT INTO stock_movements (product_id, quantity, type, order_id) VALUES (?, ?, 'sale', ?)",
              args: [productId, -quantity, orderId]
            });

            // Deposit Logic: If product has a deposit category, we assume it's a standard exchange.
            // If the user needs to return or pay for new deposit, it should be handled separately,
            // but for now we'll just track that they have these containers.
            const product = await db.execute({
              sql: "SELECT deposit_category FROM products WHERE id = ?",
              args: [productId]
            });

            if (product.rows.length > 0 && product.rows[0].deposit_category) {
              const category = product.rows[0].deposit_category as string;
              
              // Check if user has deposit record
              const userDeposit = await db.execute({
                sql: "SELECT count FROM user_deposits WHERE user_id = ? AND category = ?",
                args: [currentOrder.rows[0].user_id, category]
              });

              if (userDeposit.rows.length === 0) {
                await db.execute({
                  sql: "INSERT INTO user_deposits (user_id, category, count) VALUES (?, ?, ?)",
                  args: [currentOrder.rows[0].user_id, category, quantity]
                });
              } else {
                await db.execute({
                  sql: "UPDATE user_deposits SET count = count + ? WHERE user_id = ? AND category = ?",
                  args: [quantity, currentOrder.rows[0].user_id, category]
                });
              }

              await db.execute({
                sql: "INSERT INTO deposit_movements (user_id, category, quantity, type, order_id, description) VALUES (?, ?, ?, 'order_delivery', ?, ?)",
                args: [currentOrder.rows[0].user_id, category, quantity, orderId, `Sipariş #${orderId} teslimatı`]
              });
            }
          }
        }

        // Handle empty container returns from the order flags
        const orderFlags = await db.execute({
          sql: "SELECT has_empty_damacana, has_empty_tup, user_id FROM orders WHERE id = ?",
          args: [orderId]
        });

        if (orderFlags.rows.length > 0) {
          const { has_empty_damacana, has_empty_tup, user_id } = orderFlags.rows[0];
          
          if (has_empty_damacana) {
            const check = await db.execute({
              sql: "SELECT count FROM user_deposits WHERE user_id = ? AND category = 'damacana'",
              args: [user_id]
            });
            if (check.rows.length === 0) {
              await db.execute({
                sql: "INSERT INTO user_deposits (user_id, category, count) VALUES (?, 'damacana', -1)",
                args: [user_id]
              });
            } else {
              await db.execute({
                sql: "UPDATE user_deposits SET count = count - 1 WHERE user_id = ? AND category = 'damacana'",
                args: [user_id]
              });
            }
            await db.execute({
              sql: "INSERT INTO deposit_movements (user_id, category, quantity, type, order_id, description) VALUES (?, 'damacana', -1, 'return', ?, ?)",
              args: [user_id, orderId, `Sipariş #${orderId} ile boş damacana iadesi`]
            });
          }
          
          if (has_empty_tup) {
            const check = await db.execute({
              sql: "SELECT count FROM user_deposits WHERE user_id = ? AND category = 'tup'",
              args: [user_id]
            });
            if (check.rows.length === 0) {
              await db.execute({
                sql: "INSERT INTO user_deposits (user_id, category, count) VALUES (?, 'tup', -1)",
                args: [user_id]
              });
            } else {
              await db.execute({
                sql: "UPDATE user_deposits SET count = count - 1 WHERE user_id = ? AND category = 'tup'",
                args: [user_id]
              });
            }
            await db.execute({
              sql: "INSERT INTO deposit_movements (user_id, category, quantity, type, order_id, description) VALUES (?, 'tup', -1, 'return', ?, ?)",
              args: [user_id, orderId, `Sipariş #${orderId} ile boş tüp iadesi`]
            });
          }
        }
      }
    }

    let sql = "UPDATE orders SET status = ?";
    let args: any[] = [status];
    
    if (courier_id !== undefined) {
      sql += ", courier_id = ?";
      args.push(courier_id === 0 ? null : courier_id);
    }

    if (payment_method) {
      sql += ", payment_method = ?";
      args.push(payment_method);
    }

    if (total_price !== undefined) {
      sql += ", total_price = ?";
      args.push(total_price);
    }

    if (has_empty_damacana !== undefined) {
      sql += ", has_empty_damacana = ?";
      args.push(has_empty_damacana ? 1 : 0);
    }

    if (has_empty_tup !== undefined) {
      sql += ", has_empty_tup = ?";
      args.push(has_empty_tup ? 1 : 0);
    }
    
    sql += " WHERE id = ?";
    args.push(orderId);
    
    await db.execute({ sql, args });
    res.json({ success: true });
  } catch (e) {
    console.error("Order update error:", e);
    res.status(500).json({ error: "Sipariş güncellenirken bir hata oluştu" });
  }
});

app.get("/api/addresses", authenticateToken, async (req: any, res) => {
  const result = await db.execute({
    sql: "SELECT * FROM addresses WHERE user_id = ? AND is_active = 1",
    args: [req.user.id]
  });
  res.json(result.rows);
});

app.post("/api/addresses", authenticateToken, async (req: any, res) => {
  const { title, address_text, lat, lng } = req.body;
  const result = await db.execute({
    sql: "INSERT INTO addresses (user_id, title, address_text, lat, lng) VALUES (?, ?, ?, ?, ?)",
    args: [req.user.id, title ?? '', address_text ?? '', lat ?? null, lng ?? null]
  });
  res.json({ 
    id: Number(result.lastInsertRowid), 
    user_id: req.user.id,
    title, 
    address_text, 
    lat, 
    lng 
  });
});

app.delete("/api/addresses/:id", authenticateToken, async (req: any, res) => {
  try {
    // Check if address is linked to any orders
    const orderCheck = await db.execute({
      sql: "SELECT COUNT(*) as count FROM orders WHERE address_id = ?",
      args: [req.params.id]
    });

    if (Number(orderCheck.rows[0].count) > 0) {
      // Soft delete if linked to orders
      await db.execute({
        sql: "UPDATE addresses SET is_active = 0 WHERE id = ? AND user_id = ?",
        args: [req.params.id, req.user.id]
      });
    } else {
      // Hard delete if not linked to any orders
      await db.execute({
        sql: "DELETE FROM addresses WHERE id = ? AND user_id = ?",
        args: [req.params.id, req.user.id]
      });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("Address deletion error:", e);
    res.status(500).json({ error: "Adres silinemedi" });
  }
});

// Settings
app.get("/api/settings", async (req, res) => {
  const result = await db.execute("SELECT * FROM settings LIMIT 1");
  res.json(result.rows[0]);
});

app.post("/api/admin/settings", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const { app_name, logo_url, contact_phone } = req.body;
  
  // Get current settings first to preserve values if not provided
  const currentResult = await db.execute("SELECT * FROM settings LIMIT 1");
  const current = currentResult.rows[0];

  await db.execute({
    sql: "UPDATE settings SET app_name = ?, logo_url = ?, contact_phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM settings LIMIT 1)",
    args: [
      app_name ?? current.app_name ?? 'Su & Tüp', 
      logo_url !== undefined ? logo_url : current.logo_url, 
      contact_phone ?? current.contact_phone ?? '444 42 44'
    ]
  });
  res.json({ success: true });
});

// Admin Users (Customers)
app.get("/api/admin/users", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const result = await db.execute("SELECT id, name, phone, role, created_at FROM users WHERE role = 'customer' AND is_active = 1");
  res.json(result.rows);
});

app.put("/api/admin/users/:id", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const { name, phone } = req.body;
  await db.execute({
    sql: "UPDATE users SET name = ?, phone = ? WHERE id = ?",
    args: [name ?? null, phone ?? null, req.params.id]
  });
  res.json({ success: true });
});

// Admin Couriers
app.get("/api/admin/couriers", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const result = await db.execute("SELECT id, name, phone, role, created_at FROM users WHERE role = 'courier' AND is_active = 1");
  res.json(result.rows);
});

app.post("/api/admin/couriers", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const { name, phone, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password || '123456', 10);
  const courierEmail = email || `${phone}@kurye.sutupsiparis.com`;
  try {
    // Check for existing soft-deleted user
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE phone = ?",
      args: [phone ?? null]
    });

    if (existing.rows.length > 0) {
      const userId = Number(existing.rows[0].id);
      await db.execute({
        sql: "UPDATE users SET name = ?, password = ?, role = 'courier', email = ?, is_active = 1 WHERE id = ?",
        args: [name ?? null, hashedPassword, courierEmail, userId]
      });
      return res.json({ success: true });
    }

    await db.execute({
      sql: "INSERT INTO users (name, phone, password, role, email) VALUES (?, ?, ?, 'courier', ?)",
      args: [name ?? null, phone ?? null, hashedPassword, courierEmail]
    });
    res.json({ success: true });
  } catch (e: any) {
    console.error("Courier creation error:", e);
    if (e.message?.includes("UNIQUE constraint failed: users.phone")) {
      res.status(400).json({ error: "Bu telefon numarası zaten kayıtlı" });
    } else if (e.message?.includes("UNIQUE constraint failed: users.email")) {
      res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı" });
    } else {
      res.status(500).json({ error: e.message || "Kurye oluşturulurken bir hata oluştu" });
    }
  }
});

app.put("/api/admin/couriers/:id", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const { name, phone } = req.body;
  await db.execute({
    sql: "UPDATE users SET name = ?, phone = ? WHERE id = ?",
    args: [name ?? null, phone ?? null, req.params.id]
  });
  res.json({ success: true });
});

app.delete("/api/admin/users/:id", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  try {
    // Check if user has orders
    const orderCheck = await db.execute({
      sql: "SELECT COUNT(*) as count FROM orders WHERE user_id = ?",
      args: [req.params.id]
    });

    if (Number(orderCheck.rows[0].count) > 0) {
      // Soft delete if user has orders
      await db.execute({
        sql: "UPDATE users SET is_active = 0 WHERE id = ? AND role = 'customer'",
        args: [req.params.id]
      });
    } else {
      // Hard delete if no orders, but delete related data first
      await db.execute({ sql: "DELETE FROM addresses WHERE user_id = ?", args: [req.params.id] });
      await db.execute({ sql: "DELETE FROM user_deposits WHERE user_id = ?", args: [req.params.id] });
      await db.execute({ sql: "DELETE FROM deposit_movements WHERE user_id = ?", args: [req.params.id] });
      await db.execute({
        sql: "DELETE FROM users WHERE id = ? AND role = 'customer'",
        args: [req.params.id]
      });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("User deletion error:", e);
    res.status(500).json({ error: "Kullanıcı silinemedi" });
  }
});

app.delete("/api/admin/couriers/:id", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  try {
    // Check if courier has orders
    const orderCheck = await db.execute({
      sql: "SELECT COUNT(*) as count FROM orders WHERE courier_id = ?",
      args: [req.params.id]
    });

    if (Number(orderCheck.rows[0].count) > 0) {
      // Soft delete if courier has orders
      await db.execute({
        sql: "UPDATE users SET is_active = 0 WHERE id = ? AND role = 'courier'",
        args: [req.params.id]
      });
    } else {
      // Hard delete if no orders
      await db.execute({
        sql: "DELETE FROM users WHERE id = ? AND role = 'courier'",
        args: [req.params.id]
      });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("Courier deletion error:", e);
    res.status(500).json({ error: "Kurye silinemedi" });
  }
});

// Admin Products
app.get("/api/admin/products", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM products ORDER BY id DESC");
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Ürünler getirilemedi" });
  }
});

app.post("/api/admin/products", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const { name, category, price, stock, image_url, description } = req.body;
  try {
    const result = await db.execute({
      sql: "INSERT INTO products (name, category, price, stock, image_url, description) VALUES (?, ?, ?, ?, ?, ?)",
      args: [name ?? null, category ?? null, price ?? 0, stock || 0, image_url ?? null, description ?? null]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (e) {
    res.status(500).json({ error: "Ürün oluşturulamadı" });
  }
});

app.put("/api/admin/products/:id", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const { name, category, price, stock, image_url, description, is_active } = req.body;
  try {
    // Get current stock to calculate difference
    const currentProduct = await db.execute({
      sql: "SELECT stock FROM products WHERE id = ?",
      args: [req.params.id]
    });
    
    const oldStock = currentProduct.rows[0]?.stock as number || 0;
    const newStock = stock ?? 0;
    const diff = newStock - oldStock;

    await db.execute({
      sql: "UPDATE products SET name = ?, category = ?, price = ?, stock = ?, image_url = ?, description = ?, is_active = ? WHERE id = ?",
      args: [
        name ?? null, 
        category ?? null, 
        price ?? 0, 
        newStock, 
        image_url ?? null, 
        description ?? null, 
        is_active === undefined ? 1 : is_active, 
        req.params.id
      ]
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Ürün güncellenemedi" });
  }
});

app.post("/api/admin/products/:id/stock", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const { quantity, type, description } = req.body;
  const productId = req.params.id;

  try {
    await db.execute({
      sql: "UPDATE products SET stock = stock + ? WHERE id = ?",
      args: [quantity, productId]
    });

    await db.execute({
      sql: "INSERT INTO stock_movements (product_id, quantity, type, description) VALUES (?, ?, ?, ?)",
      args: [productId, quantity, type, description ?? null]
    });

    res.json({ success: true });
  } catch (e) {
    console.error("Stock adjustment error:", e);
    res.status(500).json({ error: "Stok güncellenemedi" });
  }
});

// Deposit Endpoints
app.get("/api/user/deposits", authenticateToken, async (req: any, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT category, count FROM user_deposits WHERE user_id = ?",
      args: [req.user.id]
    });
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Depozito bilgileri alınamadı" });
  }
});

app.get("/api/admin/users/:id/deposits", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT category, count FROM user_deposits WHERE user_id = ?",
      args: [req.params.id]
    });
    const movements = await db.execute({
      sql: "SELECT * FROM deposit_movements WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [req.params.id]
    });
    res.json({ balances: result.rows, movements: movements.rows });
  } catch (e) {
    res.status(500).json({ error: "Kullanıcı depozito bilgileri alınamadı" });
  }
});

app.post("/api/admin/users/:id/deposits", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  const { category, quantity, type, description } = req.body;
  const userId = req.params.id;

  try {
    // Check if record exists
    const check = await db.execute({
      sql: "SELECT count FROM user_deposits WHERE user_id = ? AND category = ?",
      args: [userId, category]
    });

    if (check.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO user_deposits (user_id, category, count) VALUES (?, ?, ?)",
        args: [userId, category, quantity]
      });
    } else {
      await db.execute({
        sql: "UPDATE user_deposits SET count = count + ? WHERE user_id = ? AND category = ?",
        args: [quantity, userId, category]
      });
    }

    await db.execute({
      sql: "INSERT INTO deposit_movements (user_id, category, quantity, type, description) VALUES (?, ?, ?, ?, ?)",
      args: [userId, category, quantity, type || 'manual_adjustment', description || null]
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Depozito güncellenemedi" });
  }
});

app.get("/api/admin/products/:id/movements", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Get sales movements (from order_items and orders)
    const sales = await db.execute({
      sql: `
        SELECT 
          oi.quantity, 
          oi.price, 
          o.payment_method, 
          o.created_at, 
          u.name as customer_name,
          'sale' as type
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN users u ON o.user_id = u.id
        WHERE oi.product_id = ?
        ORDER BY o.created_at DESC
      `,
      args: [productId]
    });

    // Get stock movements (manual adjustments)
    const stockMovements = await db.execute({
      sql: `
        SELECT 
          quantity, 
          type, 
          description,
          created_at,
          NULL as customer_name,
          NULL as payment_method
        FROM stock_movements 
        WHERE product_id = ? AND type != 'sale'
        ORDER BY created_at DESC
      `,
      args: [productId]
    });

    res.json({
      sales: sales.rows,
      stock: stockMovements.rows
    });
  } catch (e) {
    console.error("Failed to fetch movements:", e);
    res.status(500).json({ error: "Hareketler getirilemedi" });
  }
});

app.delete("/api/admin/products/:id", authenticateToken, authorize(["admin", "super_admin"]), async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM products WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Ürün silinemedi" });
  }
});

// Admin Stats
app.get("/api/admin/stats", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.sendStatus(403);
  
  const totalOrders = await db.execute("SELECT COUNT(*) as count FROM orders");
  const totalRevenue = await db.execute("SELECT SUM(total_price) as total FROM orders WHERE status = 'delivered'");
  const topProducts = await db.execute(`
    SELECT p.name, SUM(oi.quantity) as total_sold 
    FROM order_items oi 
    JOIN products p ON oi.product_id = p.id 
    GROUP BY p.id 
    ORDER BY total_sold DESC 
    LIMIT 5
  `);
  
  res.json({
    totalOrders: totalOrders.rows[0].count,
    totalRevenue: totalRevenue.rows[0].total || 0,
    topProducts: topProducts.rows
  });
});

// WebSocket for real-time tracking
const wss = new WebSocketServer({ noServer: true });
const courierLocations = new Map<number, { lat: number, lng: number }>();

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'update_location' && message.courierId) {
        courierLocations.set(message.courierId, { lat: message.lat, lng: message.lng });
        // Broadcast to all clients (simplified)
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'courier_location', courierId: message.courierId, lat: message.lat, lng: message.lng }));
          }
        });
      }
    } catch (e) {}
  });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Campaigns
app.get("/api/campaigns", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM campaigns WHERE is_active = 1 ORDER BY sort_order ASC");
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

app.get("/api/admin/campaigns", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.sendStatus(403);
  try {
    const result = await db.execute("SELECT * FROM campaigns ORDER BY sort_order ASC");
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

app.post("/api/admin/campaigns", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.sendStatus(403);
  const { title, description, image_url, gradient, badge, type, expires_at, is_active, sort_order } = req.body;
  try {
    const result = await db.execute({
      sql: "INSERT INTO campaigns (title, description, image_url, gradient, badge, type, expires_at, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        title ?? null, 
        description ?? null, 
        image_url ?? null, 
        gradient ?? null, 
        badge ?? null, 
        type ?? 'info', 
        expires_at ?? null, 
        is_active || 1, 
        sort_order || 0
      ]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (e) {
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// Campaign Image Upload
app.post("/api/admin/upload", authenticateToken, upload.single("image"), (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.sendStatus(403);
  if (!req.file) {
    return res.status(400).json({ error: "Dosya yüklenemedi" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

app.put("/api/admin/campaigns/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.sendStatus(403);
  const { title, description, image_url, gradient, badge, type, expires_at, is_active, sort_order } = req.body;
  try {
    await db.execute({
      sql: "UPDATE campaigns SET title = ?, description = ?, image_url = ?, gradient = ?, badge = ?, type = ?, expires_at = ?, is_active = ?, sort_order = ? WHERE id = ?",
      args: [
        title ?? null, 
        description ?? null, 
        image_url ?? null, 
        gradient ?? null, 
        badge ?? null, 
        type ?? 'info', 
        expires_at ?? null, 
        is_active ?? 1, 
        sort_order ?? 0, 
        req.params.id
      ]
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

app.delete("/api/admin/campaigns/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.sendStatus(403);
  try {
    await db.execute({
      sql: "DELETE FROM campaigns WHERE id = ?",
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
