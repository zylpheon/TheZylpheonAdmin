let allCategories = [];
let filteredCategories = [];
let currentCategorySort = { field: 'name', direction: 'asc' };
let categoryPagination = null;
async function loadCategoriesData() {
    try {
        showLoading('Memuat data kategori...');
        const response = await makeAdminRequest('/categories');
        if (response.ok) {
            const data = await response.json();
            allCategories = data.categories || data;
            filteredCategories = [...allCategories];
            categoryPagination = new Pagination(filteredCategories.length, 10);
            displayCategories();
            updateCategoryPaginationUI();
        } else {
            throw new Error('Gagal memuat data kategori');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Gagal memuat data kategori: ' + error.message, 'error');
        document.getElementById('categoriesTableBody').innerHTML =
            '<tr><td colspan="5" class="text-center text-gray-400 py-8">Gagal memuat data kategori</td></tr>';
    } finally {
        hideLoading();
    }
}
function displayCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    if (filteredCategories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-400 py-8">Tidak ada kategori ditemukan</td></tr>';
        return;
    }
    const startIndex = categoryPagination.getCurrentOffset();
    const endIndex = startIndex + categoryPagination.itemsPerPage;
    const pageCategories = filteredCategories.slice(startIndex, endIndex);
    tbody.innerHTML = pageCategories.map(category => `
        <tr class="hover:bg-gray-700 transition-colors">
            <td>
                <div>
                    <p class="font-medium text-white">${escapeHtml(category.name)}</p>
                </div>
            </td>
            <td>
                <p class="text-gray-300">${category.description ? escapeHtml(category.description) : '-'}</p>
            </td>
            <td>
                <span class="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    ${category.product_count || 0} produk
                </span>
            </td>
            <td>
                <span class="text-sm text-gray-400">
                    ${formatDate(category.created_at)}
                </span>
            </td>
            <td>
                <div class="flex space-x-2">
                    <button onclick="editCategory(${category.id})" 
                            class="text-blue-400 hover:text-blue-300 transition-colors" 
                            title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteCategory(${category.id})" 
                            class="text-red-400 hover:text-red-300 transition-colors" 
                            title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}
function updateCategoryPaginationUI() {
    const container = document.getElementById('categoryPaginationContainer');
    if (categoryPagination && categoryPagination.totalPages > 1) {
        container.innerHTML = createPagination(categoryPagination, 'goToCategoryPage');
    } else {
        container.innerHTML = '';
    }
}
function goToCategoryPage(page) {
    if (categoryPagination.goToPage(page)) {
        displayCategories();
        updateCategoryPaginationUI();
    }
}
function sortCategories(field) {
    if (currentCategorySort.field === field) {
        currentCategorySort.direction = currentCategorySort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentCategorySort.field = field;
        currentCategorySort.direction = 'asc';
    }
    filteredCategories = sortTable(filteredCategories, field, currentCategorySort.direction);
    categoryPagination = new Pagination(filteredCategories.length, 10);
    displayCategories();
    updateCategoryPaginationUI();
}
function handleCategorySearch() {
    const searchTerm = document.getElementById('categorySearchInput').value;
    if (searchTerm) {
        filteredCategories = filterTable(allCategories, searchTerm, ['name', 'description']);
    } else {
        filteredCategories = [...allCategories];
    }
    categoryPagination = new Pagination(filteredCategories.length, 10);
    displayCategories();
    updateCategoryPaginationUI();
}
function showAddCategoryModal() {
    document.getElementById('categoryModalTitle').textContent = 'Tambah Kategori';
    clearForm('categoryForm');
    document.getElementById('categoryId').value = '';
    showModal('categoryModal');
    document.getElementById('categoryName').focus();
}
async function editCategory(id) {
    try {
        const response = await makeAdminRequest(`/categories/${id}`);
        if (response.ok) {
            const category = await response.json();
            document.getElementById('categoryModalTitle').textContent = 'Edit Kategori';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name || '';
            document.getElementById('categoryDescription').value = category.description || '';
            showModal('categoryModal');
            document.getElementById('categoryName').focus();
        } else {
            throw new Error('Gagal memuat data kategori');
        }
    } catch (error) {
        console.error('Error loading category:', error);
        showNotification('Gagal memuat data kategori: ' + error.message, 'error');
    }
}
async function handleCategorySubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const categoryData = Object.fromEntries(formData.entries());
    const validationRules = {
        name: { required: true, label: 'Nama Kategori' }
    };
    if (!validateForm('categoryForm', validationRules)) {
        return;
    }
    const submitBtn = document.getElementById('submitCategoryBtn');
    const originalText = submitBtn.innerHTML;
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
        const isEdit = !!categoryData.id;
        const endpoint = isEdit ? `/categories/${categoryData.id}` : '/categories';
        const method = isEdit ? 'PUT' : 'POST';
        const response = await makeAdminRequest(endpoint, {
            method: method,
            body: JSON.stringify(categoryData)
        });
        if (response.ok) {
            const result = await response.json();
            showNotification(
                isEdit ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan',
                'success'
            );
            hideModal('categoryModal');
            loadCategoriesData();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Gagal menyimpan kategori');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}
function deleteCategory(id) {
    const category = allCategories.find(c => c.id === id);
    if (!category) return;
    showConfirmDialog(
        `Apakah Anda yakin ingin menghapus kategori "${category.name}"? Semua produk dalam kategori ini akan kehilangan kategori.`,
        async () => {
            try {
                showLoading('Menghapus kategori...');
                const response = await makeAdminRequest(`/categories/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    showNotification('Kategori berhasil dihapus', 'success');
                    loadCategoriesData();
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Gagal menghapus kategori');
                }
            } catch (error) {
                console.error('Error deleting category:', error);
                showNotification('Error: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    );
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
if (typeof window !== 'undefined') {
    window.loadCategoriesData = loadCategoriesData;
    window.showAddCategoryModal = showAddCategoryModal;
    window.editCategory = editCategory;
    window.deleteCategory = deleteCategory;
    window.handleCategorySubmit = handleCategorySubmit;
    window.sortCategories = sortCategories;
    window.handleCategorySearch = handleCategorySearch;
    window.goToCategoryPage = goToCategoryPage;
}