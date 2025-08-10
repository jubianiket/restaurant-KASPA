// --- VAT/CGST/SGST Settings Fetch ---
let vatSetting = 0, cgstSetting = 0, sgstSetting = 0;
function fetchTaxSettings() {
    fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                vatSetting = parseFloat(data.data.vat) || 0;
                cgstSetting = parseFloat(data.data.cgst) || 0;
                sgstSetting = parseFloat(data.data.sgst) || 0;
                
                // Update the display values in the toggle section
                const gstValueDisplay = document.getElementById('gstValueDisplay');
                const cgstValueDisplay = document.getElementById('cgstValueDisplay');
                const sgstValueDisplay = document.getElementById('sgstValueDisplay');
                
                if (gstValueDisplay) {
                    gstValueDisplay.innerHTML = `(VAT: <span id="gstValue">${vatSetting}</span>%)`;
                }
                if (cgstValueDisplay) {
                    cgstValueDisplay.innerHTML = `(CGST: <span id="cgstValue">${cgstSetting}</span>%)`;
                }
                if (sgstValueDisplay) {
                    sgstValueDisplay.innerHTML = `(SGST: <span id="sgstValue">${sgstSetting}</span>%)`;
                }
                
                console.log('✅ Tax settings loaded:', { vat: vatSetting, cgst: cgstSetting, sgst: sgstSetting });
            }
        })
        .catch(err => console.error('Error fetching tax settings:', err));
}

// Scroll menu items horizontally on arrow button click
function scrollItems(direction) {
    const itemGrid = document.getElementById('itemGrid');
    if (!itemGrid) return;
    const scrollAmount = 200;
    const scrollOptions = { left: (direction === 'left' ? -scrollAmount : scrollAmount), behavior: 'smooth' };
    itemGrid.scrollBy(scrollOptions);
}
// End of file
// Global error handler for debugging
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global JS Error:', message, 'at', source + ':' + lineno + ':' + colno, error);
};

console.log('order.js loaded, attaching event listeners...');
// Reset all table buttons to green (unlocked) at startup
function resetAllTables() {
    document.querySelectorAll('.table-btn.locked').forEach(btn => btn.classList.remove('locked'));
    lockedTables.clear();
    saveStateToLocalStorage();
}

let selectedTable = 1;
let menuItems = [];
let currentCategory = '';
let lockedTables = new Set();
let tableOrders = {};

// --- Local Storage Functions ---
function saveStateToLocalStorage() {
    try {
        localStorage.setItem('tableOrders', JSON.stringify(tableOrders));
        localStorage.setItem('lockedTables', JSON.stringify(Array.from(lockedTables)));
        localStorage.setItem('selectedTable', selectedTable);
    } catch (e) {
        console.error("Error saving to localStorage:", e);
    }
}

function loadStateFromLocalStorage() {
    try {
        const storedOrders = localStorage.getItem('tableOrders');
        const storedLockedTables = localStorage.getItem('lockedTables');
        const storedSelectedTable = localStorage.getItem('selectedTable');

        if (storedOrders) tableOrders = JSON.parse(storedOrders);
        if (storedLockedTables) lockedTables = new Set(JSON.parse(storedLockedTables));
        if (storedSelectedTable) selectedTable = parseInt(storedSelectedTable, 10);
    } catch (e) {
        console.error("Error loading from localStorage:", e);
        localStorage.removeItem('tableOrders');
        localStorage.removeItem('lockedTables');
        localStorage.removeItem('selectedTable');
    }
}
// --- End Local Storage Functions ---

function getCurrentOrderKey() {
    return document.querySelector('input[name="orderType"]:checked').value === 'Table' ? selectedTable : 'delivery';
}

function toggleOrderType() {
    const type = document.querySelector('input[name="orderType"]:checked').value;
    const tableSection = document.getElementById('tableSection');
    const deliverySection = document.getElementById('deliverySection');
    const selectedTableLabel = document.getElementById('selectedTableLabel');

    if (type === 'Table') {
        tableSection.classList.remove('hidden');
        deliverySection.classList.add('hidden');
        selectedTableLabel.textContent = `Table ${selectedTable} Order`;
        const currentSelectedBtn = document.querySelector(`.table-btn.selected`);
        if (currentSelectedBtn) currentSelectedBtn.classList.remove('selected');
        const btnToSelect = document.querySelector(`.table-btn[data-table-num="${selectedTable}"]`);
        if (btnToSelect) btnToSelect.classList.add('selected');
        loadOrderForTable(selectedTable);
    } else {
        tableSection.classList.add('hidden');
        deliverySection.classList.remove('hidden');
        selectedTableLabel.textContent = 'Delivery Order';
        const prevSelectedBtn = document.querySelector('.table-btn.selected');
        if (prevSelectedBtn) prevSelectedBtn.classList.remove('selected');
        tableOrders['delivery'] = tableOrders['delivery'] || [];
        updateTable(tableOrders['delivery']);
    }
}

function selectTable(num) {
    const prevSelectedBtn = document.querySelector('.table-btn.selected');
    if (prevSelectedBtn) prevSelectedBtn.classList.remove('selected');

    selectedTable = num;
    saveStateToLocalStorage();
    document.getElementById('selectedTableLabel').textContent = `Table ${num} Order`;
    loadOrderForTable(num);

    const currentSelectedBtn = document.querySelector(`.table-btn[data-table-num="${num}"]`);
    if (currentSelectedBtn) currentSelectedBtn.classList.add('selected');
}

function loadOrderForTable(num) {
    const orderObj = tableOrders[num];
    if (orderObj && typeof orderObj === 'object' && (orderObj.confirmed || orderObj.new)) {
        updateTable([...(orderObj.confirmed || []), ...(orderObj.new || [])]);
    } else {
        updateTable(orderObj || []);
    }
}

function fetchMenu() {
    fetch('/menu_items')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                menuItems = data.data;
                generateCategoryButtons();
                renderMenuItems();
            } else {
                alert('Error loading menu items.');
            }
        })
        .catch(error => console.error('Error fetching menu items:', error));
}

function generateCategoryButtons() {
    const categories = [...new Set(menuItems.map(i => i.category))].sort();
    const container = document.getElementById('categoryButtons');
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.classList.add('active');
    allBtn.onclick = () => {
        currentCategory = '';
        document.getElementById('itemSearch').value = '';
        renderMenuItems();
        document.querySelectorAll('.category-btns button').forEach(btn => btn.classList.remove('active'));
        allBtn.classList.add('active');
    };
    container.appendChild(allBtn);

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat;
        btn.onclick = () => {
            currentCategory = cat;
            document.getElementById('itemSearch').value = '';
            renderMenuItems();
            document.querySelectorAll('.category-btns button').forEach(btn => btn.classList.remove('active'));
            btn.classList.add('active');
        };
        container.appendChild(btn);
    });
}

function renderMenuItems() {
    const itemGrid = document.getElementById('itemGrid');
    itemGrid.innerHTML = '';
    const searchQuery = document.getElementById('itemSearch').value.toLowerCase();

    let filteredItems = menuItems;

    if (searchQuery) {
        document.querySelectorAll('.category-btns button').forEach(btn => btn.classList.remove('active'));
        currentCategory = '';
        filteredItems = filteredItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery) ||
            item.category.toLowerCase().includes(searchQuery)
        );
    } else {
        filteredItems = filteredItems.filter(item => !currentCategory || item.category === currentCategory);
    }

    filteredItems.sort((a, b) => a.name.localeCompare(b.name));

    if (filteredItems.length === 0) {
        itemGrid.innerHTML = '<p style="text-align: center;">No items found.</p>';
        return;
    }

    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <h4>${item.name}</h4>
            <p>₹${item.rate.toFixed(2)}</p>
            <button data-item-name="${item.name}">Add</button>
        `;
        card.querySelector('button').onclick = () => addItem(item.name);
        itemGrid.appendChild(card);
    });
}

function addItem(name) {
    const currentOrderKey = getCurrentOrderKey();
    const qty = 1;
    const item = menuItems.find(i => i.name === name);
    if (!item) return;

    // Support confirmed and new items for locked tables
    let orderObj = tableOrders[currentOrderKey];
    if (!orderObj || Array.isArray(orderObj)) {
        // Convert to object structure if needed
        orderObj = { confirmed: [], new: [] };
        tableOrders[currentOrderKey] = orderObj;
    }
    // Check if item exists in new items
    const existingNewIndex = orderObj.new.findIndex(orderItem => orderItem.name === name);
    if (existingNewIndex > -1) {
        orderObj.new[existingNewIndex].qty += qty;
    } else {
        orderObj.new.push({ name, qty, rate: item.rate });
    }
    updateTable([...orderObj.confirmed, ...orderObj.new]);
    saveStateToLocalStorage();
}

// --- Update Table Function ---
function updateTable(items) {
    const tbody = document.querySelector('#orderTable tbody');
    tbody.innerHTML = '';
    let subtotal = 0;

    // Disable confirm button if table is locked and no new item is added
    const confirmBtn = document.getElementById('confirmBtn');
    const type = document.querySelector('input[name="orderType"]:checked').value;
    if (confirmBtn) {
        if (type === 'Table') {
            if (lockedTables.has(selectedTable)) {
                const orderObj = tableOrders[selectedTable];
                // Enable Confirm only if there are new items
                if (orderObj && orderObj.new && orderObj.new.length > 0) {
                    confirmBtn.disabled = false;
                } else {
                    confirmBtn.disabled = true;
                }
            } else {
                confirmBtn.disabled = items.length === 0;
            }
        } else {
            confirmBtn.disabled = items.length === 0;
        }
    }
    if (!items || items.length === 0) {
        document.getElementById('totalAmount').textContent = '0.00';
        return;
    }

    items.forEach((item, idx) => {
        const amount = item.qty * item.rate;
        subtotal += amount;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${item.name}</td><td>${item.qty}</td><td>${item.rate.toFixed(2)}</td><td>${amount.toFixed(2)}</td>`;
        tbody.appendChild(row);
    });

    // VAT/CGST/SGST logic
    let total = subtotal;
    let vatAmount = 0, cgstAmount = 0, sgstAmount = 0;
    const gstToggle = document.getElementById('gstToggle');
    const cgstSgstToggle = document.getElementById('cgstSgstToggle');

    // Update subtotal display
    document.getElementById('subtotalAmount').textContent = subtotal.toFixed(2);
    // Update mobile UI running totals early
    updateMobileCartBar(items, subtotal, subtotal);

    // Calculate taxes based on settings - allow both taxes to be applied
    let hasAnyTax = false;
    
    // Check VAT toggle
    if (gstToggle && gstToggle.checked) {
        vatAmount = subtotal * vatSetting / 100;
        total += vatAmount;
        hasAnyTax = true;
        
        // Show VAT breakdown
        document.getElementById('vatLine').style.display = 'block';
        document.getElementById('vatRate').textContent = vatSetting;
        document.getElementById('vatAmount').textContent = vatAmount.toFixed(2);
        console.log('✅ VAT applied:', vatAmount.toFixed(2), 'at', vatSetting + '%');
    } else {
        document.getElementById('vatLine').style.display = 'none';
    }
    
    // Check CGST/SGST toggle
    if (cgstSgstToggle && cgstSgstToggle.checked) {
        cgstAmount = subtotal * cgstSetting / 100;
        sgstAmount = subtotal * sgstSetting / 100;
        total += cgstAmount + sgstAmount;
        hasAnyTax = true;
        
        // Show CGST/SGST breakdown
        document.getElementById('cgstLine').style.display = 'block';
        document.getElementById('sgstLine').style.display = 'block';
        document.getElementById('cgstRate').textContent = cgstSetting;
        document.getElementById('cgstAmount').textContent = cgstAmount.toFixed(2);
        document.getElementById('sgstRate').textContent = sgstSetting;
        document.getElementById('sgstAmount').textContent = sgstAmount.toFixed(2);
        console.log('✅ CGST/SGST applied:', cgstAmount.toFixed(2), '+', sgstAmount.toFixed(2), 'at', cgstSetting + '% +', sgstSetting + '%');
    } else {
        document.getElementById('cgstLine').style.display = 'none';
        document.getElementById('sgstLine').style.display = 'none';
    }
    
    // Show/hide tax breakdown section
    if (hasAnyTax) {
        document.getElementById('taxBreakdown').style.display = 'block';
    } else {
        document.getElementById('taxBreakdown').style.display = 'none';
    }
    
    console.log('💰 Tax calculation:', { subtotal, vatAmount, cgstAmount, sgstAmount, total });
    
    // Update mobile UI final totals and render list
    updateMobileCartBar(items, subtotal, total);
    renderMobileCartList(items);
    
    document.getElementById('totalAmount').textContent = total.toFixed(2);
}

function clearOrder() {
    document.querySelector('#orderTable tbody').innerHTML = '';
    document.getElementById('totalAmount').textContent = '0.00';
    document.getElementById('subtotalAmount').textContent = '0.00';
    document.getElementById('taxBreakdown').style.display = 'none';
    tableOrders[getCurrentOrderKey()] = [];
    saveStateToLocalStorage();
}

function confirmOrder() {
    const type = document.querySelector('input[name="orderType"]:checked').value;
    const currentOrderKey = getCurrentOrderKey();
    let orderObj = tableOrders[currentOrderKey];
    let itemsToSend = [];
    if (type === 'Table') {
        if (!orderObj || Array.isArray(orderObj)) {
            orderObj = { confirmed: [], new: [] };
            tableOrders[currentOrderKey] = orderObj;
        }
        itemsToSend = orderObj.new;
    } else {
        itemsToSend = orderObj || [];
    }

    if (!itemsToSend || itemsToSend.length === 0) {
        alert('No items in the order.');
        return;
    }

    const subtotal = itemsToSend.reduce((acc, i) => acc + i.qty * i.rate, 0);
    let gst = 0, cgst = 0, sgst = 0;
    const gstToggle = document.getElementById('gstToggle');
    const cgstSgstToggle = document.getElementById('cgstSgstToggle');
    
    // Calculate taxes - allow both to be applied
    if (gstToggle && gstToggle.checked) {
        gst = subtotal * vatSetting / 100;
    }
    if (cgstSgstToggle && cgstSgstToggle.checked) {
        cgst = subtotal * cgstSetting / 100;
        sgst = subtotal * sgstSetting / 100;
    }
    const total = subtotal + gst + cgst + sgst;

    if (type === 'Table' && orderObj.order_id) {
        // Existing order: append items
        fetch(`/orders/${orderObj.order_id}/append_items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsToSend })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('✅ Items appended to order:', orderObj.order_id);
                lockTable(selectedTable);
                // Merge new items into confirmed
                orderObj.confirmed = [...orderObj.confirmed, ...orderObj.new];
                orderObj.new = [];
                saveStateToLocalStorage();
                updateTable([...orderObj.confirmed, ...orderObj.new]);
            } else {
                alert('Failed to append items');
            }
        })
        .catch(err => console.error('Error appending items:', err));
    } else {
        // New order
        const order = {
            order_type: type,
            table_number: type === 'Table' ? selectedTable : 0,
            phone: type === 'Delivery' ? document.getElementById('phone').value : '',
            address: type === 'Delivery' ? document.getElementById('address').value : '',
            items: itemsToSend,
            subtotal: subtotal.toFixed(2),
            gst: gst.toFixed(2),
            cgst: cgst.toFixed(2),
            sgst: sgst.toFixed(2),
            total: total.toFixed(2),
            date: new Date().toLocaleString(),
            status: 'received'
        };
        fetch('/save_order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('✅ Order saved with ID:', data.order_id);
                if (type === 'Table') {
                    lockTable(selectedTable);
                    if (data.order_id) {
                        // Merge new items into confirmed, keep order_id
                        orderObj.confirmed = [...orderObj.confirmed, ...orderObj.new];
                        orderObj.new = [];
                        orderObj.order_id = data.order_id;
                    }
                } else {
                    clearOrder();
                }
                saveStateToLocalStorage();
                updateTable([...orderObj.confirmed, ...orderObj.new]);
            } else {
                alert('Failed to save order');
            }
        })
        .catch(err => console.error('Error saving order:', err));
    }
}

function printBill() {
    var paperSize = document.getElementById('paperSize') ? document.getElementById('paperSize').value : '80';
    var widthPx = paperSize === '80' ? 300 : 220;
    var printWindow = window.open('', '', 'width=' + widthPx + ',height=600');
    printWindow.document.write('<html><head><title>Print Bill</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('.thermal-bill-80 { width: 80mm; max-width: 300px; margin: auto; }');
    printWindow.document.write('.thermal-bill-59 { width: 59mm; max-width: 220px; margin: auto; }');
    printWindow.document.write('body, table, th, td, h3, label, span { font-family: Arial, Helvetica, sans-serif !important; font-size: 12px !important; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; }');
    printWindow.document.write('th, td { border-bottom: 1px dotted #000; padding: 2px 4px; text-align: left; }');
    printWindow.document.write('td { word-break: break-word; white-space: normal; max-width: 120px; }');
    printWindow.document.write('h3 { font-size: 14px; margin-bottom: 4px; }');
    printWindow.document.write('.summary { font-weight: bold; font-size: 13px; margin-top: 8px; }');
    printWindow.document.write('@media print { body { margin: 0; } }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');

    // Restaurant Name
    var restaurantName = '<div style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:8px;">' + (window.restaurantName || 'Restaurant Name') + '</div>';

    // Clone order table for printing
    var orderTableElem = document.getElementById('orderTable');
    var clonedTable = orderTableElem.cloneNode(true);
    var rows = clonedTable.querySelectorAll('tbody tr');
    rows.forEach(function(row) {
        var cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            var name = cells[0].textContent;
            if (name.length > 16) {
                var words = name.split(' ');
                var shortName = words.slice(0, 2).join(' ');
                if (shortName.length > 16) shortName = shortName.slice(0, 16);
                cells[0].textContent = shortName + (name.length > shortName.length ? '...' : '');
            }
        }
    });
    var orderTableHtml = clonedTable.outerHTML;

    var orderNumber = document.getElementById('selectedTableLabel') ? document.getElementById('selectedTableLabel').outerHTML : '';

    // Get current tax breakdown from UI
    var subtotal = parseFloat(document.getElementById('subtotalAmount').textContent) || 0;
    var total = parseFloat(document.getElementById('totalAmount').textContent) || 0;
    var gstToggle = document.getElementById('gstToggle');
    var cgstSgstToggle = document.getElementById('cgstSgstToggle');
    
    // Get tax amounts from UI if available - allow both taxes
    var vatAmount = 0, cgstAmount = 0, sgstAmount = 0;
    if (gstToggle && gstToggle.checked) {
        vatAmount = parseFloat(document.getElementById('vatAmount').textContent) || 0;
    }
    if (cgstSgstToggle && cgstSgstToggle.checked) {
        cgstAmount = parseFloat(document.getElementById('cgstAmount').textContent) || 0;
        sgstAmount = parseFloat(document.getElementById('sgstAmount').textContent) || 0;
    }

    printWindow.document.write('<div class="thermal-bill-' + paperSize + '">');
    printWindow.document.write(restaurantName);
    printWindow.document.write(orderNumber);
    printWindow.document.write(orderTableHtml);
    
    // Add subtotal
    printWindow.document.write('<div style="margin-top:8px;font-size:13px;text-align:right;">Subtotal: ₹' + subtotal.toFixed(2) + '</div>');
    
    // Add tax breakdown
    if (vatAmount > 0) {
        printWindow.document.write('<div style="margin-top:4px;font-size:13px;text-align:right;">VAT (' + vatSetting + '%): ₹' + vatAmount.toFixed(2) + '</div>');
    }
    if (cgstAmount > 0) {
        printWindow.document.write('<div style="margin-top:4px;font-size:13px;text-align:right;">CGST (' + cgstSetting + '%): ₹' + cgstAmount.toFixed(2) + '</div>');
    }
    if (sgstAmount > 0) {
        printWindow.document.write('<div style="margin-top:4px;font-size:13px;text-align:right;">SGST (' + sgstSetting + '%): ₹' + sgstAmount.toFixed(2) + '</div>');
    }
    
    // Add total
    printWindow.document.write('<div style="margin-top:8px;font-size:15px;font-weight:bold;text-align:right;border-top:1px solid #000;padding-top:4px;">Total: ₹' + total.toFixed(2) + '</div>');
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(function() {
        printWindow.print();
        printWindow.close();
    }, 300);

    // After printing, update DB status for table orders and unlock table
    const type = document.querySelector('input[name="orderType"]:checked').value;
    if (type === 'Table') {
        const orderObj = tableOrders[selectedTable];
        const orderId = orderObj && orderObj.order_id ? orderObj.order_id : null;

        if (orderId) {
            fetch(`/orders/${orderId}/complete`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    console.log('✅ Order marked as completed');
                    // Unlock the table after successful completion
                    unlockTable(selectedTable);
                    // Clear the order data for this table
                    delete tableOrders[selectedTable];
                    saveStateToLocalStorage();
                    if (window.location.pathname === '/history') {
                        window.location.reload();
                    }
                } else {
                    console.error('❌ Failed to mark order as completed:', data.message);
                }
            })
            .catch(err => console.error('Error updating order status:', err));
        } else {
            console.log('No order ID found for table completion');
            // Still unlock the table even if no order ID
            unlockTable(selectedTable);
            delete tableOrders[selectedTable];
            saveStateToLocalStorage();
        }
    }
}

function lockTable(tableNum) {
    const btn = document.querySelector(`.table-btn[data-table-num="${tableNum}"]`);
    if (btn) {
        btn.classList.add('locked');
        lockedTables.add(tableNum);
        saveStateToLocalStorage();
    }
}

function unlockTable(tableNum) {
    const btn = document.querySelector(`.table-btn[data-table-num="${tableNum}"]`);
    if (btn) {
        btn.classList.remove('locked');
        lockedTables.delete(tableNum);
        saveStateToLocalStorage();
    }
}

function createTableButtons() {
    fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            const totalTables = data.data.total_tables || 12;
            const tableSection = document.getElementById('tableSection');
            tableSection.innerHTML = '';

            for (let i = 1; i <= totalTables; i++) {
                const btn = document.createElement('button');
                btn.textContent = `Table ${i}`;
                btn.className = 'table-btn';
                btn.dataset.tableNum = i;
                btn.onclick = () => selectTable(i);
                if (lockedTables.has(i)) btn.classList.add('locked');
                tableSection.appendChild(btn);
            }
            selectTable(selectedTable);
        })
        .then(() => { try { applyMobileOptimizations(); } catch(e){} })
        .catch(err => console.error('Error fetching table settings:', err));
}

// On load
// Update table when tax toggles change
function updateTaxDisplay() {
    const currentOrderKey = getCurrentOrderKey();
    const orderObj = tableOrders[currentOrderKey];
    if (orderObj) {
        updateTable([...(orderObj.confirmed || []), ...(orderObj.new || [])]);
    }
}

window.onload = () => {
    loadStateFromLocalStorage();
    createTableButtons();
    fetchMenu();
    toggleOrderType();
    fetchTaxSettings(); // Make sure tax settings are loaded
};

// Save state before leaving page
window.addEventListener('beforeunload', saveStateToLocalStorage);

// Fetch restaurant name for printing
window.restaurantName = '';
fetch('/api/settings')
    .then(response => response.json())
    .then(data => {
        window.restaurantName = (data.data && data.data.restaurant_name) ? data.data.restaurant_name : 'Restaurant Name';
    })
    .catch(() => { window.restaurantName = 'Restaurant Name'; });

// --- Mobile Android POS UI helpers ---
const mobileCartBar = document.getElementById('mobileCartBar');
const mobileFab = document.getElementById('mobileFab');
const mobileCartSheet = document.getElementById('mobileCartSheet');
const mobileCartBackdrop = document.getElementById('mobileCartBackdrop');
const mobileCartList = document.getElementById('mobileCartList');
const mobileSheetClose = document.getElementById('mobileSheetClose');
const mobileSheetConfirm = document.getElementById('mobileSheetConfirm');
const mobileViewCartBtn = document.getElementById('mobileViewCartBtn');
const mobileConfirmBtn = document.getElementById('mobileConfirmBtn');

function isMobileUI() {
    return document.body.classList && document.body.classList.contains('is-mobile');
}

function openMobileSheet() {
    if (!isMobileUI()) return;
    mobileCartSheet && mobileCartSheet.classList.add('open');
    mobileCartBackdrop && mobileCartBackdrop.classList.add('visible');
}

function closeMobileSheet() {
    mobileCartSheet && mobileCartSheet.classList.remove('open');
    mobileCartBackdrop && mobileCartBackdrop.classList.remove('visible');
}

function updateMobileCartBar(items, subtotal, total) {
    if (!isMobileUI()) return;
    try {
        const count = (items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
        const totalEl = document.getElementById('mobileCartTotal');
        const countEl = document.getElementById('mobileCartCount');
        const subEl = document.getElementById('mobileSubtotal');
        const grandEl = document.getElementById('mobileGrand');
        if (totalEl) totalEl.textContent = (total || 0).toFixed(2);
        if (countEl) countEl.textContent = count;
        if (subEl) subEl.textContent = (subtotal || 0).toFixed(2);
        if (grandEl) grandEl.textContent = (total || 0).toFixed(2);
    } catch (e) { /* no-op */ }
}

function renderMobileCartList(items) {
    if (!isMobileUI() || !mobileCartList) return;
    mobileCartList.innerHTML = '';
    (items || []).forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'sheet-item';
        row.innerHTML = `
            <div class="name">${item.name}</div>
            <div class="qty-controls">
                <button data-idx="${idx}" data-act="dec">-</button>
                <span>${item.qty}</span>
                <button data-idx="${idx}" data-act="inc">+</button>
            </div>`;
        mobileCartList.appendChild(row);
    });
    // Delegate click for qty controls
    mobileCartList.onclick = (e) => {
        const btn = e.target.closest('button[data-idx]');
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const currentOrderKey = getCurrentOrderKey();
        let orderObj = tableOrders[currentOrderKey];
        if (!orderObj) return;
        // Work with combined list mapping back into object structure
        const combined = [...(orderObj.confirmed || []), ...(orderObj.new || [])];
        const item = combined[idx];
        if (!item) return;
        // Modify qty on 'new' list if exists; otherwise on confirmed list (fallback)
        const newIndex = (orderObj.new || []).findIndex(i => i.name === item.name);
        if (act === 'inc') {
            if (newIndex > -1) orderObj.new[newIndex].qty += 1; else combined[idx].qty += 1;
        } else if (act === 'dec') {
            if (newIndex > -1) {
                orderObj.new[newIndex].qty = Math.max(0, orderObj.new[newIndex].qty - 1);
                if (orderObj.new[newIndex].qty === 0) orderObj.new.splice(newIndex, 1);
            } else {
                combined[idx].qty = Math.max(0, combined[idx].qty - 1);
            }
        }
        // Recompute items based on updated object
        const nextItems = [...(orderObj.confirmed || []), ...(orderObj.new || [])];
        updateTable(nextItems);
        saveStateToLocalStorage();
        openMobileSheet();
    };
}

function bindMobileControls() {
    if (!mobileFab || !mobileCartBar) return;
    const open = () => openMobileSheet();
    mobileFab.onclick = open;
    if (mobileViewCartBtn) mobileViewCartBtn.onclick = open;
    if (mobileConfirmBtn) mobileConfirmBtn.onclick = () => confirmOrder();
    if (mobileSheetConfirm) mobileSheetConfirm.onclick = () => confirmOrder();
    if (mobileSheetClose) mobileSheetClose.onclick = () => closeMobileSheet();
    if (mobileCartBackdrop) mobileCartBackdrop.onclick = () => closeMobileSheet();
}

// Attach on load
window.addEventListener('DOMContentLoaded', bindMobileControls);

// --- Mobile bottom sheet drag gestures ---
(function initMobileSheetDrag(){
    if (!mobileCartSheet || !mobileCartBackdrop) return;
    let startY = 0; let currentY = 0; let isDragging = false; let sheetHeight = 0;

    function onTouchStart(e){
        if (!isMobileUI()) return;
        const touch = e.touches ? e.touches[0] : e;
        startY = touch.clientY; currentY = startY; isDragging = true;
        sheetHeight = mobileCartSheet.getBoundingClientRect().height;
        mobileCartSheet.classList.add('dragging');
        // If closed, allow partial pull-up gesture only from near the bottom
        if (!mobileCartSheet.classList.contains('open')) {
            // Allow drag if user starts near bottom of viewport
            if (startY < window.innerHeight - 120) { isDragging = false; mobileCartSheet.classList.remove('dragging'); }
        }
        e.preventDefault();
    }
    function onTouchMove(e){
        if (!isDragging) return;
        const touch = e.touches ? e.touches[0] : e;
        currentY = touch.clientY;
        const delta = Math.max(0, currentY - startY);
        // Translate sheet down when dragging down; clamp within its height
        const translate = Math.min(sheetHeight, delta);
        mobileCartSheet.style.transform = `translateY(${translate}px)`;
        // Fade backdrop with progress
        const progress = Math.min(1, translate / sheetHeight);
        mobileCartBackdrop.style.opacity = String(1 - progress * 0.8);
        e.preventDefault();
    }
    function onTouchEnd(){
        if (!isDragging) return;
        isDragging = false;
        mobileCartSheet.classList.remove('dragging');
        const delta = Math.max(0, currentY - startY);
        mobileCartSheet.style.transform = '';
        mobileCartBackdrop.style.opacity = '';
        // Threshold: if dragged more than 30% of height, close; otherwise open
        if (delta > sheetHeight * 0.3) {
            closeMobileSheet();
        } else {
            openMobileSheet();
        }
    }

    // Bind to header for drag handle and content for full-area drag
    const header = mobileCartSheet.querySelector('.sheet-header');
    const area = header || mobileCartSheet;
    area.addEventListener('touchstart', onTouchStart, { passive: false });
    area.addEventListener('touchmove', onTouchMove, { passive: false });
    area.addEventListener('touchend', onTouchEnd);
    area.addEventListener('mousedown', onTouchStart);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('mouseup', onTouchEnd);
})();

// Mobile optimizations: compact table labels and category/menu layout
function applyMobileOptimizations() {
    const isMobile = document.body.classList.contains('is-mobile');
    // Shorten table button labels
    if (isMobile) {
        document.querySelectorAll('.table-btn').forEach(btn => {
            const num = btn.dataset.tableNum || btn.textContent.replace(/\D/g, '');
            btn.textContent = `T${num}`;
        });
    }
}

// Enforce mobile-first flow: select table -> show menu sheet; after confirm -> post-confirm sheet
(function initMobileFlow(){
    const isMobile = () => document.body.classList.contains('is-mobile');
    const middlePanel = document.querySelector('.middle-panel');
    let tableChosen = false;

    function disableMenu(disabled){
        if (!middlePanel) return;
        middlePanel.style.pointerEvents = disabled ? 'none' : '';
        middlePanel.style.opacity = disabled ? '0.5' : '';
    }

    // Initially disable menu until a table is selected on mobile
    window.addEventListener('DOMContentLoaded', () => {
        if (isMobile()) disableMenu(true);
    });

    // Hook into selectTable
    const origSelectTable = window.selectTable;
    window.selectTable = function(num){
        if (typeof origSelectTable === 'function') origSelectTable(num);
        if (isMobile() && !tableChosen) {
            tableChosen = true;
            disableMenu(false);
            try { openMobileSheet(); } catch(e){}
        }
    };

    // Post-confirm sheet wiring
    const postSheet = document.getElementById('mobilePostConfirmSheet');
    const postClose = document.getElementById('mobilePostClose');
    const btnBill = document.getElementById('mobileGenerateBill');
    const btnAdd = document.getElementById('mobileAddMoreItems');

    function openPostSheet(){
        if (!postSheet || !isMobile()) return;
        postSheet.classList.add('open');
        mobileCartBackdrop && mobileCartBackdrop.classList.add('visible');
    }
    function closePostSheet(){
        if (!postSheet) return;
        postSheet.classList.remove('open');
        mobileCartBackdrop && mobileCartBackdrop.classList.remove('visible');
    }
    if (postClose) postClose.onclick = closePostSheet;

    if (btnBill) btnBill.onclick = function(){ closePostSheet(); try { printBill(); } catch(e){} };
    if (btnAdd) btnAdd.onclick = function(){ closePostSheet(); try { openMobileSheet(); } catch(e){} };

    // Wrap confirmOrder to show post-confirm sheet on success
    const originalConfirm = window.confirmOrder;
    window.confirmOrder = function(){
        const prevOrderState = JSON.stringify(tableOrders);
        originalConfirm();
        // Poll briefly for state change indicating success
        let tries = 0; const timer = setInterval(() => {
            tries++;
            if (JSON.stringify(tableOrders) !== prevOrderState) {
                clearInterval(timer);
                openPostSheet();
            }
            if (tries > 20) clearInterval(timer);
        }, 150);
    };
})();
