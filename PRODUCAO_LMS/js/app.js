// js/app.js

window.showLoader = function() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('hidden');
}

window.hideLoader = function() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
}

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    if(sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); 
            navItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            views.forEach(view => view.classList.add('hidden'));
            
            const targetId = e.currentTarget.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
}

// LÓGICA ATUALIZADA: Geração dinâmica de Insights baseada nos KPIs
function updateDashboardData() {
    if (currentUser.accessLevel !== 1) return;
    let total = tasks.length, done = 0, delayed = 0, inProgress = 0;
    const agora = new Date();

    tasks.forEach(task => {
        if (task.status === 'Concluído') {
            done++;
        } else {
            inProgress++;
            const prazoData = new Date(task.deadline);
            if (prazoData < agora) delayed++;
        }
    });

    document.getElementById('kpi-total').textContent = total;
    document.getElementById('kpi-progress').textContent = inProgress;
    document.getElementById('kpi-delayed').textContent = delayed;
    document.getElementById('kpi-done').textContent = done;

    // Gerador de mensagens textuais no painel
    const insightsElement = document.getElementById('dashboard-insights');
    if (insightsElement) {
        if (total === 0) {
            insightsElement.innerHTML = "A base de dados está vazia. Comece atribuindo novas tarefas para a equipe!";
            insightsElement.style.color = "var(--texto-mutado)";
        } else if (delayed > 0) {
            insightsElement.innerHTML = `⚠️ <strong>Atenção:</strong> Há <strong>${delayed} tarefa(s) atrasada(s)</strong> no momento. Sugerimos priorizar o acompanhamento destas pendências.`;
            insightsElement.style.color = "var(--cor-laranja)";
        } else if (inProgress > 0) {
            insightsElement.innerHTML = `🚀 Operação saudável e em andamento. A equipe está focada em <strong>${inProgress} demanda(s)</strong> dentro do prazo estipulado.`;
            insightsElement.style.color = "var(--cor-azul-forte)";
        } else if (done === total && total > 0) {
            insightsElement.innerHTML = `✅ <strong>Excelente trabalho!</strong> Todas as tarefas atribuídas foram concluídas com sucesso e não há novas pendências.`;
            insightsElement.style.color = "var(--cor-verde-lima)";
        } else {
            insightsElement.innerHTML = "O motor de dados está analisando o andamento das tarefas em tempo real.";
        }
    }
}

function renderSystemData() {
    if (typeof renderTasks === 'function') renderTasks(); 
    if (typeof renderHistoryTasks === 'function') renderHistoryTasks();
    updateDashboardData(); 
    renderReportsTable();
    if (currentUser.accessLevel === 1) {
        renderFoldersAdminList();
    }
}

function renderReportsTable() {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody || currentUser.accessLevel !== 1) return;
    
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        const formattedDate = new Date(task.deadline).toLocaleString('pt-BR');
        const folderLocation = task.subfolder ? `${task.folder} > ${task.subfolder}` : task.folder;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${task.id}</td>
            <td><strong>${task.title}</strong></td>
            <td>${folderLocation}</td>
            <td>${task.status}</td>
            <td>${task.priority}</td>
            <td>${formattedDate}</td>
        `;
        tbody.appendChild(row);
    });
}

function exportToCSV() {
    if (tasks.length === 0) {
        showToast("Não há tarefas para exportar.", "error");
        return;
    }

    let csvContent = "ID,Titulo,Pasta,Subpasta,Status,Prioridade,Prazo,Descricao\n";

    tasks.forEach(task => {
        const id = task.id;
        const title = `"${task.title.replace(/"/g, '""')}"`;
        const folder = `"${task.folder}"`;
        const subfolder = `"${task.subfolder || ''}"`;
        const status = `"${task.status}"`;
        const priority = `"${task.priority}"`;
        const deadline = `"${new Date(task.deadline).toLocaleString('pt-BR')}"`;
        const desc = `"${task.description.replace(/"/g, '""').replace(/\n/g, ' ')}"`;

        csvContent += `${id},${title},${folder},${subfolder},${status},${priority},${deadline},${desc}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_lms_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Relatório exportado com sucesso!", "success");
}

function renderFoldersAdminList() {
    const listContainer = document.getElementById('admin-folders-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    lmsFolders.forEach(folder => {
        const subs = folder.subfolders && folder.subfolders.length > 0 ? folder.subfolders.join(', ') : 'Nenhuma subpasta';
        const div = document.createElement('div');
        div.style.cssText = "background: var(--fundo-pagina); padding: 10px 15px; border-radius: 6px; border: 1px solid var(--borda); display: flex; justify-content: space-between; align-items: center;";
        div.innerHTML = `
            <div>
                <strong>📂 ${folder.name}</strong> <br>
                <small style="color: var(--texto-mutado);">Subpastas: ${subs}</small>
            </div>
            <button onclick="removeFolder('${folder.id}')" class="btn-danger">Remover Pasta</button>
        `;
        listContainer.appendChild(div);
    });
}

window.removeFolder = async function(folderId) {
    if (confirm("Tem certeza que deseja remover esta pasta e todas as subpastas associadas?")) {
        showLoader();
        try {
            const { error } = await supabaseClient.from('lms_folders').delete().eq('id', folderId);
            if (error) throw error;
            
            lmsFolders = lmsFolders.filter(f => f.id !== folderId);
            renderSystemData();
            populateFolderSelects();
            showToast("Pasta removida com sucesso.", "success");
        } catch (err) {
            console.error(err);
            showToast("Erro ao remover pasta no banco de dados.", "error");
        }
        hideLoader();
    }
}

function setupFolderAdminForms() {
    const addFolderForm = document.getElementById('add-folder-form');
    if (addFolderForm) {
        const newForm = addFolderForm.cloneNode(true);
        addFolderForm.parentNode.replaceChild(newForm, addFolderForm);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const folderNameInput = document.getElementById('new-folder-name').value.trim().toUpperCase();
            if (!folderNameInput) return;

            const newId = folderNameInput.toLowerCase().replace(/[^a-z0-9]/g, '_');
            
            showLoader();
            try {
                const newFolder = { id: newId, name: folderNameInput, subfolders: [] };
                const { error } = await supabaseClient.from('lms_folders').insert([newFolder]);
                if (error) throw error;

                lmsFolders.push(newFolder);
                renderSystemData();
                populateFolderSelects();
                newForm.reset();
                showToast('Pasta principal criada com sucesso!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Erro ao criar pasta no banco de dados.', 'error');
            }
            hideLoader();
        });
    }

    const addSubfolderForm = document.getElementById('add-subfolder-form');
    if (addSubfolderForm) {
        const newSubForm = addSubfolderForm.cloneNode(true);
        addSubfolderForm.parentNode.replaceChild(newSubForm, addSubfolderForm);

        newSubForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const parentName = document.getElementById('select-parent-folder').value;
            const subName = document.getElementById('new-subfolder-name').value.trim().toUpperCase();
            if (!parentName || !subName) return;

            const folderObj = lmsFolders.find(f => f.name === parentName);
            if (folderObj) {
                if (!folderObj.subfolders.includes(subName)) {
                    showLoader();
                    try {
                        const updatedSubfolders = [...folderObj.subfolders, subName];
                        const { error } = await supabaseClient.from('lms_folders').update({ subfolders: updatedSubfolders }).eq('id', folderObj.id);
                        if (error) throw error;

                        folderObj.subfolders = updatedSubfolders;
                        renderSystemData();
                        populateFolderSelects();
                        newSubForm.reset();
                        showToast('Subpasta adicionada com sucesso!', 'success');
                    } catch (err) {
                        console.error(err);
                        showToast('Erro ao adicionar subpasta.', 'error');
                    }
                    hideLoader();
                } else {
                    showToast('Esta subpasta já existe nesta pasta.', 'error');
                }
            }
        });
    }
}

function renderTeamTable() {
    const tbody = document.getElementById('team-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    lmsTeam.forEach(user => {
        const accessBadge = user.accessLevel === 1 
            ? `<span class="badge-access level-1">Nível 1</span>`
            : `<span class="badge-access level-2">Nível 2</span>`;
            
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${user.id}</td>
            <td><strong>${user.name}</strong></td>
            <td>${user.role}</td>
            <td>${accessBadge}</td>
            <td><button onclick="removeUser(${user.id})" class="btn-danger">Remover</button></td>
        `;
        tbody.appendChild(row);
    });
}

window.removeUser = async function(userId) {
    if (userId === currentUser.id) {
        showToast("Você não pode remover seu próprio usuário.", "error");
        return;
    }
    if(confirm("Remover este colaborador permanentemente?")) {
        showLoader();
        try {
            const { error } = await supabaseClient.from('lms_team').delete().eq('id', userId);
            if (error) throw error;

            const index = lmsTeam.findIndex(u => u.id === userId);
            if(index > -1) lmsTeam.splice(index, 1); 
            renderTeamTable(); 
            populateAssignees(); 
            renderSystemData(); 
            showToast("Colaborador removido.", "success");
        } catch (err) {
            console.error(err);
            showToast("Erro ao remover usuário do banco de dados.", "error");
        }
        hideLoader();
    }
}

function setupAddUserForm() {
    const form = document.getElementById('add-user-form');
    if(!form) return;
    
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-user-name').value.trim();
        const email = document.getElementById('new-user-email').value.trim().toLowerCase();
        const roleSelect = document.getElementById('new-user-role').value; 
        const dadosSelect = roleSelect.split('|');
        
        showLoader();
        try {
            const newUserDb = {
                name: name,
                role: dadosSelect[1],
                access_level: parseInt(dadosSelect[0]),
                email: email
            };

            const { data, error } = await supabaseClient.from('lms_team').insert([newUserDb]).select().single();
            if (error) throw error;

            lmsTeam.push({
                id: data.id,
                name: data.name,
                role: data.role,
                accessLevel: data.access_level,
                email: data.email
            }); 
            
            renderTeamTable(); 
            populateAssignees(); 
            newForm.reset();
            showToast("Colaborador cadastrado no banco de dados!", "success");
        } catch (err) {
            console.error(err);
            showToast("Erro ao cadastrar. O e-mail já existe?", "error");
        }
        hideLoader();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    showLoader(); 
    
    if (typeof carregarDadosDoBanco === 'function') {
        await carregarDadosDoBanco();
    }

    initializeAuthentication();
    setupNavigation(); 
    
    if (currentUser.accessLevel === 1) {
        renderTeamTable();
        setupAddUserForm();
        setupFolderAdminForms();
        renderFoldersAdminList();
        
        const btnExport = document.getElementById('btn-export-csv');
        if(btnExport) btnExport.addEventListener('click', exportToCSV);
    }
    
    populateFolderSelects();
    populateAssignees();
    setupTaskForm();
    renderSystemData();
    
    hideLoader(); 
});