function loadPage(path) {
    document.getElementById("contentFrame").src = path;
}

function updateClock() {
    const now = new Date();
    document.getElementById("clock").innerText = `⏰ ${now.toLocaleTimeString()}`;
}

function fetchDashboardSummary() {
    fetch("/api/dashboard-summary")
        .then(res => res.json())
        .then(data => {
            document.getElementById("salesSummary").innerText =
                `🗓️ ${data.date}\n💰 Total Sales: ₹${data.total_sales}\n🧾 Orders Today: ${data.orders_today}\n🔐 Expiry: ${data.license_expiry}`;
        });
}

function fetchSettings() {
    fetch("/api/settings")
        .then(res => res.json())
        .then(data => {
            const name = data.data.restaurant_name || "Restaurant";
            document.getElementById("restaurantName").innerText = name;
            document.getElementById("welcomeRestaurant").innerText = name;
        });
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
}

// Sidebar collapse/expand functionality
const sidebar = document.getElementById("sidebar");
const main = document.getElementById("mainContent");
const toggleBtn = document.getElementById("sidebarToggle");

function setSidebarCollapsed(collapsed) {
    if (collapsed) {
        sidebar.classList.add("collapsed");
        main.classList.add("sidebar-collapsed");
        localStorage.setItem("sidebarCollapsed", "1");
    } else {
        sidebar.classList.remove("collapsed");
        main.classList.remove("sidebar-collapsed");
        localStorage.setItem("sidebarCollapsed", "0");
    }
}

toggleBtn.addEventListener("click", () => {
    const collapsed = sidebar.classList.contains("collapsed");
    setSidebarCollapsed(!collapsed);
});

function shouldAutoCollapse() {
    return window.matchMedia("(max-width: 700px), (max-aspect-ratio: 9/16)").matches;
}

// Apply saved sidebar state on load
window.addEventListener("DOMContentLoaded", () => {
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored === null) {
        setSidebarCollapsed(shouldAutoCollapse());
    } else {
        setSidebarCollapsed(stored === "1");
    }
});

window.addEventListener("resize", () => {
    if (localStorage.getItem("sidebarCollapsed") === null) {
        setSidebarCollapsed(shouldAutoCollapse());
    }
});

// Initial load
setInterval(updateClock, 1000);
fetchDashboardSummary();
fetchSettings();
updateClock();

// Make accessible to iframe
window.fetchSettings = fetchSettings;
