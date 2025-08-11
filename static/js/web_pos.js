function loadPage(path) {
    const frame = document.getElementById("contentFrame");
    const sep = path.includes('?') ? '&' : '?';
    frame.src = `${path}${sep}v=${Date.now()}`;
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

function reloadHistoryIfVisible() {
    try {
        const frame = document.getElementById("contentFrame");
        const url = new URL(frame.src, window.location.origin);
        if (url.pathname === "/history" && frame.contentWindow && frame.contentWindow.reloadOrderHistory) {
            frame.contentWindow.reloadOrderHistory();
        }
    } catch (e) {}
}

// Sidebar elements
const sidebar = document.getElementById("sidebar");
const main = document.getElementById("mainContent");
const toggleBtn = document.getElementById("sidebarToggle");
const mobileToggleBtn = document.getElementById("mobileSidebarToggle");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const headerEl = document.querySelector(".header");
const contentFrame = document.getElementById("contentFrame");

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

function isMobile() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const tallNarrow = h / Math.max(1, w) >= 16 / 9;
    return w <= 768 || tallNarrow;
}

function applyViewportVars() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const headerH = headerEl ? headerEl.offsetHeight : 0;
    document.documentElement.style.setProperty("--vw", `${w}px`);
    document.documentElement.style.setProperty("--vh", `${h}px`);
    document.documentElement.style.setProperty("--header-h", `${headerH}px`);
}

function applyResponsiveClasses() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isPortrait = h >= w;
    const tallNarrow = h / Math.max(1, w) >= 16 / 9;
    document.body.classList.toggle("is-mobile", isMobile());
    document.body.classList.toggle("is-portrait", isPortrait);
    document.body.classList.toggle("is-tall-narrow", tallNarrow);
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
    if (isMobile()) {
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

function applyResponsive() {
    applyViewportVars();
    applyResponsiveClasses();
    if (isMobile()) {
        // Ensure off-canvas by default until opened
        closeMobileSidebar();
        // Remove desktop collapsed state to avoid conflicts
        sidebar.classList.remove("collapsed");
        main.classList.remove("sidebar-collapsed");
    } else {
        // Restore desktop collapsed state from preference
        sidebarBackdrop.classList.remove("visible");
        sidebar.classList.remove("open");
        const stored = localStorage.getItem("sidebarCollapsed");
        setSidebarCollapsed(stored === "1");
    }
}

// Apply on load
window.addEventListener("DOMContentLoaded", () => {
    applyResponsive();
});

// Apply on resize (debounced)
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        applyResponsive();
    }, 100);
});

// Initial load
setInterval(updateClock, 1000);
fetchDashboardSummary();
fetchSettings();
updateClock();

// Make accessible to iframe
window.fetchSettings = fetchSettings;
