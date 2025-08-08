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

// Sidebar elements
const sidebar = document.getElementById("sidebar");
const main = document.getElementById("mainContent");
const toggleBtn = document.getElementById("sidebarToggle");
const mobileToggleBtn = document.getElementById("mobileSidebarToggle");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

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

function isMobilePortrait() {
    return window.matchMedia("(orientation: portrait), (max-aspect-ratio: 9/16)").matches;
}

function openMobileSidebar() {
    sidebar.classList.add("open");
    sidebarBackdrop.classList.add("visible");
    document.body.style.overflow = "hidden";
}

function closeMobileSidebar() {
    sidebar.classList.remove("open");
    sidebarBackdrop.classList.remove("visible");
    document.body.style.overflow = "";
}

// Desktop sidebar collapse toggle
toggleBtn.addEventListener("click", () => {
    if (isMobilePortrait()) {
        // In mobile, use off-canvas open instead of collapse mode
        openMobileSidebar();
        return;
    }
    const collapsed = sidebar.classList.contains("collapsed");
    setSidebarCollapsed(!collapsed);
});

// Mobile hamburger toggle
mobileToggleBtn.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
});

// Tap backdrop to close
sidebarBackdrop.addEventListener("click", () => closeMobileSidebar());

// Apply saved sidebar state on load (desktop only)
window.addEventListener("DOMContentLoaded", () => {
    const stored = localStorage.getItem("sidebarCollapsed");
    if (!isMobilePortrait()) {
        if (stored === null) {
            setSidebarCollapsed(false);
        } else {
            setSidebarCollapsed(stored === "1");
        }
    } else {
        // Ensure closed by default on mobile
        closeMobileSidebar();
    }
});

// On resize, switch behavior appropriately
window.addEventListener("resize", () => {
    if (isMobilePortrait()) {
        closeMobileSidebar();
        // Remove desktop collapsed markers to avoid weird state when switching back
        sidebar.classList.remove("collapsed");
        main.classList.remove("sidebar-collapsed");
    } else {
        sidebarBackdrop.classList.remove("visible");
        sidebar.classList.remove("open");
        const stored = localStorage.getItem("sidebarCollapsed");
        setSidebarCollapsed(stored === "1");
    }
});

// Initial load
setInterval(updateClock, 1000);
fetchDashboardSummary();
fetchSettings();
updateClock();

// Make accessible to iframe
window.fetchSettings = fetchSettings;
