// Set up date filters and load orders on page load
window.onload = () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('toDate').value = today;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    document.getElementById('fromDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    loadOrders();
};
let allOrders = [];

function formatItemsForDisplay(items) {
    if (!Array.isArray(items) || items.length === 0) return "N/A";
    return items.map(item => `${item.name} x${item.qty}`).join(", ");
}


function updateEditTotal() {
    const subtotal = parseFloat(document.getElementById("editSubtotal").value) || 0;
    const gst = parseFloat(document.getElementById("editGst").value) || 0;
    document.getElementById("editTotal").value = (subtotal + gst).toFixed(2);
}

async function loadOrders() {
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;
    let url = window.location.origin + "/orders";
    const params = [];
    if (from) params.push(`from_date=${from}`);
    if (to) params.push(`to_date=${to}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        if (json.status !== 'success') throw new Error(json.message || 'API error');
        allOrders = json.data || [];

        const tbody = document.querySelector("#ordersTable tbody");
        tbody.innerHTML = "";
        allOrders.forEach(row => {
            const tr = document.createElement("tr");
            tr.className = row.status === "completed" ? "completed" : "pending";
            const sub = Number(row.sub_total ?? row.subtotal ?? 0);
            const gst = Number(row.gst ?? 0);
            const ttl = Number(row.total ?? 0);
            tr.innerHTML = `
                <td>${row.id}</td>
                <td>${row.order_type}</td>
                <td>${row.table_number || 'N/A'}</td>
                <td>${formatItemsForDisplay(row.items)}</td>
                <td>${sub.toFixed(2)}</td>
                <td>${gst.toFixed(2)}</td>
                <td>${ttl.toFixed(2)}</td>
                <td>${formatDateTime(row.date)}</td>
                <td>${row.status}</td>
                <td class="action-buttons"><button onclick='openEditModal(${row.id})'>✏️ Edit</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Failed to load orders:", error);
        alert("Error loading orders.");
    }
}

function openEditModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return alert("Order not found!");

    document.getElementById("editOrderId").value = order.id;
    // Render items as editable rows
    const itemsContainer = document.getElementById("editItemsContainer");
    itemsContainer.innerHTML = "";
    let items = order.items;
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) {}
    }
    if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch(e) {}
}
    (items || []).forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "edit-item-row";
        row.innerHTML = `
            <input type="text" class="edit-item-name" value="${item.name}" placeholder="Name" style="width:120px;" />
            <input type="number" class="edit-item-qty" value="${item.qty}" min="1" placeholder="Qty" style="width:60px;" />
            <input type="number" class="edit-item-rate" value="${item.rate}" min="0" step="0.01" placeholder="Rate" style="width:80px;" />
        `;
        itemsContainer.appendChild(row);
    });
    document.getElementById("editSubtotal").value = Number(order.sub_total || 0);
    document.getElementById("editGst").value = Number(order.gst || 0);
    document.getElementById("editTotal").value = Number(order.total || 0);
    document.getElementById("editSubtotal").oninput = updateEditTotal;
    document.getElementById("editGst").oninput = updateEditTotal;
    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
    document.getElementById("editSubtotal").oninput = null;
    document.getElementById("editGst").oninput = null;
}

async function saveOrderEdit() {
    const id = document.getElementById("editOrderId").value;
    const subtotal = parseFloat(document.getElementById("editSubtotal").value);
    const gst = parseFloat(document.getElementById("editGst").value);
    const total = parseFloat(document.getElementById("editTotal").value);
    // Collect items from editable rows
    const items = Array.from(document.querySelectorAll("#editItemsContainer .edit-item-row")).map(row => {
        return {
            name: row.querySelector(".edit-item-name").value,
            qty: parseInt(row.querySelector(".edit-item-qty").value),
            rate: parseFloat(row.querySelector(".edit-item-rate").value)
        };
    });
    // Use correct field names for backend
    const data = { items, sub_total: subtotal, gst, total };

    try {
        const res = await fetch(`/orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const json = await res.json();
        if (json.status === "success") {
            alert("Order updated.");
            closeEditModal();
            loadOrders();
        } else {
            alert("Error: " + json.message);
        }
    } catch (error) {
        alert("Error saving order.");
        console.error(error);
    }
}

function exportToExcel() {
    const table = document.getElementById("ordersTable");
    let csv = [];

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
    csv.push(headers.join(','));

    table.querySelectorAll('tbody tr').forEach(row => {
        let rowData = [];
        row.querySelectorAll('td').forEach((td, index) => {
            let cellText = td.innerText.trim();
            if (headers[index] === 'Items' && cellText.includes(',')) {
                cellText = `"${cellText.replace(/"/g, '""')}"`;
            }
            rowData.push(cellText);
        });
        csv.push(rowData.join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: "text/csv" });
    const downloadLink = document.createElement("a");
    downloadLink.download = `order_history_${new Date().toISOString().slice(0,10)}.csv`;
    downloadLink.href = URL.createObjectURL(blob);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    let yyyy = d.getFullYear();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let dd = String(d.getDate()).padStart(2, '0');
    let hh = d.getHours();
    let min = String(d.getMinutes()).padStart(2, '0');
    let ss = String(d.getSeconds()).padStart(2, '0');
    let ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    if (hh === 0) hh = 12;
    hh = String(hh).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} ${ampm}`;
}

// Expose reloader globally for cross-page refresh triggers
window.reloadOrderHistory = loadOrders;
