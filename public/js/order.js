document.addEventListener('DOMContentLoaded', function() {
    // Sidebar (Select Table) collapse/expand
    const sidebar = document.querySelector('.sidebar');
    const toggleTableListBtn = document.getElementById('toggleTableList');
    const hamburgerIcon = document.querySelector('.hamburger');
    
    toggleTableListBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        // Save state to localStorage
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Restore sidebar state from localStorage
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    }

    // Table selection highlight
    const tableBtns = document.querySelectorAll('.table-btn');
    tableBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tableBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
});
