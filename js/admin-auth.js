function checkAdminAuth() {
    const token = getAuthToken();
    const admin = getCurrentAdmin();
    if (!token || !admin) {
        return false;
    }
    if (admin.role !== 'admin') {
        console.warn('User does not have admin privileges');
        handleLogout();
        return false;
    }
    return true;
}
async function handleAdminLogin(email, password) {
    try {
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
                throw new Error('Akses ditolak. Hanya admin yang dapat masuk.');
            }
            setAuthToken(data.token);
            setCurrentAdmin(data.user);
            return {
                success: true,
                user: data.user
            };
        } else {
            throw new Error(data.message || 'Login gagal');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        throw error;
    }
}
function handleLogout() {
    removeAuthToken();
    currentAdmin = null;
    sessionStorage.clear();
    if (window.location.pathname !== '/admin/login.html') {
        window.location.href = 'login.html';
    }
}
function setupAutoLogout() {
    const token = getAuthToken();
    if (!token) return;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        if (expirationTime <= currentTime) {
            handleLogout();
            return;
        }
        const timeUntilExpiration = expirationTime - currentTime;
        setTimeout(() => {
            showNotification('Sesi telah berakhir. Silakan login kembali.', 'warning');
            handleLogout();
        }, timeUntilExpiration);
    } catch (error) {
        console.error('Error parsing token:', error);
        handleLogout();
    }
}
function hasPermission(action) {
    if (!currentAdmin) return false;
    return currentAdmin.role === 'admin';
}
function requireAdmin() {
    if (!checkAdminAuth()) {
        window.location.href = 'login.html';
        return false;
    }

    setupAutoLogout();
    return true;
}
if (typeof window !== 'undefined') {
    window.checkAdminAuth = checkAdminAuth;
    window.handleAdminLogin = handleAdminLogin;
    window.handleLogout = handleLogout;
    window.hasPermission = hasPermission;
    window.requireAdmin = requireAdmin;
    document.addEventListener('DOMContentLoaded', () => {
        if (getAuthToken()) {
            setupAutoLogout();
        }
    });
}