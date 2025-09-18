const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const app = express();
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tokobaju',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
async function testDbConnection() {
    try {
        const connection = await db.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        if (users.length === 0) {
            return res.status(403).json({ message: 'User not found' });
        }
        req.user = users[0];
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(403).json({ message: 'Invalid token' });
    }
};
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, dan password wajib diisi' });
        }
        const [existingUsers] = await db.execute(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email atau username sudah digunakan' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name || null, phone || null, address || null, 'customer']
        );
        const token = jwt.sign(
            { userId: result.insertId },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        const [newUser] = await db.execute(
            'SELECT id, username, email, full_name, phone, address, role, created_at FROM users WHERE id = ?',
            [result.insertId]
        );
        res.status(201).json({
            message: 'User berhasil dibuat',
            token,
            user: newUser[0]
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email dan password wajib diisi' });
        }
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }
        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        delete user.password;
        res.json({
            message: 'Login berhasil',
            token,
            user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.get('/api/me', authenticateToken, (req, res) => {
    const user = { ...req.user };
    delete user.password;
    res.json(user);
});
app.get('/api/products', async (req, res) => {
    try {
        const { category, search, limit, offset } = req.query;
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.stock > 0
        `;
        let params = [];
        if (category) {
            query += ' AND p.category_id = ?';
            params.push(category);
        }
        if (search) {
            query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY p.created_at DESC';
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
            if (offset) {
                query += ' OFFSET ?';
                params.push(parseInt(offset));
            }
        }
        const [products] = await db.execute(query, params);
        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.get('/api/products/:id', async (req, res) => {
    try {
        const [products] = await db.execute(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
            [req.params.id]
        );
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(products[0]);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await db.execute(`
            SELECT c.*, COUNT(p.id) as product_count 
            FROM categories c 
            LEFT JOIN products p ON c.id = p.category_id AND p.stock > 0
            GROUP BY c.id 
            ORDER BY c.name
        `);
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const [cartItems] = await db.execute(`
            SELECT c.*, p.name, p.price, p.image_url, p.stock,
                   (c.quantity * p.price) as subtotal
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [req.user.id]);
        const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        res.json({
            items: cartItems,
            total: total,
            count: cartItems.length
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.post('/api/cart', authenticateToken, async (req, res) => {
    try {
        const { product_id, quantity = 1, size } = req.body;
        if (!product_id) {
            return res.status(400).json({ message: 'Product ID required' });
        }
        const [products] = await db.execute('SELECT * FROM products WHERE id = ?', [product_id]);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        if (products[0].stock < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }
        const [existingItems] = await db.execute(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ? AND size = ?',
            [req.user.id, product_id, size || '']
        );
        if (existingItems.length > 0) {
            const newQuantity = existingItems[0].quantity + quantity;
            if (products[0].stock < newQuantity) {
                return res.status(400).json({ message: 'Insufficient stock' });
            }
            await db.execute(
                'UPDATE cart SET quantity = ? WHERE id = ?',
                [newQuantity, existingItems[0].id]
            );
        } else {
            await db.execute(
                'INSERT INTO cart (user_id, product_id, quantity, size) VALUES (?, ?, ?, ?)',
                [req.user.id, product_id, quantity, size || null]
            );
        }
        res.json({ message: 'Item added to cart' });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.put('/api/cart/:id', authenticateToken, async (req, res) => {
    try {
        const { quantity } = req.body;
        const cartId = req.params.id;
        if (quantity <= 0) {
            return res.status(400).json({ message: 'Quantity must be greater than 0' });
        }
        const [cartItems] = await db.execute(
            'SELECT c.*, p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.id = ? AND c.user_id = ?',
            [cartId, req.user.id]
        );
        if (cartItems.length === 0) {
            return res.status(404).json({ message: 'Cart item not found' });
        }
        if (cartItems[0].stock < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }
        await db.execute('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, cartId]);
        res.json({ message: 'Cart updated' });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.delete('/api/cart/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.execute(
            'DELETE FROM cart WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ message: 'Cart item not found' });
        }
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.post('/api/orders', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { shipping_address } = req.body;
        if (!shipping_address) {
            return res.status(400).json({ message: 'Shipping address required' });
        }
        const [cartItems] = await connection.execute(`
            SELECT c.*, p.price, p.stock
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `, [req.user.id]);
        if (cartItems.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    message: `Insufficient stock for product ID ${item.product_id}`
                });
            }
        }
        const total_amount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const [orderResult] = await connection.execute(
            'INSERT INTO orders (user_id, total_amount, shipping_address) VALUES (?, ?, ?)',
            [req.user.id, total_amount, shipping_address]
        );
        const orderId = orderResult.insertId;
        for (const item of cartItems) {
            await connection.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price, item.size]
            );
            await connection.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }
        await connection.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

        await connection.commit();

        res.status(201).json({
            message: 'Order created successfully',
            order_id: orderId,
            total_amount
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
});
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const [orders] = await db.execute(`
            SELECT o.*, COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.order_date DESC
        `, [req.user.id]);
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const [items] = await db.execute(`
            SELECT oi.*, p.name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);
        const order = orders[0];
        order.items = items;
        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.get('/admin/*', (req, res) => {
    const requestedFile = req.params[0];
    const filePath = path.join(__dirname, 'admin', requestedFile);
    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        res.sendFile(filePath);
        res.redirect('/admin/login.html');
    }
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        await testDbConnection();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📱 Admin Panel: http://localhost:${PORT}/admin`);
            console.log(`🏪 Website: http://localhost:${PORT}`);
            console.log(`📊 API Base: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    await db.end();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    await db.end();
    process.exit(0);
});