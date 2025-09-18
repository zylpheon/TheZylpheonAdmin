const API_BASE = 'http://localhost:3000/api';
const ADMIN_API_BASE = `${API_BASE}/admin`;
let currentAdmin = null;
let isLoading = false;
function getAuthToken() {
    return localStorage.getItem('adminToken');
}
function setAuthToken(token) {
    localStorage.setItem('adminToken', token);
}
function removeAuthToken() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
}
function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}
function getCurrentAdmin() {
    const adminData = localStorage.getItem('adminUser');
    return adminData ? JSON.parse(adminData) : null;
}
function setCurrentAdmin(admin) {
    currentAdmin = admin;
    localStorage.setItem('adminUser', JSON.stringify(admin));
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = admin.username || admin.full_name || 'Admin';
    }
}
function initAdminConfig() {
    currentAdmin = getCurrentAdmin();
    if (currentAdmin) {
        setCurrentAdmin(currentAdmin);
    }
}
async function makeAdminRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        }
    };
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    try {
        const response = await fetch(`${ADMIN_API_BASE}${endpoint}`, finalOptions);
        if (response.status === 401) {
            handleLogout();
            window.location.href = 'login.html';
            return null;
        }
        if (response.status === 503) {
            throw new Error('Server tidak tersedia');
        }
        return response;
    } catch (error) {
        console.error('Admin API request failed:', error);
        throw error;
    }
}
class Pagination {
    constructor(totalItems, itemsPerPage = 10) {
        this.totalItems = totalItems;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalPages = Math.ceil(totalItems / itemsPerPage);
    }
    getCurrentOffset() {
        return (this.currentPage - 1) * this.itemsPerPage;
    }
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            return true;
        }
        return false;
    }
    nextPage() {
        return this.goToPage(this.currentPage + 1);
    }
    prevPage() {
        return this.goToPage(this.currentPage - 1);
    }
    getPageInfo() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            totalItems: this.totalItems,
            itemsPerPage: this.itemsPerPage,
            hasNext: this.currentPage < this.totalPages,
            hasPrev: this.currentPage > 1
        };
    }
}
function formatDate(dateString) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}
function validateRequired(value, fieldName) {
    if (!value || value.trim() === '') {
        throw new Error(`${fieldName} wajib diisi`);
    }
    return true;
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Format email tidak valid');
    }
    return true;
}
function validatePositiveNumber(value, fieldName) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
        throw new Error(`${fieldName} harus berupa angka positif`);
    }
    return true;
}
function validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
        throw new Error('Format file harus JPEG, PNG, JPG, atau WebP');
    }

    if (file.size > maxSize) {
        throw new Error('Ukuran file maksimal 5MB');
    }

    return true;
}
function getAdminSettings() {
    const settings = localStorage.getItem('adminSettings');
    return settings ? JSON.parse(settings) : {
        itemsPerPage: 10,
        theme: 'dark',
        autoRefresh: false
    };
}
function setAdminSettings(settings) {
    localStorage.setItem('adminSettings', JSON.stringify(settings));
}
if (typeof window !== 'undefined') {
    window.AdminConfig = {
        API_BASE,
        ADMIN_API_BASE,
        getAuthToken,
        setAuthToken,
        removeAuthToken,
        getAuthHeaders,
        getCurrentAdmin,
        setCurrentAdmin,
        makeAdminRequest,
        Pagination,
        formatDate,
        formatCurrency,
        validateRequired,
        validateEmail,
        validatePositiveNumber,
        validateImageFile,
        getAdminSettings,
        setAdminSettings
    };
}
document.addEventListener('DOMContentLoaded', initAdminConfig);