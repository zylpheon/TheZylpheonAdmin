let allOrders = [];
let filteredOrders = [];
let currentOrderSort = { field: 'order_date', direction: 'desc' };
let orderPagination = null;
async function loadOrdersData() {
    try {
        showLoading('Memuat data pesanan...');
        const response = await makeAdminRequest('/orders');
        if (response.ok) {
            const data = await response.json();
            allOrders = data.orders || data;
            filteredOrders = [...allOrders];
            orderPagination = new Pagination(filteredOrders.length, 10);
            displayOrders();
            updateOrderPaginationUI();
        } else {
            throw new Error('Gagal memuat data pesanan');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Gagal memuat data pesanan: ' + error.message, 'error');
        document.getElementById('ordersTableBody').innerHTML =
            '<tr><td colspan="7" class="text-center text-gray-400 py-8">Gagal memuat data pesanan</td></tr>';
    } finally {
        hideLoading();
    }
}
function displayOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-400 py-8">Tidak ada pesanan ditemukan</td></tr>';
        return;
    }
    const startIndex = orderPagination.getCurrentOffset();
    const endIndex = startIndex + orderPagination.itemsPerPage;
    const pageOrders = filteredOrders.slice(startIndex, endIndex);
    tbody.innerHTML = pageOrders.map(order => {
        const statusInfo = getOrderStatusInfo(order.status);
        return `
            <tr class="hover:bg-gray-700 transition-colors">
                <td>
                    <div>
                        <p class="font-medium text-white">#${order.id}</p>
                        <p class="text-sm text-gray-400">${formatDate(order.order_date)}</p>
                    </div>
                </td>
                <td>
                    <div>
                        <p class="font-medium text-white">${escapeHtml(order.customer_name || order.user_name || 'N/A')}</p>
                        <p class="text-sm text-gray-400">${escapeHtml(order.customer_email || order.user_email || '')}</p>
                    </div>
                </td>
                <td>
                    <span class="font-medium text-green-400">Rp ${formatNumber(order.total_amount)}</span>
                </td>
                <td>
                    <span class="px-3 py-1 rounded-full text-sm ${statusInfo.class}">
                        ${statusInfo.text}
                    </span>
                </td>
                <td>
                    <div class="text-sm text-gray-300 max-w-xs">
                        ${order.shipping_address ? escapeHtml(order.shipping_address.substring(0, 50)) + (order.shipping_address.length > 50 ? '...' : '') : 'Alamat tidak tersedia'}
                    </div>
                </td>
                <td>
                    <span class="text-sm text-purple-400">${order.item_count || 0} item</span>
                </td>
                <td>
                    <div class="flex space-x-2">
                        <button onclick="viewOrderDetails(${order.id})" 
                                class="text-blue-400 hover:text-blue-300 transition-colors" 
                                title="Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editOrderStatus(${order.id})" 
                                class="text-green-400 hover:text-green-300 transition-colors" 
                                title="Update Status">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
function getOrderStatusInfo(status) {
    const statusMap = {
        'pending': { class: 'status-pending', text: 'Menunggu' },
        'processing': { class: 'status-processing', text: 'Diproses' },
        'shipped': { class: 'status-shipped', text: 'Dikirim' },
        'delivered': { class: 'status-delivered', text: 'Selesai' },
        'cancelled': { class: 'status-cancelled', text: 'Dibatalkan' }
    };

    return statusMap[status] || { class: 'status-pending', text: status };
}
function updateOrderPaginationUI() {
    const container = document.getElementById('orderPaginationContainer');
    if (orderPagination && orderPagination.totalPages > 1) {
        container.innerHTML = createPagination(orderPagination, 'goToOrderPage');
    } else {
        container.innerHTML = '';
    }
}
function goToOrderPage(page) {
    if (orderPagination.goToPage(page)) {
        displayOrders();
        updateOrderPaginationUI();
    }
}
function sortOrders(field) {
    if (currentOrderSort.field === field) {
        currentOrderSort.direction = currentOrderSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentOrderSort.field = field;
        currentOrderSort.direction = 'asc';
    }
    filteredOrders = sortTable(filteredOrders, field, currentOrderSort.direction);
    orderPagination = new Pagination(filteredOrders.length, 10);
    displayOrders();
    updateOrderPaginationUI();
}
function handleOrderSearch() {
    const searchTerm = document.getElementById('orderSearchInput').value;
    applyOrderFilters();
}
function handleOrderStatusFilter() {
    applyOrderFilters();
}
function applyOrderFilters() {
    let filtered = [...allOrders];
    const searchTerm = document.getElementById('orderSearchInput').value;
    if (searchTerm) {
        filtered = filterTable(filtered, searchTerm, ['id', 'customer_name', 'user_name', 'customer_email', 'user_email']);
    }
    const statusFilter = document.getElementById('orderStatusFilter').value;
    if (statusFilter) {
        filtered = filtered.filter(order => order.status === statusFilter);
    }
    filteredOrders = filtered;
    orderPagination = new Pagination(filteredOrders.length, 10);
    displayOrders();
    updateOrderPaginationUI();
}
async function viewOrderDetails(orderId) {
    try {
        showLoading('Memuat detail pesanan...');
        const response = await makeAdminRequest(`/orders/${orderId}`);
        if (response.ok) {
            const order = await response.json();
            showOrderDetailsModal(order);
        } else {
            throw new Error('Gagal memuat detail pesanan');
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        showNotification('Gagal memuat detail pesanan: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}
function showOrderDetailsModal(order) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'orderDetailsModal';
    modal.style.display = 'flex';
    const statusInfo = getOrderStatusInfo(order.status);
    modal.innerHTML = `
        <div class="modal-overlay" onclick="hideModal('orderDetailsModal')"></div>
        <div class="bg-gray-800 rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold gradient-text">Detail Pesanan #${order.id}</h3>
                <button onclick="hideModal('orderDetailsModal')" class="text-gray-400 hover:text-white text-2xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-white mb-3">Informasi Pelanggan</h4>
                    <div class="space-y-2 text-sm">
                        <p><span class="text-gray-400">Nama:</span> <span class="text-white">${escapeHtml(order.customer_name || order.user_name || 'N/A')}</span></p>
                        <p><span class="text-gray-400">Email:</span> <span class="text-white">${escapeHtml(order.customer_email || order.user_email || 'N/A')}</span></p>
                        <p><span class="text-gray-400">Telepon:</span> <span class="text-white">${escapeHtml(order.phone || 'N/A')}</span></p>
                    </div>
                </div>
                <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-white mb-3">Informasi Pesanan</h4>
                    <div class="space-y-2 text-sm">
                        <p><span class="text-gray-400">Tanggal:</span> <span class="text-white">${formatDate(order.order_date)}</span></p>
                        <p><span class="text-gray-400">Status:</span> <span class="px-2 py-1 rounded text-xs ${statusInfo.class}">${statusInfo.text}</span></p>
                        <p><span class="text-gray-400">Total:</span> <span class="text-green-400 font-medium">Rp ${formatNumber(order.total_amount)}</span></p>
                    </div>
                </div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 mb-6">
                <h4 class="text-lg font-semibold text-white mb-3">Alamat Pengiriman</h4>
                <p class="text-gray-300">${escapeHtml(order.shipping_address || 'Alamat tidak tersedia')}</p>
            </div>
            <div class="bg-gray-700 rounded-lg p-4">
                <h4 class="text-lg font-semibold text-white mb-3">Item Pesanan</h4>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-600">
                                <th class="text-left py-2 text-gray-400">Produk</th>
                                <th class="text-left py-2 text-gray-400">Size</th>
                                <th class="text-left py-2 text-gray-400">Harga</th>
                                <th class="text-left py-2 text-gray-400">Qty</th>
                                <th class="text-left py-2 text-gray-400">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items ? order.items.map(item => `
                                <tr class="border-b border-gray-700">
                                    <td class="py-2 text-white">${escapeHtml(item.product_name || 'Produk Tidak Diketahui')}</td>
                                    <td class="py-2 text-gray-300">${item.size || '-'}</td>
                                    <td class="py-2 text-gray-300">Rp ${formatNumber(item.price)}</td>
                                    <td class="py-2 text-gray-300">${item.quantity}</td>
                                    <td class="py-2 text-white">Rp ${formatNumber(item.price * item.quantity)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="py-4 text-center text-gray-400">Tidak ada item</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="flex justify-end space-x-4 pt-6 border-t border-gray-600 mt-6">
                <button onclick="editOrderStatus(${order.id})" class="btn-primary">
                    <i class="fas fa-edit mr-2"></i>
                    Update Status
                </button>
                <button onclick="hideModal('orderDetailsModal')" class="btn-secondary">
                    Tutup
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}
async function editOrderStatus(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    const statusOptions = [
        { value: 'pending', text: 'Menunggu' },
        { value: 'processing', text: 'Diproses' },
        { value: 'shipped', text: 'Dikirim' },
        { value: 'delivered', text: 'Selesai' },
        { value: 'cancelled', text: 'Dibatalkan' }
    ];
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'statusModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="hideModal('statusModal')"></div>
        <div class="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 relative z-10">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold gradient-text">Update Status Pesanan</h3>
                <button onclick="hideModal('statusModal')" class="text-gray-400 hover:text-white text-xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="statusForm" onsubmit="handleStatusUpdate(event, ${orderId})">
                <div class="mb-4">
                    <p class="text-sm text-gray-400 mb-2">Pesanan #${orderId}</p>
                    <p class="text-white font-medium mb-4">${escapeHtml(order.customer_name || 'N/A')}</p>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">Status Baru</label>
                    <select name="status" class="admin-input w-full" required>
                        ${statusOptions.map(option => `
                            <option value="${option.value}" ${order.status === option.value ? 'selected' : ''}>
                                ${option.text}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="flex justify-end space-x-4">
                    <button type="button" onclick="hideModal('statusModal')" class="btn-secondary">
                        Batal
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save mr-2"></i>
                        Update Status
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}
async function handleStatusUpdate(e, orderId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newStatus = formData.get('status');
    try {
        showLoading('Mengupdate status...');

        const response = await makeAdminRequest(`/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            showNotification('Status pesanan berhasil diupdate', 'success');
            hideModal('statusModal');
            hideModal('orderDetailsModal');
            loadOrdersData();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Gagal mengupdate status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
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
    window.loadOrdersData = loadOrdersData;
    window.viewOrderDetails = viewOrderDetails;
    window.editOrderStatus = editOrderStatus;
    window.handleStatusUpdate = handleStatusUpdate;
    window.sortOrders = sortOrders;
    window.handleOrderSearch = handleOrderSearch;
    window.handleOrderStatusFilter = handleOrderStatusFilter;
    window.goToOrderPage = goToOrderPage;
}