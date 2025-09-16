function checkAuthStatus() {
    const admin = AdminStorage.getAdmin();
    if (admin) {
        currentAdmin = admin;
        showAdminInterface();
        updateAdminInfo();
    } else {
        showLoginModal();
    }
}
function showAdminInterface() {
    document.getElementById('loginModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}
function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function updateAdminInfo() {
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement && currentAdmin) {
        adminNameElement.textContent = currentAdmin.full_name || currentAdmin.username || 'Admin';
    }
}
async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    if (!email || !password) {
        showNotification('Email dan password harus diisi', 'error');
        return;
    }
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    try {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses...';
        submitButton.disabled = true;
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            if (data.user.role !== 'admin') {
                throw new Error('Akses ditolak. Hanya administrator yang dapat mengakses panel ini.');
            }
            AdminStorage.setAdmin({
                ...data.user,
                token: data.token
            });
            currentAdmin = data.user;
            showNotification('Login berhasil! Selamat datang, Admin.', 'success');
            showAdminInterface();
            updateAdminInfo();
            await loadDashboardData();
            document.getElementById('adminLoginForm').reset();
        } else {
            throw new Error(data.message || 'Login gagal');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        if (error.message.includes('fetch')) {
            showNotification('Tidak dapat terhubung ke server. Pastikan server berjalan.', 'error');
        } else {
            showNotification(error.message, 'error');
        }
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}
function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar dari Admin Panel?')) {
        AdminStorage.removeAdmin();
        currentAdmin = null;
        dashboardData = {
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
        showLoginModal();
        navigateToPage('dashboard');
        showNotification('Anda telah berhasil logout', 'success');
    }
}
async function verifyToken() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        return false;
    }
    try {
        const response = await fetch(`${API_BASE}/admin/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}
async function checkTokenValidity() {
    if (AdminStorage.isLoggedIn()) {
        const isValid = await verifyToken();

        if (!isValid) {
            showNotification('Sesi Anda telah berakhir. Silakan login kembali.', 'warning');
            handleLogout();
        }
    }
}
async function createDemoAdmin() {
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                email: 'admin@tokobaju.com',
                password: 'admin123',
                full_name: 'Administrator',
                phone: '08123456789',
                address: 'Yogyakarta'
            })
        });
        if (response.ok) {
            console.log('Demo admin user created successfully');
            showNotification('Demo admin user tersedia: admin@tokobaju.com / admin123', 'info');
        }
    } catch (error) {
        console.error('Error creating demo admin:', error);
    }
}
function handleUnauthorized() {
    showNotification('Sesi berakhir atau akses tidak sah. Silakan login kembali.', 'error');
    AdminStorage.removeAdmin();
    showLoginModal();
}
function initializeAuth() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
    checkAuthStatus();
    setInterval(checkTokenValidity, 5 * 60 * 1000);
    if (window.location.hostname === 'localhost') {
        setTimeout(createDemoAdmin, 1000);
    }
}
const SessionManager = {
    startSession: () => {
        const sessionStartTime = Date.now();
        localStorage.setItem('adminSessionStart', sessionStartTime.toString());
    },
    getSessionDuration: () => {
        const startTime = localStorage.getItem('adminSessionStart');
        if (startTime) {
            return Date.now() - parseInt(startTime);
        }
        return 0;
    },
    isSessionExpired: (maxDurationMs = 8 * 60 * 60 * 1000) => { // 8 hours default
        const duration = SessionManager.getSessionDuration();
        return duration > maxDurationMs;
    },
    endSession: () => {
        localStorage.removeItem('adminSessionStart');
    }
};
let lastActivity = Date.now();
function trackActivity() {
    lastActivity = Date.now();
}
function checkInactivity() {
    const inactiveTime = Date.now() - lastActivity;
    const maxInactiveTime = 30 * 60 * 1000;
    if (inactiveTime > maxInactiveTime && AdminStorage.isLoggedIn()) {
        showNotification('Anda telah tidak aktif terlalu lama. Silakan login kembali.', 'warning');
        handleLogout();
    }
}
document.addEventListener('mousedown', trackActivity);
document.addEventListener('keypress', trackActivity);
document.addEventListener('scroll', trackActivity);
setInterval(checkInactivity, 60 * 1000);
window.AdminAuth = {
    checkAuthStatus,
    handleAdminLogin,
    handleLogout,
    verifyToken,
    handleUnauthorized,
    initializeAuth,
    SessionManager,
    trackActivity
};