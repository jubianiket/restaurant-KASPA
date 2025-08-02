let selectedId = null;

function fetchMenuItems() {
  fetch('/menu_items')
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        const tbody = document.querySelector("#menuTable tbody");
        tbody.innerHTML = '';
        data.data.forEach(item => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.rate}</td>
            <td>${item.category}</td>
            <td>${item.portion || ''}</td>
          `;
          row.onclick = () => {
            document.getElementById('name').value = item.name;
            document.getElementById('rate').value = item.rate;
            document.getElementById('category').value = item.category;
            document.getElementById('portion').value = item.portion || '';
            selectedId = item.id;
          };
          tbody.appendChild(row);
        });
      }
    });
}

function addItem() {
  const name = document.getElementById('name').value;
  const rate = parseFloat(document.getElementById('rate').value);
  const category = document.getElementById('category').value;
  const portion = document.getElementById('portion').value;

  if (!name || isNaN(rate)) {
    alert('Name and valid Rate are required.');
    return;
  }

  fetch('/menu_items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, rate, category, portion })
  }).then(res => res.json()).then(data => {
    if (data.status === 'success') {
      fetchMenuItems();
    }
  });
}

function updateItem() {
  if (!selectedId) return alert('Select a menu item to update.');
  const name = document.getElementById('name').value;
  const rate = parseFloat(document.getElementById('rate').value);
  const category = document.getElementById('category').value;
  const portion = document.getElementById('portion').value;

  fetch(`/menu_items/${selectedId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, rate, category, portion })
  }).then(res => res.json()).then(data => {
    if (data.status === 'success') {
      fetchMenuItems();
      selectedId = null;
    }
  });
}

function deleteItem() {
  if (!selectedId) return alert('Select a menu item to delete.');
  if (!confirm('Delete selected item?')) return;

  fetch(`/menu_items/${selectedId}`, {
    method: 'DELETE'
  }).then(res => res.json()).then(data => {
    if (data.status === 'success') {
      fetchMenuItems();
      selectedId = null;
    }
  });
}

function uploadExcel() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];
  if (!file) return alert("Please select an Excel file.");

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    json.forEach(row => {
      const name = row.Name || row.name;
      const rate = parseFloat(row.Rate || row.rate);
      const category = row.Category || '';
      const portion = row.Portion || '';

      if (name && !isNaN(rate)) {
        fetch('/menu_items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, rate, category, portion })
        }).then(res => res.json())
          .then(result => {
            if (result.status !== 'success') {
              console.warn("Error for item:", name, result.message);
            }
          });
      }
    });

    setTimeout(fetchMenuItems, 1000);
    alert("Bulk upload initiated.");
  };

  reader.readAsArrayBuffer(file);
}

fetchMenuItems();
