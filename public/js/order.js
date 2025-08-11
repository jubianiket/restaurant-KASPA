// Initialize IndexedDB for offline support
const db = new Dexie('RestaurantDB');
db.version(1).stores({
    orders: 'id, table_id, created_at',
    pendingChanges: '++id, operation, data, timestamp'
});

let currentTableId = null;
let retryAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Check online status
function updateOnlineStatus() {
    const offlineBanner = document.getElementById('offlineBanner');
    if (navigator.onLine) {
        offlineBanner.classList.add('hidden');
        syncPendingChanges(); // Try to sync when back online
    } else {
        offlineBanner.classList.remove('hidden');
    }
}

// Handle offline/online events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Function to show/hide loading spinner
function toggleLoading(show) {
    document.getElementById('loadingSpinner').classList.toggle('hidden', !show);
}

// Function to show error message
function showError(message, retryCallback = null) {
    const errorToast = document.getElementById('errorToast');
    const errorMessage = errorToast.querySelector('.error-message');
    const retryBtn = errorToast.querySelector('.retry-btn');
    
    errorMessage.textContent = message;
    errorToast.classList.remove('hidden');
    
    if (retryCallback) {
        retryBtn.onclick = () => {
            errorToast.classList.add('hidden');
            retryCallback();
        };
        retryBtn.style.display = 'block';
    } else {
        retryBtn.style.display = 'none';
    }
    
    setTimeout(() => {
        errorToast.classList.add('hidden');
    }, 5000);
}

// Function to sync pending changes
async function syncPendingChanges() {
    if (!navigator.onLine) return;
    
    const pendingChanges = await db.pendingChanges.toArray();
    
    for (const change of pendingChanges) {
        try {
            switch (change.operation) {
                case 'insert':
                    await supabase.from('orders').insert(change.data);
                    break;
                case 'update':
                    await supabase.from('orders').update(change.data).eq('id', change.data.id);
                    break;
                case 'delete':
                    await supabase.from('orders').delete().eq('id', change.data.id);
                    break;
            }
            await db.pendingChanges.delete(change.id);
        } catch (error) {
            console.error('Error syncing change:', error);
        }
    }
}

// Function to update the orders table
function updateOrdersTable(orders) {
    const tbody = document.querySelector('.order-table-section tbody');
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.item}</td>
            <td>${order.quantity}</td>
            <td>$${order.price}</td>
        </tr>
    `).join('');
}

// Function to fetch orders for a specific table
async function fetchTableOrders(tableId) {
    toggleLoading(true);
    retryAttempts = 0;
    
    async function attemptFetch() {
        try {
            // Try to get from IndexedDB first if offline
            if (!navigator.onLine) {
                const offlineOrders = await db.orders
                    .where('table_id')
                    .equals(tableId)
                    .toArray();
                updateOrdersTable(offlineOrders);
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('table_id', tableId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Update IndexedDB with latest data
            await db.orders.bulkPut(data);
            updateOrdersTable(data);

        } catch (error) {
            if (retryAttempts < MAX_RETRY_ATTEMPTS) {
                retryAttempts++;
                showError(`Error loading orders. Retrying... (${retryAttempts}/${MAX_RETRY_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return attemptFetch();
            }
            showError('Failed to load orders. Please try again later.', () => fetchTableOrders(tableId));
            console.error('Error fetching orders:', error);
        } finally {
            toggleLoading(false);
        }
    }

    await attemptFetch();
}

document.addEventListener('DOMContentLoaded', function() {
    // Sidebar (Select Table) collapse/expand
    const sidebar = document.querySelector('.sidebar');
    const toggleTableListBtn = document.getElementById('toggleTableList');
    
    toggleTableListBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Restore sidebar state from localStorage
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    }

    // Table selection and real-time updates
    const tableBtns = document.querySelectorAll('.table-btn');
    tableBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            tableBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            // Extract table number from button text
            const tableNumber = parseInt(btn.textContent.replace('Table ', ''));
            currentTableId = tableNumber;
            
            // Fetch initial orders for the selected table
            await fetchTableOrders(tableNumber);
        });
    });

    // Set up real-time subscription for orders
    const subscription = supabase
        .channel('orders-channel')
        .on('postgres_changes', 
            {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, 
            payload => {
                // Only update if the change is for the currently selected table
                if (payload.new.table_id === currentTableId) {
                    fetchTableOrders(currentTableId);
                }
            }
        )
        .subscribe();

    // Select first table by default
    if (tableBtns.length > 0) {
        tableBtns[0].click();
    }
});
