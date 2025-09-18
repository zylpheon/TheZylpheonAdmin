let allUsers = [];
let filteredUsers = [];
let currentUserSort = { field: 'created_at', direction: 'desc' };
let userPagination = null;
async function loadUsersData() {
    try {
        showLoading('Memuat data pengguna...');
        const response = await makeAdminRequest('/users');
        if (response.ok) {
            const data = await response.json();
            allUsers = data.users || data;
            filteredUsers = [...allUsers];
            userPagination = new Pagination(filteredUsers.length, 10);
            displayUsers();
            updateUserPaginationUI();
        } else {
            throw new Error('Gagal memuat data pengguna');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Gagal memuat data pengguna: ' + error.message, 'error');
        document.getElementById('usersTableBody').innerHTML =
            '<tr><td colspan="6" class="text-center text-gray-400 py-8">Gagal memuat data pengguna</td></tr>';
    } finally {
        hideLoading();
    }
}
function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-8">Tidak ada pengguna ditemukan</td></tr>';
        return;
    }
    const startIndex = userPagination.getCurrentOffset();
    const endIndex = startIndex + userPagination.itemsPerPage;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);
    tbody.innerHTML = pageUsers.map(user => {
        const roleInfo = getUserRoleInfo(user.role);
        return `
            <tr class="hover:bg-gray-700 transition-colors">
                <td>
                    <div>
                        <p class="font-medium text-white">${escapeHtml(user.username || 'N/A')}</p>
                        <p class="text-sm text-gray-400">${escapeHtml(user.full_name || '')}</p>
                    </div>
                </td>
                <td>
                    <p class="text-gray-300">${escapeHtml(user.email)}</p>
                </td>
                <td>
                    <p class="text-gray-300">${escapeHtml(user.phone || 'Tidak ada')}</p>
                </td>
                <td>
                    <span class="px-3 py-1 rounded-full text-sm ${roleInfo.class}">
                        ${roleInfo.text}
                    </span>
                </td>
                <td>
                    <span class="text-sm text-gray-400">
                        ${formatDate(user.created_at)}
                    </span>
                </td>
                <td>
                    <div class="flex space-x-2">
                        <button onclick="viewUserDetails(${user.id})" 
                                class="text-blue-400 hover:text-blue-300 transition-colors" 
                                title="Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editUserRole(${user.id})" 
                                class="text-green-400 hover:text-green-300 transition-colors" 
                                title="Edit Role">
                            <i class="fas fa-user-cog"></i>
                        </button>
                        ${user.role !== 'admin' ? `
                            <button onclick="deleteUser(${user.id})" 
                                    class="text-red-400 hover:text-red-300 transition-colors" 
                                    title="Hapus">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
function getUserRoleInfo(role) {
    const roleMap = {
        'admin': { class: 'bg-purple-500/20 text-purple-400', text: 'Admin' },
        'customer': { class: 'bg-blue-500/20 text-blue-400', text: 'Customer' }
    };
    return roleMap[role] || { class: 'bg-gray-500/20 text-gray-400', text: role };
}
function updateUserPaginationUI() {
    const container = document.getElementById('userPaginationContainer');
    if (userPagination && userPagination.totalPages > 1) {
        container.innerHTML = createPagination(userPagination, 'goToUserPage');
    } else {
        container.innerHTML = '';
    }
}
function goToUserPage(page) {
    if (userPagination.goToPage(page)) {
        displayUsers();
        updateUserPaginationUI();
    }
}
function sortUsers(field) {
    if (currentUserSort.field === field) {
        currentUserSort.direction = currentUserSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentUserSort.field = field;
        currentUserSort.direction = 'asc';
    }
    filteredUsers = sortTable(filteredUsers, field, currentUserSort.direction);
    userPagination = new Pagination(filteredUsers.length, 10);
    displayUsers();
    updateUserPaginationUI();
}
function handleUserSearch() {
    const searchTerm = document.getElementById('userSearchInput').value;
    applyUserFilters();
}
function handleUserRoleFilter() {
    applyUserFilters();
}
function applyUserFilters() {
    let filtered = [...allUsers];
    const searchTerm = document.getElementById('userSearchInput').value;
    if (searchTerm) {
        filtered = filterTable(filtered, searchTerm, ['username', 'full_name', 'email', 'phone']);
    }
    const roleFilter = document.getElementById('userRoleFilter').value;
    if (roleFilter) {
        filtered = filtered.filter(user => user.role === roleFilter);
    }
    filteredUsers = filtered;
    userPagination = new Pagination(filteredUsers.length, 10);
    displayUsers();
    updateUserPaginationUI();
}
async function viewUserDetails(userId) {
    try {
        showLoading('Memuat detail pengguna...');
        const response = await makeAdminRequest(`/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            showUserDetailsModal(user);
        } else {
            throw new Error('Gagal memuat detail pengguna');
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        showNotification('Gagal memuat detail pengguna: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}
function showUserDetailsModal(user) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'userDetailsModal';
    modal.style.display = 'flex';
    const roleInfo = getUserRoleInfo(user.role);
    modal.innerHTML = `
        <div class="modal-overlay" onclick="hideModal('userDetailsModal')"></div>
        <div class="bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold gradient-text">Detail Pengguna</h3>
                <button onclick="hideModal('userDetailsModal')" class="text-gray-400 hover:text-white text-2xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-white mb-3">Informasi Akun</h4>
                    <div class="space-y-2 text-sm">
                        <p><span class="text-gray-400">Username:</span> <span class="text-white">${escapeHtml(user.username || 'N/A')}</span></p>
                        <p><span class="text-gray-400">Email:</span> <span class="text-white">${escapeHtml(user.email)}</span></p>
                        <p><span class="text-gray-400">Role:</span> <span class="px-2 py-1 rounded text-xs ${roleInfo.class}">${roleInfo.text}</span></p>
                        <p><span class="text-gray-400">Bergabung:</span> <span class="text-white">${formatDate(user.created_at)}</span></p>
                    </div>
                </div>
                <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-white mb-3">Informasi Pribadi</h4>
                    <div class="space-y-2 text-sm">
                        <p><span class="text-gray-400">Nama Lengkap:</span> <span class="text-white">${escapeHtml(user.full_name || 'Tidak ada')}</span></p>
                        <p><span class="text-gray-400">Telepon:</span> <span class="text-white">${escapeHtml(user.phone || 'Tidak ada')}</span></p>
                    </div>
                </div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 mb-6">
                <h4 class="text-lg font-semibold text-white mb-3">Alamat</h4>
                <p class="text-gray-300">${escapeHtml(user.address || 'Alamat tidak tersedia')}</p>
            </div>
            <div class="bg-gray-700 rounded-lg p-4">
                <h4 class="text-lg font-semibold text-white mb-3">Statistik</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-purple-400">${user.total_orders || 0}</p>
                        <p class="text-sm text-gray-400">Total Pesanan</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-green-400">Rp ${formatNumber(user.total_spent || 0)}</p>
                        <p class="text-sm text-gray-400">Total Belanja</p>
                    </div>
                </div>
            </div>
            <div class="flex justify-end space-x-4 pt-6 border-t border-gray-600 mt-6">
                <button onclick="editUserRole(${user.id})" class="btn-primary">
                    <i class="fas fa-user-cog mr-2"></i>
                    Edit Role
                </button>
                <button onclick="hideModal('userDetailsModal')" class="btn-secondary">
                    Tutup
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}
async function editUserRole(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    const roleOptions = [
        { value: 'customer', text: 'Customer' },
        { value: 'admin', text: 'Admin' }
    ];
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'roleModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="hideModal('roleModal')"></div>
        <div class="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 relative z-10">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold gradient-text">Edit Role Pengguna</h3>
                <button onclick="hideModal('roleModal')" class="text-gray-400 hover:text-white text-xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="roleForm" onsubmit="handleRoleUpdate(event, ${userId})">
                <div class="mb-4">
                    <p class="text-sm text-gray-400 mb-2">Pengguna</p>
                    <p class="text-white font-medium mb-4">${escapeHtml(user.username || user.full_name || 'N/A')}</p>
                    <p class="text-sm text-gray-400">${escapeHtml(user.email)}</p>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">Role Baru</label>
                    <select name="role" class="admin-input w-full" required>
                        ${roleOptions.map(option => `
                            <option value="${option.value}" ${user.role === option.value ? 'selected' : ''}>
                                ${option.text}
                            </option>
                        `).join('')}
                    </select>
                    <p class="text-xs text-yellow-400 mt-2">
                        <i class="fas fa-warning mr-1"></i>
                        Hati-hati saat mengubah role pengguna!
                    </p>
                </div>
                <div class="flex justify-end space-x-4">
                    <button type="button" onclick="hideModal('roleModal')" class="btn-secondary">
                        Batal
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save mr-2"></i>
                        Update Role
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}
async function handleRoleUpdate(e, userId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newRole = formData.get('role');
    try {
        showLoading('Mengupdate role...');
        const response = await makeAdminRequest(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });
        if (response.ok) {
            showNotification('Role pengguna berhasil diupdate', 'success');
            hideModal('roleModal');
            hideModal('userDetailsModal');
            loadUsersData();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Gagal mengupdate role');
        }
    } catch (error) {
        console.error('Error updating role:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}
function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    if (user.role === 'admin') {
        showNotification('Tidak dapat menghapus pengguna admin', 'error');
        return;
    }
    showConfirmDialog(
        `Apakah Anda yakin ingin menghapus pengguna "${user.username || user.full_name}"? Tindakan ini tidak dapat dibatalkan.`,
        async () => {
            try {
                showLoading('Menghapus pengguna...');
                const response = await makeAdminRequest(`/users/${userId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    showNotification('Pengguna berhasil dihapus', 'success');
                    loadUsersData();
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Gagal menghapus pengguna');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                showNotification('Error: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    );
}
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
if (typeof window !== 'undefined') {
    window.loadUsersData = loadUsersData;
    window.viewUserDetails = viewUserDetails;
    window.editUserRole = editUserRole;
    window.deleteUser = deleteUser;
    window.handleRoleUpdate = handleRoleUpdate;
    window.sortUsers = sortUsers;
    window.handleUserSearch = handleUserSearch;
    window.handleUserRoleFilter = handleUserRoleFilter;
    window.goToUserPage = goToUserPage;
}