let allProducts = [];
let filteredProducts = [];
let currentSort = { field: 'name', direction: 'asc' };
let productPagination = null;
let categories = [];
async function loadProductsData() {
    try {
        showLoading('Memuat data produk...');
        const response = await makeAdminRequest('/products');
        if (response.ok) {
            const data = await response.json();
            allProducts = data.products || data;
            filteredProducts = [...allProducts];
            productPagination = new Pagination(filteredProducts.length, 10);
            displayProducts();
            updatePaginationUI();
        } else {
            throw new Error('Gagal memuat data produk');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Gagal memuat data produk: ' + error.message, 'error');
        document.getElementById('productsTableBody').innerHTML =
            '<tr><td colspan="8" class="text-center text-gray-400 py-8">Gagal memuat data produk</td></tr>';
    } finally {
        hideLoading();
    }
}
async function loadCategoriesForFilter() {
    try {
        const response = await makeAdminRequest('/categories');
        if (response.ok) {
            const data = await response.json();
            categories = data.categories || data;
            const categoryFilter = document.getElementById('categoryFilter');
            const productCategory = document.getElementById('productCategory');
            if (categoryFilter) {
                categoryFilter.innerHTML = '<option value="">Semua Kategori</option>' +
                    categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
            }
            if (productCategory) {
                productCategory.innerHTML = '<option value="">Pilih Kategori</option>' +
                    categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}
function displayProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-400 py-8">Tidak ada produk ditemukan</td></tr>';
        return;
    }
    const startIndex = productPagination.getCurrentOffset();
    const endIndex = startIndex + productPagination.itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);
    tbody.innerHTML = pageProducts.map(product => {
        const stockStatus = getStockStatus(product.stock);
        const imageDisplay = product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}" class="w-12 h-12 object-cover rounded-lg">`
            : '<div class="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center"><i class="fas fa-image text-gray-400"></i></div>';

        return `
            <tr class="hover:bg-gray-700 transition-colors">
                <td>
                    <div>
                        <p class="font-medium text-white">${escapeHtml(product.name)}</p>
                        ${product.description ? `<p class="text-sm text-gray-400">${escapeHtml(product.description.substring(0, 50))}${product.description.length > 50 ? '...' : ''}</p>` : ''}
                    </div>
                </td>
                <td>${imageDisplay}</td>
                <td>
                    <span class="text-purple-300">${escapeHtml(product.category_name || 'Tanpa Kategori')}</span>
                </td>
                <td>
                    <span class="font-medium text-green-400">Rp ${formatNumber(product.price)}</span>
                </td>
                <td>
                    <span class="px-3 py-1 rounded-full text-sm ${stockStatus.class}">
                        ${product.stock}
                    </span>
                </td>
                <td>
                    ${product.size ? `<span class="bg-gray-600 px-2 py-1 rounded text-sm">${product.size}</span>` : '-'}
                </td>
                <td>
                    <span class="px-3 py-1 rounded-full text-sm ${product.stock > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                        ${product.stock > 0 ? 'Aktif' : 'Habis'}
                    </span>
                </td>
                <td>
                    <div class="flex space-x-2">
                        <button onclick="editProduct(${product.id})" 
                                class="text-blue-400 hover:text-blue-300 transition-colors" 
                                title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteProduct(${product.id})" 
                                class="text-red-400 hover:text-red-300 transition-colors" 
                                title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'bg-red-500/20 text-red-400', text: 'Habis' };
    } else if (stock <= 10) {
        return { class: 'bg-yellow-500/20 text-yellow-400', text: 'Rendah' };
    } else {
        return { class: 'bg-green-500/20 text-green-400', text: 'Aman' };
    }
}
function updatePaginationUI() {
    const container = document.getElementById('paginationContainer');
    if (productPagination && productPagination.totalPages > 1) {
        container.innerHTML = createPagination(productPagination, 'goToProductPage');
    } else {
        container.innerHTML = '';
    }
}
function goToProductPage(page) {
    if (productPagination.goToPage(page)) {
        displayProducts();
        updatePaginationUI();
    }
}
function sortProducts(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    filteredProducts = sortTable(filteredProducts, field, currentSort.direction);
    productPagination = new Pagination(filteredProducts.length, 10);
    displayProducts();
    updatePaginationUI();
}
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value;
    applyFilters();
}
function handleCategoryFilter() {
    applyFilters();
}
function handleStockFilter() {
    applyFilters();
}
function applyFilters() {
    let filtered = [...allProducts];
    const searchTerm = document.getElementById('searchInput').value;
    if (searchTerm) {
        filtered = filterTable(filtered, searchTerm, ['name', 'description', 'category_name']);
    }
    const categoryFilter = document.getElementById('categoryFilter').value;
    if (categoryFilter) {
        filtered = filtered.filter(product => product.category_id == categoryFilter);
    }
    const stockFilter = document.getElementById('stockFilter').value;
    if (stockFilter) {
        switch (stockFilter) {
            case 'low':
                filtered = filtered.filter(product => product.stock > 0 && product.stock <= 10);
                break;
            case 'out':
                filtered = filtered.filter(product => product.stock === 0);
                break;
            case 'available':
                filtered = filtered.filter(product => product.stock > 0);
                break;
        }
    }
    filteredProducts = filtered;
    productPagination = new Pagination(filteredProducts.length, 10);
    displayProducts();
    updatePaginationUI();
}
function showAddProductModal() {
    document.getElementById('modalTitle').textContent = 'Tambah Produk';
    clearForm('productForm');
    document.getElementById('productId').value = '';
    showModal('productModal');
    document.getElementById('productName').focus();
}
async function editProduct(id) {
    try {
        const response = await makeAdminRequest(`/products/${id}`);
        if (response.ok) {
            const product = await response.json();
            document.getElementById('modalTitle').textContent = 'Edit Produk';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productCategory').value = product.category_id || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productStock').value = product.stock || '';
            document.getElementById('productSize').value = product.size || '';
            document.getElementById('productColor').value = product.color || '';
            document.getElementById('productImageUrl').value = product.image_url || '';
            showModal('productModal');
            document.getElementById('productName').focus();
        } else {
            throw new Error('Gagal memuat data produk');
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showNotification('Gagal memuat data produk: ' + error.message, 'error');
    }
}
async function handleProductSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productData = Object.fromEntries(formData.entries());
    const validationRules = {
        name: { required: true, label: 'Nama Produk' },
        category_id: { required: true, label: 'Kategori' },
        price: { required: true, positive: true, label: 'Harga' },
        stock: { required: true, positive: true, label: 'Stok' }
    };
    if (!validateForm('productForm', validationRules)) {
        return;
    }
    const submitBtn = document.getElementById('submitProductBtn');
    const originalText = submitBtn.innerHTML;
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
        const isEdit = !!productData.id;
        const endpoint = isEdit ? `/products/${productData.id}` : '/products';
        const method = isEdit ? 'PUT' : 'POST';
        productData.price = parseFloat(productData.price);
        productData.stock = parseInt(productData.stock);
        productData.category_id = parseInt(productData.category_id);
        const response = await makeAdminRequest(endpoint, {
            method: method,
            body: JSON.stringify(productData)
        });
        if (response.ok) {
            const result = await response.json();
            showNotification(
                isEdit ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan',
                'success'
            );
            hideModal('productModal');
            loadProductsData();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Gagal menyimpan produk');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}
function deleteProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    showConfirmDialog(
        `Apakah Anda yakin ingin menghapus produk "${product.name}"?`,
        async () => {
            try {
                showLoading('Menghapus produk...');

                const response = await makeAdminRequest(`/products/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    showNotification('Produk berhasil dihapus', 'success');
                    loadProductsData();
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Gagal menghapus produk');
                }
            } catch (error) {
                console.error('Error deleting product:', error);
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
if (typeof window !== 'undefined') {
    window.loadProductsData = loadProductsData;
    window.loadCategoriesForFilter = loadCategoriesForFilter;
    window.showAddProductModal = showAddProductModal;
    window.editProduct = editProduct;
    window.deleteProduct = deleteProduct;
    window.handleProductSubmit = handleProductSubmit;
    window.sortProducts = sortProducts;
    window.handleSearch = handleSearch;
    window.handleCategoryFilter = handleCategoryFilter;
    window.handleStockFilter = handleStockFilter;
    window.goToProductPage = goToProductPage;
}