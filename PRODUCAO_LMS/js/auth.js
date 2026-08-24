// js/auth.js

function initializeAuthentication() {
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent = currentUser.role;

    const nav = document.getElementById('sidebar-nav');
    
    let navHTML = `
        <a href="#" class="nav-item active" data-target="view-workspace">Meu Workspace</a>
        <a href="#" class="nav-item" data-target="view-history">Histórico</a>
    `;

    if (currentUser.accessLevel === 1) {
        navHTML += `
            <a href="#" class="nav-item" data-target="view-dashboard">Dashboard Global</a>
            <a href="#" class="nav-item" data-target="view-reports">Relatórios de Produtividade</a>
            <a href="#" class="nav-item" data-target="view-folders-admin">Gerenciar Pastas</a>
            <a href="#" class="nav-item" data-target="view-settings">Configurações de Equipe</a>
        `;
        
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            adminPanel.classList.remove('hidden');
        }
    }

    nav.innerHTML = navHTML;
}