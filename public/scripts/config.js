let currentAdmin = null;
let dashboardData = {
    products: [],
    categories: [],
    orders: [],
    users: [],
    stats: {
        totalProducts: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0
    }
};
const API_BASE = 'http://localhost:3000/api';
const ADMIN_ENDPOINTS = {
    login: `${API_BASE}/admin/login`,
    products: `${API_BASE}/admin/products`,
    createProduct: `${API_BASE}/admin/products`,
    updateProduct: (id) => `${API_BASE}/admin/products/${id}`,
    deleteProduct: (id) => `${API_BASE}/admin/products/${id}`,
    categories: `${API_BASE}/admin/categories`,
    createCategory: `${API_BASE}/admin/categories`,
    updateCategory: (id) => `${API_BASE}/admin/categories/${id}`,
    deleteCategory: (id) => `${API_BASE}/admin/categories/${id}`,
    orders: `${API_BASE}/admin/orders`,
    updateOrderStatus: (id) => `${API_BASE}/admin/orders/${id}/status`,
    orderDetails: (id) => `${API_BASE}/admin/orders/${id}`,
    users: `${API_BASE}/admin/users`,
    updateUserRole: (id) => `${API_BASE}/admin/users/${id}/role`,
    deleteUser: (id) => `${API_BASE}/admin/users/${id}`,
    dashboard: `${API_BASE}/admin/dashboard`,
    salesReport: `${API_BASE}/admin/reports/sales`,
    productReport: `${API_BASE}/admin/reports/products`,
    userReport: `${API_BASE}/admin/reports/users`
};
let currentPage = 'dashboard';
const CHART_COLORS = {
    primary: '#7c3aed',
    secondary: '#ec4899',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6'
};
const PAGINATION = {
    itemsPerPage: 10,
    currentPage: 1
};
const ORDER_STATUSES = {
    'pending': { label: 'Menunggu', color: 'warning', icon: 'clock' },
    'processing': { label: 'Diproses', color: 'info', icon: 'cog' },
    'shipped': { label: 'Dikirim', color: 'purple', icon: 'truck' },
    'delivered': { label: 'Selesai', color: 'success', icon: 'check' },
    'cancelled': { label: 'Dibatalkan', color: 'danger', icon: 'times' }
};
const PRODUCT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const USER_ROLES = {
    'customer': { label: 'Customer', color: 'info' },
    'admin': { label: 'Administrator', color: 'purple' }
};
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}
const AdminStorage = {
    setAdmin: (adminData) => {
        localStorage.setItem('currentAdmin', JSON.stringify(adminData));
        localStorage.setItem('adminToken', adminData.token);
        currentAdmin = adminData;
    },
    getAdmin: () => {
        const adminData = localStorage.getItem('currentAdmin');
        const token = localStorage.getItem('adminToken');
        if (adminData && token) {
            currentAdmin = JSON.parse(adminData);
            return currentAdmin;
        }
        return null;
    },
    removeAdmin: () => {
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('adminToken');
        currentAdmin = null;
    },
    isLoggedIn: () => {
        return currentAdmin !== null && localStorage.getItem('adminToken') !== null;
    }
};
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="flex items-start space-x-3">
            <i class="fas fa-${icon} text-lg mt-0.5"></i>
            <div class="flex-1">
                <p class="font-medium">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-white ml-4">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(notification);
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
}
function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}
function setLoading(elementId, isLoading = true) {
    const element = document.getElementById(elementId);
    if (!element) return;
    if (isLoading) {
        element.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="loading-spinner"></div>
                <span class="ml-3 text-gray-400">Loading...</span>
            </div>
        `;
    }
}
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}
function navigateToPage(pageName) {
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetContent = document.getElementById(`${pageName}-content`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    const pageTitles = {
        'dashboard': 'Dashboard',
        'products': 'Manajemen Produk',
        'categories': 'Manajemen Kategori',
        'orders': 'Manajemen Pesanan',
        'users': 'Manajemen Pengguna',
        'reports': 'Laporan'
    };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && pageTitles[pageName]) {
        pageTitle.textContent = pageTitles[pageName];
    }
    currentPage = pageName;
    loadPageData(pageName);
}
async function loadPageData(pageName) {
    try {
        switch (pageName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'products':
                await loadProductsPage();
                break;
            case 'categories':
                await loadCategoriesPage();
                break;
            case 'orders':
                await loadOrdersPage();
                break;
            case 'users':
                await loadUsersPage();
                break;
            case 'reports':
                await loadReportsPage();
                break;
        }
    } catch (error) {
        console.error(`Error loading ${pageName} data:`, error);
        showNotification(`Gagal memuat data ${pageName}`, 'error');
    }
}
window.AdminConfig = {
    currentAdmin,
    dashboardData,
    API_BASE,
    ADMIN_ENDPOINTS,
    currentPage,
    CHART_COLORS,
    PAGINATION,
    ORDER_STATUSES,
    PRODUCT_SIZES,
    USER_ROLES,
    formatDate,
    formatCurrency,
    apiRequest,
    AdminStorage,
    showNotification,
    setLoading,
    openModal,
    closeModal,
    navigateToPage,
    loadPageData
};