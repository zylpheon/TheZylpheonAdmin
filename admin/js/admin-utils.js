function showNotification(message, type = 'info', duration = 5000) {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} animate-fade-in`;
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="${icons[type]} text-lg"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}
function showLoading(message = 'Memuat...') {
    hideLoading();
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-lg font-medium text-white">${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = 'auto';
    }
}
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}
function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}
function showConfirmDialog(message, onConfirm, onCancel = null) {
    const dialog = document.createElement('div');
    dialog.className = 'modal active';
    dialog.style.display = 'flex';
    dialog.innerHTML = `
        <div class="modal-overlay" onclick="closeConfirmDialog()"></div>
        <div class="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 relative z-10">
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <h3 class="text-lg font-medium text-white mb-4">Konfirmasi</h3>
                <p class="text-gray-300 mb-6">${message}</p>
                <div class="flex space-x-4">
                    <button onclick="closeConfirmDialog()" class="btn-secondary flex-1">
                        Batal
                    </button>
                    <button onclick="confirmAction()" class="btn-danger flex-1">
                        Ya, Lanjutkan
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    document.body.style.overflow = 'hidden';
    window.confirmCallback = onConfirm;
    window.cancelCallback = onCancel;
}
function closeConfirmDialog() {
    const dialog = document.querySelector('.modal.active');
    if (dialog && dialog.innerHTML.includes('Konfirmasi')) {
        dialog.remove();
        document.body.style.overflow = 'auto';
        if (window.cancelCallback) {
            window.cancelCallback();
        }
        delete window.confirmCallback;
        delete window.cancelCallback;
    }
}
function confirmAction() {
    if (window.confirmCallback) {
        window.confirmCallback();
    }
    closeConfirmDialog();
}
function createTableSkeleton(columns, rows = 5) {
    const thead = `
        <thead>
            <tr>
                ${columns.map(col => `<th class="skeleton" style="height: 20px;"></th>`).join('')}
            </tr>
        </thead>
    `;
    const tbody = `
        <tbody>
            ${Array(rows).fill().map(() => `
                <tr>
                    ${columns.map(() => `<td class="skeleton" style="height: 20px;"></td>`).join('')}
                </tr>
            `).join('')}
        </tbody>
    `;
    return thead + tbody;
}
function sortTable(data, column, direction = 'asc') {
    return data.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}
function filterTable(data, searchTerm, columns) {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => {
        return columns.some(column => {
            const value = item[column];
            return value && value.toString().toLowerCase().includes(term);
        });
    });
}
function createPagination(pagination, onPageChange) {
    const info = pagination.getPageInfo();
    if (info.totalPages <= 1) {
        return '<div class="pagination"><span class="text-gray-400 text-sm">Halaman 1 dari 1</span></div>';
    }
    let paginationHTML = '<div class="pagination">';
    paginationHTML += `
        <button ${!info.hasPrev ? 'disabled' : ''} 
                onclick="${onPageChange}(${info.currentPage - 1})" 
                class="pagination-btn">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    const startPage = Math.max(1, info.currentPage - 2);
    const endPage = Math.min(info.totalPages, info.currentPage + 2);
    if (startPage > 1) {
        paginationHTML += `<button onclick="${onPageChange}(1)" class="pagination-btn">1</button>`;
        if (startPage > 2) {
            paginationHTML += '<span class="text-gray-400">...</span>';
        }
    }
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="${onPageChange}(${i})" 
                    class="pagination-btn ${i === info.currentPage ? 'active' : ''}">
                ${i}
            </button>
        `;
    }
    if (endPage < info.totalPages) {
        if (endPage < info.totalPages - 1) {
            paginationHTML += '<span class="text-gray-400">...</span>';
        }
        paginationHTML += `<button onclick="${onPageChange}(${info.totalPages})" class="pagination-btn">${info.totalPages}</button>`;
    }
    paginationHTML += `
        <button ${!info.hasNext ? 'disabled' : ''} 
                onclick="${onPageChange}(${info.currentPage + 1})" 
                class="pagination-btn">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    paginationHTML += '</div>';
    const pageInfo = `
        <div class="text-center mt-4 text-sm text-gray-400">
            Menampilkan ${Math.min(info.itemsPerPage * (info.currentPage - 1) + 1, info.totalItems)} - 
            ${Math.min(info.itemsPerPage * info.currentPage, info.totalItems)} 
            dari ${info.totalItems} data
        </div>
    `;
    return paginationHTML + pageInfo;
}
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        form.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });
        form.querySelectorAll('.error-message').forEach(el => {
            el.remove();
        });
    }
}
function validateForm(formId, rules) {
    const form = document.getElementById(formId);
    if (!form) return false;
    let isValid = true;
    const formData = new FormData(form);
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    form.querySelectorAll('.error-message').forEach(el => el.remove());
    for (const [field, rule] of Object.entries(rules)) {
        const value = formData.get(field);
        const input = form.querySelector(`[name="${field}"]`);
        try {
            if (rule.required) {
                validateRequired(value, rule.label || field);
            }
            if (rule.email && value) {
                validateEmail(value);
            }
            if (rule.positive && value) {
                validatePositiveNumber(value, rule.label || field);
            }
            if (rule.minLength && value && value.length < rule.minLength) {
                throw new Error(`${rule.label || field} minimal ${rule.minLength} karakter`);
            }
            if (rule.custom && value) {
                rule.custom(value);
            }
        } catch (error) {
            isValid = false;
            if (input) {
                input.classList.add('error');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message text-red-400 text-sm mt-1';
                errorMsg.textContent = error.message;
                input.parentNode.appendChild(errorMsg);
            }
        }
    }
    return isValid;
}
function previewImage(input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    if (file && preview) {
        try {
            validateImageFile(file);
            const reader = new FileReader();
            reader.onload = function (e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } catch (error) {
            showNotification(error.message, 'error');
            input.value = '';
            preview.style.display = 'none';
        }
    }
}
if (typeof window !== 'undefined') {
    window.showNotification = showNotification;
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.showModal = showModal;
    window.hideModal = hideModal;
    window.hideAllModals = hideAllModals;
    window.showConfirmDialog = showConfirmDialog;
    window.closeConfirmDialog = closeConfirmDialog;
    window.confirmAction = confirmAction;
    window.createTableSkeleton = createTableSkeleton;
    window.sortTable = sortTable;
    window.filterTable = filterTable;
    window.createPagination = createPagination;
    window.clearForm = clearForm;
    window.validateForm = validateForm;
    window.previewImage = previewImage;
}