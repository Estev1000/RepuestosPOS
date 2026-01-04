// --- GEARSTOCK MANAGEMENT LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Data Management ---
    let inventory = JSON.parse(localStorage.getItem('gearstock_inventory')) || [
        { id: 1, code: 'FIL-1040', name: 'Filtro de Aceite', brand: 'Bosch', category: 'Motor', price: 4500, stock: 25 },
        { id: 2, code: 'BUJ-NGK-4', name: 'Bujías x4', brand: 'NGK', category: 'Electricidad', price: 12400, stock: 12 },
        { id: 3, code: 'ACE-5W30', name: 'Aceite 5W30 (1L)', brand: 'Castrol', category: 'Lubricantes', price: 8500, stock: 5 }
    ];

    let sales = JSON.parse(localStorage.getItem('gearstock_sales')) || [];
    let clients = JSON.parse(localStorage.getItem('gearstock_clients')) || [
        { id: 1, name: 'Taller El Rayo', taxId: '20-30456789-2', phone: '11-4567-8910', email: 'elrayo@taller.mapo' },
        { id: 2, name: 'Juan Repuestos', taxId: '27-12345678-5', phone: '11-2233-4455', email: 'juan@repuestos.com' }
    ];
    let config = JSON.parse(localStorage.getItem('gearstock_config')) || {
        storeName: 'GearStock',
        storeSlogan: 'Sistema de Repuestos',
        taxId: '',
        address: '',
        taxPercent: 21
    };
    let cart = [];
    let selectedPaymentMethod = 'Efectivo';

    function saveData() {
        localStorage.setItem('gearstock_inventory', JSON.stringify(inventory));
        localStorage.setItem('gearstock_sales', JSON.stringify(sales));
        localStorage.setItem('gearstock_clients', JSON.stringify(clients));
        localStorage.setItem('gearstock_config', JSON.stringify(config));
        updateStats();
        applyBranding();
    }

    // --- DOM Elements ---
    const dashboardView = document.getElementById('dashboard-view');
    const inventoryView = document.getElementById('inventory-view');
    const saleView = document.getElementById('sale-view');
    const reportsView = document.getElementById('reports-view');
    const clientsView = document.getElementById('clients-view');
    const settingsView = document.getElementById('settings-view');
    const navLinks = document.querySelectorAll('.nav-links li');

    const inventoryTableBody = document.querySelector('#inventory-table tbody');
    const clientsTableBody = document.querySelector('#clients-table tbody');

    const productModal = document.getElementById('product-modal');
    const clientModal = document.getElementById('client-modal');

    const productForm = document.getElementById('product-form');
    const clientForm = document.getElementById('client-form');

    const posProductsList = document.getElementById('pos-products-list');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotalEl = document.getElementById('cart-total');
    const cartSubtotalEl = document.getElementById('cart-subtotal');

    // --- View Navigation ---
    function switchView(viewName) {
        dashboardView.style.display = 'none';
        inventoryView.style.display = 'none';
        saleView.style.display = 'none';
        reportsView.style.display = 'none';
        clientsView.style.display = 'none';
        settingsView.style.display = 'none';

        if (viewName === 'Dashboard' || viewName === 'Panel Principal') {
            dashboardView.style.display = 'block';
            updateDashboard();
        } else if (viewName === 'Inventario') {
            inventoryView.style.display = 'block';
            renderInventory();
        } else if (viewName === 'Nueva Venta') {
            saleView.style.display = 'grid'; // Note: grid for pos layout
            renderPOSProducts();
            refreshCartUI();
        } else if (viewName === 'Reportes') {
            reportsView.style.display = 'block';
            updateReports();
        } else if (viewName === 'Clientes') {
            clientsView.style.display = 'block';
            renderClients();
        } else if (viewName === 'Configuración') {
            settingsView.style.display = 'block';
            loadSettings();
        }

        // Update Sidebar Active state
        navLinks.forEach(li => {
            const text = li.querySelector('span').textContent;
            if (text === viewName || (viewName === 'Dashboard' && text === 'Panel Principal')) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
        });
    }

    navLinks.forEach(li => {
        li.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = li.querySelector('span').textContent;
            switchView(viewName);
        });
    });

    document.getElementById('go-to-inventory').addEventListener('click', () => switchView('Inventario'));
    document.getElementById('quick-sale-btn').addEventListener('click', () => switchView('Nueva Venta'));

    // --- Inventory CRUD ---
    function renderInventory(filterText = '', filterCat = 'all') {
        inventoryTableBody.innerHTML = '';

        const filtered = inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(filterText.toLowerCase()) ||
                item.code.toLowerCase().includes(filterText.toLowerCase()) ||
                item.brand.toLowerCase().includes(filterText.toLowerCase());
            const matchesCat = filterCat === 'all' || item.category === filterCat;
            return matchesSearch && matchesCat;
        });

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            const stockStatus = item.stock <= 5 ? (item.stock === 0 ? 'out-stock' : 'low-stock') : 'in-stock';
            const statusText = item.stock <= 5 ? (item.stock === 0 ? 'Sin Stock' : 'Bajo Stock') : 'En Stock';

            tr.innerHTML = `
                <td><strong>${item.code}</strong></td>
                <td>${item.name}</td>
                <td>${item.brand}</td>
                <td><span class="status completed" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">${item.category}</span></td>
                <td>$${item.price.toLocaleString()}</td>
                <td>${item.stock} unidades</td>
                <td><span class="stock-tag ${stockStatus}">${statusText}</span></td>
                <td>
                    <button class="action-btn edit" data-id="${item.id}" title="Editar"><i class='bx bx-edit-alt'></i></button>
                    <button class="action-btn delete" data-id="${item.id}" title="Eliminar"><i class='bx bx-trash'></i></button>
                </td>
            `;
            inventoryTableBody.appendChild(tr);
        });

        document.querySelectorAll('.action-btn.edit').forEach(btn => btn.onclick = () => editProduct(btn.dataset.id));
        document.querySelectorAll('.action-btn.delete').forEach(btn => btn.onclick = () => deleteProduct(btn.dataset.id));
    }

    function openModal(editing = false, data = null) {
        productModal.style.display = 'flex';
        if (editing) {
            document.getElementById('modal-title').textContent = 'Editar Repuesto';
            document.getElementById('edit-id').value = data.id;
            document.getElementById('p-code').value = data.code;
            document.getElementById('p-name').value = data.name;
            document.getElementById('p-brand').value = data.brand;
            document.getElementById('p-category').value = data.category;
            document.getElementById('p-price').value = data.price;
            document.getElementById('p-stock').value = data.stock;
        } else {
            document.getElementById('modal-title').textContent = 'Añadir Nuevo Repuesto';
            productForm.reset();
            document.getElementById('edit-id').value = '';
        }
    }

    function closeModal() { productModal.style.display = 'none'; }
    document.getElementById('add-product-btn').addEventListener('click', () => openModal());
    document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = closeModal);

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const productData = {
            id: id ? parseInt(id) : Date.now(),
            code: document.getElementById('p-code').value,
            name: document.getElementById('p-name').value,
            brand: document.getElementById('p-brand').value,
            category: document.getElementById('p-category').value,
            price: parseFloat(document.getElementById('p-price').value),
            stock: parseInt(document.getElementById('p-stock').value)
        };

        if (id) {
            const index = inventory.findIndex(p => p.id === parseInt(id));
            inventory[index] = productData;
            showToast('Producto actualizado');
        } else {
            inventory.push(productData);
            showToast('Producto agregado');
        }

        saveData();
        closeModal();
        renderInventory();
    });

    function deleteProduct(id) {
        if (confirm('¿Eliminar producto?')) {
            inventory = inventory.filter(p => p.id !== parseInt(id));
            saveData();
            renderInventory();
            showToast('Producto eliminado');
        }
    }

    function editProduct(id) {
        const product = inventory.find(p => p.id === parseInt(id));
        openModal(true, product);
    }

    // --- Clients CRUD ---
    function renderClients() {
        clientsTableBody.innerHTML = '';
        clients.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td>${c.taxId}</td>
                <td>${c.phone || '-'}</td>
                <td>${c.email || '-'}</td>
                <td>
                    <button class="action-btn edit" data-id="${c.id}" title="Editar"><i class='bx bx-edit-alt'></i></button>
                    <button class="action-btn delete" data-id="${c.id}" title="Eliminar"><i class='bx bx-trash'></i></button>
                </td>
            `;
            clientsTableBody.appendChild(tr);
        });

        clientsTableBody.querySelectorAll('.action-btn.edit').forEach(btn => btn.onclick = () => editClient(btn.dataset.id));
        clientsTableBody.querySelectorAll('.action-btn.delete').forEach(btn => btn.onclick = () => deleteClient(btn.dataset.id));
    }

    function openClientModal(editing = false, data = null) {
        clientModal.style.display = 'flex';
        if (editing) {
            document.getElementById('client-modal-title').textContent = 'Editar Cliente';
            document.getElementById('edit-client-id').value = data.id;
            document.getElementById('c-name').value = data.name;
            document.getElementById('c-tax-id').value = data.taxId;
            document.getElementById('c-phone').value = data.phone;
            document.getElementById('c-email').value = data.email;
        } else {
            document.getElementById('client-modal-title').textContent = 'Añadir Nuevo Cliente';
            clientForm.reset();
            document.getElementById('edit-client-id').value = '';
        }
    }

    function closeClientModal() { clientModal.style.display = 'none'; }
    document.getElementById('add-client-btn').onclick = () => openClientModal();
    document.querySelectorAll('.close-client-modal').forEach(btn => btn.onclick = closeClientModal);

    clientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-client-id').value;
        const clientData = {
            id: id ? parseInt(id) : Date.now(),
            name: document.getElementById('c-name').value,
            taxId: document.getElementById('c-tax-id').value,
            phone: document.getElementById('c-phone').value,
            email: document.getElementById('c-email').value
        };

        if (id) {
            const index = clients.findIndex(c => c.id === parseInt(id));
            clients[index] = clientData;
            showToast('Cliente actualizado');
        } else {
            clients.push(clientData);
            showToast('Cliente agregado');
        }

        saveData();
        closeClientModal();
        renderClients();
    });

    function deleteClient(id) {
        if (confirm('¿Eliminar cliente?')) {
            clients = clients.filter(c => c.id !== parseInt(id));
            saveData();
            renderClients();
            showToast('Cliente eliminado');
        }
    }

    function editClient(id) {
        const client = clients.find(c => c.id === parseInt(id));
        openClientModal(true, client);
    }

    // --- POS System ---
    function renderPOSProducts(filter = '') {
        posProductsList.innerHTML = '';
        const filtered = inventory.filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            p.code.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(p => {
            const card = document.createElement('div');
            card.className = 'pos-product-card';
            card.innerHTML = `
                <i class='bx bxs-box'></i>
                <h4>${p.name}</h4>
                <div class="price">$${p.price.toLocaleString()}</div>
                <div class="stock">${p.stock} dispon.</div>
            `;
            card.onclick = () => addToCart(p);
            posProductsList.appendChild(card);
        });

        // Populate Client Select
        const clientSelect = document.getElementById('pos-client-select');
        clientSelect.innerHTML = '<option value="Consumidor Final">Consumidor Final</option>';
        clients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            clientSelect.appendChild(opt);
        });
    }

    function addToCart(product) {
        if (product.stock <= 0) {
            showToast('Sin stock disponible', 'error');
            return;
        }

        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            if (existing.qty < product.stock) {
                existing.qty++;
            } else {
                showToast('Límite de stock alcanzado');
            }
        } else {
            cart.push({ ...product, qty: 1 });
        }
        refreshCartUI();
    }

    function refreshCartUI() {
        cartItemsList.innerHTML = '';
        let total = 0;

        cart.forEach(item => {
            const subtotal = item.price * item.qty;
            total += subtotal;

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <h5>${item.name}</h5>
                    <span>$${item.price.toLocaleString()} x ${item.qty}</span>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
                </div>
            `;
            cartItemsList.appendChild(div);
        });

        cartTotalEl.textContent = `$${total.toLocaleString()}`;
        cartSubtotalEl.textContent = `$${total.toLocaleString()}`;
    }

    window.updateCartQty = (id, delta) => {
        const item = cart.find(i => i.id === id);
        if (!item) return;

        const original = inventory.find(p => p.id === id);

        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        } else if (item.qty > original.stock) {
            item.qty = original.stock;
            showToast('Stock máximo superado');
        }
        refreshCartUI();
    };

    document.getElementById('pos-search').addEventListener('input', (e) => {
        renderPOSProducts(e.target.value);
    });

    document.getElementById('clear-cart').onclick = () => {
        cart = [];
        refreshCartUI();
    };

    // Payment method selection
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPaymentMethod = btn.dataset.method;
        };
    });

    document.getElementById('finalize-sale').onclick = () => {
        if (cart.length === 0) {
            showToast('El carrito está vacío', 'error');
            return;
        }

        const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const selectedClient = document.getElementById('pos-client-select').value;
        const subClient = document.getElementById('pos-sub-client').value || '';

        // Register Sale
        const newSale = {
            id: `TRX-${Date.now()}`,
            customer: selectedClient,
            subClient: subClient,
            items: cart.map(i => i.name).join(', '),
            total: total,
            method: selectedPaymentMethod,
            date: new Date().toISOString()
        };

        sales.unshift(newSale);

        // Clear input
        document.getElementById('pos-sub-client').value = '';

        // Update Stock
        cart.forEach(cartItem => {
            const invProduct = inventory.find(p => p.id === cartItem.id);
            if (invProduct) {
                invProduct.stock -= cartItem.qty;
            }
        });

        cart = [];
        saveData();
        showToast('Venta realizada con éxito!');
        switchView('Dashboard');
    };

    // --- Dashboard logic ---
    function updateStats() {
        document.getElementById('stat-total-products').textContent = inventory.length;
        document.getElementById('stat-low-stock').textContent = inventory.filter(p => p.stock <= 5).length;

        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(s => s.date.startsWith(today));
        const totalSalesVal = todaySales.reduce((acc, s) => acc + s.total, 0);

        document.getElementById('stat-sales').textContent = `$${totalSalesVal.toLocaleString()}`;
        document.getElementById('stat-orders').textContent = todaySales.length;

        // Render Recent Sales Table
        const table = document.getElementById('recent-sales-table');
        table.innerHTML = '';
        if (sales.length === 0) {
            table.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay ventas</td></tr>';
        } else {
            sales.slice(0, 5).forEach(s => {
                const tr = document.createElement('tr');
                const clientName = s.subClient ? `${s.customer} <br><small style="color: var(--accent)">Ref: ${s.subClient}</small>` : s.customer;
                const statusClass = s.method === 'A Cuenta' ? 'pending' : 'completed';

                tr.innerHTML = `
                    <td>#${s.id.split('-')[1].slice(-5)}</td>
                    <td>${clientName}</td>
                    <td><small>${s.items}</small></td>
                    <td>$${s.total.toLocaleString()}</td>
                    <td><span class="status ${statusClass}">${s.method}</span></td>
                `;
                table.appendChild(tr);
            });
        }
    }

    function updateDashboard() {
        updateStats();
    }

    function updateReports() {
        const totalRev = sales.reduce((acc, s) => acc + s.total, 0);
        const avg = sales.length > 0 ? totalRev / sales.length : 0;

        document.getElementById('report-total-revenue').textContent = `$${totalRev.toLocaleString()}`;
        document.getElementById('report-avg-sale').textContent = `$${avg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        const table = document.getElementById('full-sales-history');
        table.innerHTML = '';
        sales.forEach(s => {
            const dateStr = new Date(s.date).toLocaleDateString() + ' ' + new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const tr = document.createElement('tr');
            const clientDisplay = s.subClient ? `${s.customer} (${s.subClient})` : s.customer;
            const statusClass = s.method === 'A Cuenta' ? 'pending' : 'completed';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${clientDisplay}</strong></td>
                <td><small>${s.items}</small></td>
                <td><span class="status ${statusClass}">${s.method}</span></td>
                <td>$${s.total.toLocaleString()}</td>
            `;
            table.appendChild(tr);
        });
    }

    // --- Data Export/Import Logic ---

    function downloadFile(content, fileName, contentType) {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    document.getElementById('export-json').onclick = () => {
        const fullData = {
            inventory: inventory,
            sales: sales,
            clients: clients,
            exportDate: new Date().toISOString()
        };
        downloadFile(JSON.stringify(fullData, null, 2), `GearStock_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        showToast('Backup JSON descargado');
    };

    document.getElementById('export-excel').onclick = () => {
        const workbook = XLSX.utils.book_new();

        // Sheet 1: Inventory
        const invSheet = XLSX.utils.json_to_sheet(inventory);
        XLSX.utils.book_append_sheet(workbook, invSheet, "Inventario");

        // Sheet 2: Sales
        const salesSheet = XLSX.utils.json_to_sheet(sales);
        XLSX.utils.book_append_sheet(workbook, salesSheet, "Ventas");

        // Sheet 3: Clients
        const clientsSheet = XLSX.utils.json_to_sheet(clients);
        XLSX.utils.book_append_sheet(workbook, clientsSheet, "Clientes");

        XLSX.writeFile(workbook, `GearStock_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('Backup Excel generado');
    };

    const importInput = document.getElementById('import-input');
    document.getElementById('import-btn').onclick = () => importInput.click();

    importInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const isExcel = file.name.endsWith('.xlsx');

        reader.onload = (event) => {
            try {
                let importedData;
                if (isExcel) {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    importedData = {
                        inventory: XLSX.utils.sheet_to_json(workbook.Sheets["Inventario"]),
                        sales: XLSX.utils.sheet_to_json(workbook.Sheets["Ventas"]),
                        clients: XLSX.utils.sheet_to_json(workbook.Sheets["Clientes"])
                    };
                } else {
                    importedData = JSON.parse(event.target.result);
                }

                if (importedData.inventory && importedData.sales && importedData.clients) {
                    if (confirm('¿Reemplazar datos actuales con el archivo seleccionado?')) {
                        inventory = importedData.inventory;
                        sales = importedData.sales;
                        clients = importedData.clients;
                        saveData();
                        showToast('Datos cargados con éxito');
                        location.reload();
                    }
                } else {
                    showToast('Formato de archivo incorrecto', 'error');
                }
            } catch (err) {
                showToast('Error al procesar el archivo', 'error');
                console.error(err);
            }
        };

        if (isExcel) reader.readAsArrayBuffer(file);
        else reader.readAsText(file);
        importInput.value = '';
    };

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // --- Settings Logic ---
    function loadSettings() {
        document.getElementById('set-store-name').value = config.storeName;
        document.getElementById('set-store-slogan').value = config.storeSlogan;
        document.getElementById('set-store-tax').value = config.taxId || '';
        document.getElementById('set-store-address').value = config.address || '';
        document.getElementById('set-tax-percent').value = config.taxPercent;
    }

    document.getElementById('settings-form').onsubmit = (e) => {
        e.preventDefault();
        config.storeName = document.getElementById('set-store-name').value;
        config.storeSlogan = document.getElementById('set-store-slogan').value;
        config.taxId = document.getElementById('set-store-tax').value;
        config.address = document.getElementById('set-store-address').value;
        config.taxPercent = parseFloat(document.getElementById('set-tax-percent').value);

        saveData();
        showToast('Configuración guardada');
    };

    document.getElementById('clear-db-btn').onclick = () => {
        if (confirm('¿ESTÁS SEGURO? Esta acción borrará TODO: Inventario, Ventas y Clientes. No se puede deshacer.')) {
            localStorage.clear();
            location.reload();
        }
    };

    function applyBranding() {
        // Update Page Title
        document.title = `${config.storeName} - ${config.storeSlogan}`;

        // Update Sidebar branding
        const sidebarBrand = document.querySelector('.logo-name');
        if (sidebarBrand) sidebarBrand.textContent = config.storeName;

        // Update POS/Reports/Inventory headers if they are active
        const headerTitle = document.querySelector('.header-title h1');
        const headerP = document.querySelector('.header-title p');

        if (dashboardView.style.display !== 'none') {
            if (headerTitle) headerTitle.textContent = `Panel de ${config.storeName}`;
            if (headerP) headerP.textContent = config.storeSlogan;
        }
    }

    // --- Mobile Menu Logic ---
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuOpenBtns = [
        document.getElementById('menu-open'),
        document.getElementById('menu-open-inv'),
        document.getElementById('menu-open-sale'),
        document.getElementById('menu-open-clients'),
        document.getElementById('menu-open-reports'),
        document.getElementById('menu-open-settings')
    ];
    const menuCloseBtn = document.getElementById('menu-close');

    function toggleSidebar(show) {
        if (show) {
            sidebar.classList.add('active');
            overlay.style.display = 'block';
        } else {
            sidebar.classList.remove('active');
            overlay.style.display = 'none';
        }
    }

    menuOpenBtns.forEach(btn => {
        if (btn) btn.onclick = () => toggleSidebar(true);
    });

    if (menuCloseBtn) menuCloseBtn.onclick = () => toggleSidebar(false);
    if (overlay) overlay.onclick = () => toggleSidebar(false);

    // Close sidebar when clicking a nav link (mobile)
    navLinks.forEach(li => {
        li.addEventListener('click', () => {
            if (window.innerWidth <= 1024) toggleSidebar(false);
        });
    });

    // Init
    applyBranding();
    updateDashboard();
});
