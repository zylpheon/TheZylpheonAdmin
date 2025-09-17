const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tokobaju',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token akses diperlukan' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const [users] = await db.execute(
            'SELECT * FROM users WHERE id = ? AND role = "admin"',
            [decoded.userId]
        );
        if (users.length === 0) {
            return res.status(403).json({ message: 'Akses ditolak. Hanya admin yang diizinkan.' });
        }
        req.user = users[0];
        next();
    } catch (error) {
        console.error('Auth verification error:', error);
        return res.status(401).json({ message: 'Token tidak valid' });
    }
};
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const [productStats] = await db.execute('SELECT COUNT(*) as total FROM products');
        const [categoryStats] = await db.execute('SELECT COUNT(*) as total FROM categories');
        const [orderStats] = await db.execute('SELECT COUNT(*) as total FROM orders');
        const [userStats] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role = "customer"');
        res.json({
            totalProducts: productStats[0].total,
            totalCategories: categoryStats[0].total,
            totalOrders: orderStats[0].total,
            totalUsers: userStats[0].total
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Gagal mengambil statistik' });
    }
});
router.get('/products', verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category, lowStock } = req.query;
        const offset = (page - 1) * limit;
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
        `;
        let conditions = [];
        let params = [];
        if (search) {
            conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            conditions.push('p.category_id = ?');
            params.push(category);
        }
        if (lowStock === 'true') {
            conditions.push('p.stock <= 10 AND p.stock > 0');
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY p.created_at DESC';
        if (limit !== 'all') {
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);
        }
        const [products] = await db.execute(query, params);
        res.json({ products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Gagal mengambil data produk' });
    }
});
router.get('/products/:id', verifyAdmin, async (req, res) => {
    try {
        const [products] = await db.execute(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
            [req.params.id]
        );
        if (products.length === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan' });
        }
        res.json(products[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Gagal mengambil data produk' });
    }
});
router.post('/products', verifyAdmin, async (req, res) => {
    try {
        const { name, description, category_id, price, stock, size, color, image_url } = req.body;
        if (!name || !price || !stock || !category_id) {
            return res.status(400).json({ message: 'Nama, harga, stok, dan kategori wajib diisi' });
        }
        const [result] = await db.execute(
            'INSERT INTO products (name, description, category_id, price, stock, size, color, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description || null, category_id, price, stock, size || null, color || null, image_url || null]
        );
        const [newProduct] = await db.execute(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
            [result.insertId]
        );
        res.status(201).json({
            message: 'Produk berhasil ditambahkan',
            product: newProduct[0]
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Gagal menambahkan produk' });
    }
});
router.put('/products/:id', verifyAdmin, async (req, res) => {
    try {
        const { name, description, category_id, price, stock, size, color, image_url } = req.body;
        const productId = req.params.id;
        if (!name || !price || stock === undefined || !category_id) {
            return res.status(400).json({ message: 'Nama, harga, stok, dan kategori wajib diisi' });
        }
        await db.execute(
            'UPDATE products SET name = ?, description = ?, category_id = ?, price = ?, stock = ?, size = ?, color = ?, image_url = ? WHERE id = ?',
            [name, description || null, category_id, price, stock, size || null, color || null, image_url || null, productId]
        );
        const [updatedProduct] = await db.execute(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
            [productId]
        );
        if (updatedProduct.length === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan' });
        }
        res.json({
            message: 'Produk berhasil diperbarui',
            product: updatedProduct[0]
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Gagal memperbarui produk' });
    }
});
router.delete('/products/:id', verifyAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        const [products] = await db.execute('SELECT * FROM products WHERE id = ?', [productId]);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan' });
        }
        const [orderItems] = await db.execute('SELECT * FROM order_items WHERE product_id = ?', [productId]);
        if (orderItems.length > 0) {
            return res.status(400).json({ message: 'Tidak dapat menghapus produk yang sudah dipesan' });
        }
        await db.execute('DELETE FROM cart WHERE product_id = ?', [productId]);
        await db.execute('DELETE FROM products WHERE id = ?', [productId]);
        res.json({ message: 'Produk berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Gagal menghapus produk' });
    }
});
router.get('/categories', verifyAdmin, async (req, res) => {
    try {
        const [categories] = await db.execute(`
            SELECT c.*, COUNT(p.id) as product_count 
            FROM categories c 
            LEFT JOIN products p ON c.id = p.category_id 
            GROUP BY c.id 
            ORDER BY c.created_at DESC
        `);
        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Gagal mengambil data kategori' });
    }
});
router.get('/categories/:id', verifyAdmin, async (req, res) => {
    try {
        const [categories] = await db.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        if (categories.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan' });
        }
        res.json(categories[0]);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Gagal mengambil data kategori' });
    }
});
router.post('/categories', verifyAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Nama kategori wajib diisi' });
        }
        const [existing] = await db.execute('SELECT * FROM categories WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Nama kategori sudah digunakan' });
        }
        const [result] = await db.execute(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description || null]
        );
        const [newCategory] = await db.execute('SELECT * FROM categories WHERE id = ?', [result.insertId]);
        res.status(201).json({
            message: 'Kategori berhasil ditambahkan',
            category: newCategory[0]
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Gagal menambahkan kategori' });
    }
});
router.put('/categories/:id', verifyAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        const categoryId = req.params.id;
        if (!name) {
            return res.status(400).json({ message: 'Nama kategori wajib diisi' });
        }
        const [existing] = await db.execute('SELECT * FROM categories WHERE name = ? AND id != ?', [name, categoryId]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Nama kategori sudah digunakan' });
        }
        await db.execute(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description || null, categoryId]
        );
        const [updatedCategory] = await db.execute('SELECT * FROM categories WHERE id = ?', [categoryId]);
        if (updatedCategory.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan' });
        }
        res.json({
            message: 'Kategori berhasil diperbarui',
            category: updatedCategory[0]
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Gagal memperbarui kategori' });
    }
});
router.delete('/categories/:id', verifyAdmin, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const [categories] = await db.execute('SELECT * FROM categories WHERE id = ?', [categoryId]);
        if (categories.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan' });
        }
        await db.execute('UPDATE products SET category_id = NULL WHERE category_id = ?', [categoryId]);
        await db.execute('DELETE FROM categories WHERE id = ?', [categoryId]);
        res.json({ message: 'Kategori berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Gagal menghapus kategori' });
    }
});
router.get('/orders', verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const offset = (page - 1) * limit;
        let query = `
            SELECT o.*, u.username as customer_name, u.email as customer_email, u.full_name as user_name, u.email as user_email,
                   COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
        `;
        let conditions = [];
        let params = [];
        if (status) {
            conditions.push('o.status = ?');
            params.push(status);
        }
        if (search) {
            conditions.push('(o.id LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' GROUP BY o.id ORDER BY o.order_date DESC';
        if (limit !== 'all') {
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);
        }
        const [orders] = await db.execute(query, params);
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Gagal mengambil data pesanan' });
    }
});
router.get('/orders/:id', verifyAdmin, async (req, res) => {
    try {
        const [orders] = await db.execute(`
            SELECT o.*, u.username as customer_name, u.email as customer_email, u.full_name as user_name, u.phone
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [req.params.id]);
        if (orders.length === 0) {
            return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
        }
        const [items] = await db.execute(`
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);
        const order = orders[0];
        order.items = items;
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Gagal mengambil data pesanan' });
    }
});
router.put('/orders/:id', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;
        if (!status) {
            return res.status(400).json({ message: 'Status wajib diisi' });
        }
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Status tidak valid' });
        }
        await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        const [updatedOrder] = await db.execute(`
            SELECT o.*, u.username as customer_name, u.email as customer_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [orderId]);
        if (updatedOrder.length === 0) {
            return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
        }
        res.json({
            message: 'Status pesanan berhasil diperbarui',
            order: updatedOrder[0]
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Gagal memperbarui status pesanan' });
    }
});
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, role, search } = req.query;
        const offset = (page - 1) * limit;
        let query = `
            SELECT u.*, 
                   COUNT(o.id) as total_orders,
                   COALESCE(SUM(o.total_amount), 0) as total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
        `;
        let conditions = [];
        let params = [];
        if (role) {
            conditions.push('u.role = ?');
            params.push(role);
        }
        if (search) {
            conditions.push('(u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' GROUP BY u.id ORDER BY u.created_at DESC';
        if (limit !== 'all') {
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);
        }
        const [users] = await db.execute(query, params);
        users.forEach(user => delete user.password);
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Gagal mengambil data pengguna' });
    }
});
router.get('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(`
            SELECT u.*, 
                   COUNT(o.id) as total_orders,
                   COALESCE(SUM(o.total_amount), 0) as total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            WHERE u.id = ?
            GROUP BY u.id
        `, [req.params.id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        const user = users[0];
        delete user.password;
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Gagal mengambil data pengguna' });
    }
});
router.put('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        const userId = req.params.id;
        if (!role) {
            return res.status(400).json({ message: 'Role wajib diisi' });
        }
        const validRoles = ['customer', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Role tidak valid' });
        }
        if (role === 'customer') {
            const [adminCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
            const [currentUser] = await db.execute('SELECT role FROM users WHERE id = ?', [userId]);
            if (currentUser[0]?.role === 'admin' && adminCount[0].count <= 1) {
                return res.status(400).json({ message: 'Tidak dapat mengubah admin terakhir' });
            }
        }
        await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        const [updatedUser] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (updatedUser.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        delete updatedUser[0].password;
        res.json({
            message: 'Role pengguna berhasil diperbarui',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Gagal memperbarui role pengguna' });
    }
});
router.delete('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }
        if (users[0].role === 'admin') {
            return res.status(400).json({ message: 'Tidak dapat menghapus pengguna admin' });
        }
        await db.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
        await db.execute('UPDATE orders SET user_id = NULL WHERE user_id = ?', [userId]);
        await db.execute('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ message: 'Pengguna berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Gagal menghapus pengguna' });
    }
});
module.exports = router;