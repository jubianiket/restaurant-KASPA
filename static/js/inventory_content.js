let selectedId = null;

async function loadInventory() {
    try {
        const res = await fetch("/api/inventory");
        const json = await res.json();
        const items = json.data || [];
        const tbody = document.querySelector("#inventoryTable tbody");
        tbody.innerHTML = "";

        items.forEach(row => {
            const tr = document.createElement("tr");
            tr.onclick = () => selectRow(row);
            tr.innerHTML = `
                <td>${row.id}</td>
                <td>${row.name}</td>
                <td>${row.quantity}</td>
                <td>${row.unit}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        alert("Failed to load inventory: " + err);
    }
}

function selectRow(row) {
    selectedId = row.id;
    document.getElementById("itemName").value = row.name;
    document.getElementById("itemQty").value = row.quantity;
    document.getElementById("itemUnit").value = row.unit;
}

async function addOrUpdateItem() {
    const name = document.getElementById("itemName").value.trim();
    const quantity = parseFloat(document.getElementById("itemQty").value);
    const unit = document.getElementById("itemUnit").value.trim();

    if (!name || isNaN(quantity) || !unit) {
        alert("Please fill all fields correctly.");
        return;
    }

    try {
        const res = await fetch("/inventory", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, quantity, unit })
        });

        const json = await res.json();

        if (json.status === "success") {
            alert("Item added.");
            loadInventory();
        } else if (json.message === "Item already exists.") {
            const updateRes = await fetch("/inventory", {
                method: "PUT",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, quantity, unit })
            });
            const updateJson = await updateRes.json();
            alert(updateJson.message);
            if (updateJson.status === "success") loadInventory();
        } else {
            alert(json.message);
        }
    } catch (err) {
        alert("Error: " + err);
    }
}

async function deleteItem() {
    const name = document.getElementById("itemName").value.trim();
    if (!name) {
        alert("Please select an item to delete.");
        return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
        const res = await fetch("/inventory", {
            method: "DELETE",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        const json = await res.json();
        alert(json.message);
        if (json.status === "success") {
            document.getElementById("itemName").value = "";
            document.getElementById("itemQty").value = "";
            document.getElementById("itemUnit").value = "";
            loadInventory();
        }
    } catch (err) {
        alert("Error: " + err);
    }
}

function exportExcel() {
    window.location.href = "/inventory/export";
}

async function importExcel() {
    const fileInput = document.getElementById("excelFile");
    const file = fileInput.files[0];
    if (!file) return alert("Please select an Excel file to upload.");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/inventory/import", {
            method: "POST",
            body: formData
        });

        const json = await res.json();
        alert(json.message);
        if (json.status === "success") {
            loadInventory();
            fileInput.value = "";
        }
    } catch (err) {
        alert("Import error: " + err);
    }
}

window.onload = loadInventory;
