function initializeAdminApp() {
    console.log('Initializing Admin Panel...');
    AdminAuth.initializeAuth();
    setupEventListeners();
    updateCurrentDate();
    initializeCharts();
    console.log('Admin Panel initialized successfully');
}
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page) {
                navigateToPage(page);
            }
        });
    });
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 1024) {
                if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    setupQuickActions();
    setupFormHandlers();
}
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        dateElement.textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}
async function loadDashboardData() {
    if (!AdminStorage.isLoggedIn()) {
        return;
    }
    try {
        setLoading('dashboard-content', true);
        const [products, categories, orders, users] = await Promise.all([
            loadProducts(),
            loadCategories(),
            loadOrders(),
            loadUsers()
        ]);
        updateDashboardStats({
            totalProducts: products.length,
            totalOrders: orders.length,
            totalUsers: users.length,
            totalRevenue: calculateTotalRevenue(orders)
        });
        updateRecentOrders(orders.slice(0, 5));
        updateSalesChart(orders);
        dashboardData = {
            products,
            categories,
            orders,
            users,
            stats: {
                totalProducts: products.length,
                totalOrders: orders.length,
                totalUsers: users.length,
                totalRevenue: calculateTotalRevenue(orders)
            }
        };
        document.getElementById('dashboard-content').classList.add('active');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Gagal memuat data dashboard', 'error');
        document.getElementById('dashboard-content').innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-yellow-400 mb-4"></i>
                <h3 class="text-xl font-semibold mb-2">Dashboard Tidak Tersedia</h3>
                <p class="text-gray-400 mb-6">Tidak dapat memuat data dashboard. Server mungkin offline.</p>
                <button onclick="loadDashboardData()" class="px-6 py-2 gradient-bg text-white rounded-lg hover:opacity-90">
                    <i class="fas fa-refresh mr-2"></i>Coba Lagi
                </button>
            </div>
        `;
    }
}
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Failed to load products');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        return [
            { id: 1, name: 'Demo Product 1', price: 100000, stock: 10, category_id: 1 },
            { id: 2, name: 'Demo Product 2', price: 150000, stock: 5, category_id: 2 },
            { id: 3, name: 'Demo Product 3', price: 200000, stock: 15, category_id: 1 }
        ];
    }
}
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Failed to load categories');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        return [
            { id: 1, name: 'Kemeja', description: 'Koleksi kemeja' },
            { id: 2, name: 'T-Shirt', description: 'Kaos casual' },
            { id: 3, name: 'Dress', description: 'Dress wanita' }
        ];
    }
}
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE}/orders`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Orders endpoint not available');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        return generateMockOrders();
    }
}
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Users endpoint not available');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        return generateMockUsers();
    }
}
function generateMockOrders() {
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const orders = [];
    for (let i = 1; i <= 20; i++) {
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));
        orders.push({
            id: i,
            user_id: Math.floor(Math.random() * 10) + 1,
            total_amount: (Math.floor(Math.random() * 500000) + 50000),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            order_date: orderDate.toISOString(),
            customer_name: `Customer ${i}`,
            items_count: Math.floor(Math.random() * 5) + 1
        });
    }
    return orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
}
function generateMockUsers() {
    const users = [];
    for (let i = 1; i <= 15; i++) {
        const joinDate = new Date();
        joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 100));

        users.push({
            id: i,
            username: `user${i}`,
            email: `user${i}@example.com`,
            full_name: `User ${i}`,
            role: i === 1 ? 'admin' : 'customer',
            created_at: joinDate.toISOString()
        });
    }
    return users;
}
function updateDashboardStats(stats) {
    document.getElementById('totalProducts').textContent = stats.totalProducts;
    document.getElementById('totalOrders').textContent = stats.totalOrders;
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
}
function calculateTotalRevenue(orders) {
    return orders
        .filter(order => order.status === 'delivered')
        .reduce((total, order) => total + (order.total_amount || 0), 0);
}
function updateRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Belum ada pesanan</p>';
        return;
    }
    container.innerHTML = orders.map(order => {
        const statusConfig = ORDER_STATUSES[order.status] || ORDER_STATUSES.pending;
        return `
            <div class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
                        <i class="fas fa-shopping-bag text-purple-400"></i>
                    </div>
                    <div>
                        <p class="font-medium">${order.customer_name || `Order #${order.id}`}</p>
                        <p class="text-sm text-gray-400">${formatDate(order.order_date)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-medium">${formatCurrency(order.total_amount || 0)}</p>
                    <span class="badge badge-${statusConfig.color}">${statusConfig.label}</span>
                </div>
            </div>
        `;
    }).join('');
}
let salesChart = null;
function initializeCharts() {
    const salesCanvas = document.getElementById('salesChart');
    if (salesCanvas) {
        const ctx = salesCanvas.getContext('2d');

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Penjualan',
                    data: [],
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: `${CHART_COLORS.primary}20`,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#9ca3af'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#9ca3af',
                            callback: function (value) {
                                return 'Rp ' + value.toLocaleString('id-ID');
                            }
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        }
                    }
                }
            }
        });
    }
}
function updateSalesChart(orders) {
    if (!salesChart) return;
    const monthlyData = {};
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 12; i++) {
        const monthName = new Date(currentYear, i, 1).toLocaleString('id-ID', { month: 'short' });
        monthlyData[monthName] = 0;
    }
    orders.forEach(order => {
        if (order.status === 'delivered') {
            const orderDate = new Date(order.order_date);
            if (orderDate.getFullYear() === currentYear) {
                const monthName = orderDate.toLocaleString('id-ID', { month: 'short' });
                monthlyData[monthName] += order.total_amount || 0;
            }
        }
    });
    const labels = Object.keys(monthlyData);
    const data = Object.values(monthlyData);
    salesChart.data.labels = labels;
    salesChart.data.datasets[0].data = data;
    salesChart.update();
}
function setupQuickActions() {
    window.showAddProductModal = function () {
        loadCategoriesForForm();
        openModal('addProductModal');
    };

    window.generateReport = function () {
        navigateToPage('reports');
    };
}
async function loadCategoriesForForm() {
    const categorySelect = document.getElementById('productCategory');
    if (!categorySelect) return;

    try {
        const categories = await loadCategories();
        categorySelect.innerHTML = '<option value="">Pilih Kategori</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading categories for form:', error);
    }
}
function setupFormHandlers() {
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }
}
async function handleAddProduct(e) {
    e.preventDefault();
    const formData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        category_id: parseInt(document.getElementById('productCategory').value),
        stock: parseInt(document.getElementById('productStock').value),
        size: document.getElementById('productSize').value,
        color: document.getElementById('productColor').value,
        description: document.getElementById('productDescription').value,
        image_url: document.getElementById('productImage').value
    };
    try {
        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(formData)
        });
        if (response.ok) {
            showNotification('Produk berhasil ditambahkan!', 'success');
            closeModal('addProductModal');
            await loadDashboardData();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Gagal menambahkan produk');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification(error.message || 'Gagal menambahkan produk', 'error');
    }
}
window.initializeAdminApp = initializeAdminApp;
window.loadDashboardData = loadDashboardData;
window.navigateToPage = navigateToPage;
window.showAddProductModal = setupQuickActions().showAddProductModal;
window.generateReport = setupQuickActions().generateReport;
window.closeModal = closeModal;
window.openModal = openModal;