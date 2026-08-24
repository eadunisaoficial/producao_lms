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
        renderPermUserSelect();
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

function exportToExcel() {
    if (tasks.length === 0) {
        showToast("Não há tarefas para exportar.", "error");
        return;
    }

    const dataToExport = tasks.map(task => {
        const prazoDate = new Date(task.deadline);
        const prazoFormatado = prazoDate.toLocaleString('pt-BR');

        let dataConclusao = "Pendente";
        let horaConclusao = "-";
        let responsavel = "-";
        let statusPrazo = "-";

        if (task.status === 'Concluído') {
            if (task.completed_at) {
                const concluidoEm = new Date(task.completed_at);
                dataConclusao = concluidoEm.toLocaleDateString('pt-BR');
                horaConclusao = concluidoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                responsavel = task.completed_by || "Não registrado";

                if (concluidoEm <= prazoDate) {
                    statusPrazo = "Concluída dentro do prazo";
                } else {
                    statusPrazo = "Concluída com atraso";
                }
            } else {
                dataConclusao = "Dado histórico";
                responsavel = "Sistema legado";
                statusPrazo = "Indefinido";
            }
        }

        let chatCompleto = "Sem observações";
        if (Array.isArray(task.observations) && task.observations.length > 0) {
            chatCompleto = task.observations.map(obs => {
                return `[${obs.date}] ${obs.author}: ${obs.text}`;
            }).join('\n\n');
        }

        const assignedNames = task.assignees.map(id => {
            const u = lmsTeam.find(user => user.id === id);
            return u ? u.name : 'Desconhecido';
        }).join(', ');

        return {
            "ID Tarefa": task.id,
            "Título": task.title,
            "Pasta Principal": task.folder,
            "Subpasta": task.subfolder || "-",
            "Status Atual": task.status,
            "Prioridade": task.priority,
            "Atribuída para": assignedNames,
            "Prazo Estipulado": prazoFormatado,
            "Data de Conclusão": dataConclusao,
            "Hora de Conclusão": horaConclusao,
            "Responsável pela Conclusão": responsavel,
            "Situação do Prazo": statusPrazo,
            "Conversa do Chat": chatCompleto,
            "Descrição da Tarefa": task.description
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório_Tarefas_LMS");

    const wscols = [
        {wch: 10}, {wch: 40}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 15},
        {wch: 35}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 30}, {wch: 25},
        {wch: 100}, {wch: 60} 
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `relatorio_operacao_lms_${new Date().getTime()}.xlsx`);
    showToast("Relatório baixado em Excel (.xlsx) com sucesso!", "success");
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
            <td>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editUser(${user.id})" class="btn-sm" style="background-color: var(--cor-azul-forte); color: white; padding: 6px 12px;">Editar</button>
                    <button onclick="removeUser(${user.id})" class="btn-sm btn-danger" style="padding: 6px 12px;">Remover</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.editingUserId = null;

window.editUser = function(userId) {
    const user = lmsTeam.find(u => u.id === userId);
    if (!user) return;

    editingUserId = userId;
    
    document.getElementById('form-user-title').textContent = 'Editar Colaborador';
    document.getElementById('new-user-name').value = user.name;
    document.getElementById('new-user-email').value = user.email;
    document.getElementById('new-user-email').disabled = true; 
    document.getElementById('new-user-role-text').value = user.role;
    document.getElementById('new-user-level').value = user.accessLevel;

    document.getElementById('btn-submit-user').textContent = '💾 Salvar Alterações';
    document.getElementById('btn-cancel-user-edit').classList.remove('hidden');

    document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Modo de edição ativado.", "success");
}

window.cancelUserEdit = function() {
    editingUserId = null;
    document.getElementById('add-user-form').reset();
    document.getElementById('form-user-title').textContent = 'Adicionar Novo Colaborador';
    document.getElementById('new-user-email').disabled = false;
    document.getElementById('btn-submit-user').textContent = 'Cadastrar na Equipe';
    document.getElementById('btn-cancel-user-edit').classList.add('hidden');
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
        const roleText = document.getElementById('new-user-role-text').value.trim();
        const level = parseInt(document.getElementById('new-user-level').value);
        
        showLoader();
        try {
            if (editingUserId) {
                const { error } = await supabaseClient
                    .from('lms_team')
                    .update({ name: name, role: roleText, access_level: level })
                    .eq('id', editingUserId);

                if (error) throw error;

                const userIndex = lmsTeam.findIndex(u => u.id === editingUserId);
                if (userIndex !== -1) {
                    lmsTeam[userIndex].name = name;
                    lmsTeam[userIndex].role = roleText;
                    lmsTeam[userIndex].accessLevel = level;
                }

                renderTeamTable();
                populateAssignees();
                cancelUserEdit();
                showToast("Cargo e dados atualizados com sucesso!", "success");
                
            } else {
                const maxId = lmsTeam.length > 0 ? Math.max(...lmsTeam.map(u => u.id)) : 0;
                const nextId = maxId + 1;

                const newUserDb = {
                    id: nextId,
                    name: name,
                    role: roleText,
                    access_level: level,
                    email: email
                };

                const { data, error } = await supabaseClient.from('lms_team').insert([newUserDb]).select().single();
                if (error) throw error;

                lmsTeam.push({
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    accessLevel: data.access_level,
                    email: data.email,
                    customPermissions: {} 
                }); 
                
                renderTeamTable(); 
                populateAssignees(); 
                newForm.reset();
                showToast("Colaborador cadastrado no banco de dados!", "success");
            }
        } catch (err) {
            console.error(err);
            if (err.code === '23505') {
                showToast("Erro: Este e-mail já pertence a outro colaborador.", "error");
            } else {
                showToast("Erro ao processar a solicitação.", "error");
            }
        }
        hideLoader();
    });
}

// LOGICA DE PERMISSÕES AUTONOMAS NÍVEL 2
function renderPermUserSelect() {
    const select = document.getElementById('perm-user-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um Colaborador de Nível 2...</option>';
    
    // Mostra apenas Nível 2 na lista de autonomia
    lmsTeam.filter(u => u.accessLevel === 2).forEach(user => {
        select.innerHTML += `<option value="${user.id}">${user.name} (${user.role})</option>`;
    });

    select.addEventListener('change', loadPermissionsUser);
}

function loadPermissionsUser() {
    const userId = parseInt(document.getElementById('perm-user-select').value);
    const configArea = document.getElementById('perm-config-area');
    
    if (!userId) {
        configArea.classList.add('hidden');
        return;
    }

    const user = lmsTeam.find(u => u.id === userId);
    const perms = user.customPermissions || {};
    
    document.getElementById('perm-can-create').checked = perms.can_create_tasks || false;
    
    const container = document.getElementById('perm-folders-container');
    container.innerHTML = '';
    
    const allowed = perms.allowed_folders || {};

    lmsFolders.forEach(folder => {
        const isFolderChecked = allowed.hasOwnProperty(folder.name);
        let subsHtml = '';
        
        if (folder.subfolders && folder.subfolders.length > 0) {
            folder.subfolders.forEach(sub => {
                const isSubChecked = isFolderChecked && allowed[folder.name].includes(sub);
                subsHtml += `
                    <label style="display: flex; align-items: center; gap: 5px; margin-left: 25px; font-size: 0.9rem; color: var(--texto-escuro);">
                        <input type="checkbox" class="perm-subfolder" data-parent="${folder.name}" value="${sub}" ${isSubChecked ? 'checked' : ''}>
                        ${sub}
                    </label>
                `;
            });
        }

        container.innerHTML += `
            <div style="margin-bottom: 10px; background: white; padding: 10px; border-radius: 4px; border: 1px solid var(--borda);">
                <label style="display: flex; align-items: center; gap: 8px; font-weight: bold; color: var(--cor-azul-forte); margin-bottom: 8px;">
                    <input type="checkbox" class="perm-folder" value="${folder.name}" ${isFolderChecked ? 'checked' : ''} onchange="toggleSubfolders(this, '${folder.name}')">
                    ${folder.name}
                </label>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    ${subsHtml}
                </div>
            </div>
        `;
    });

    configArea.classList.remove('hidden');
}

window.toggleSubfolders = function(folderCheckbox, folderName) {
    const subs = document.querySelectorAll(`.perm-subfolder[data-parent="${folderName}"]`);
    subs.forEach(sub => sub.checked = folderCheckbox.checked);
}

window.savePermissions = async function() {
    const userId = parseInt(document.getElementById('perm-user-select').value);
    if (!userId) return;

    const canCreate = document.getElementById('perm-can-create').checked;
    const allowedFolders = {};

    // Mapeia todas as caixas de pastas que foram marcadas
    document.querySelectorAll('.perm-folder:checked').forEach(fCb => {
        const folderName = fCb.value;
        allowedFolders[folderName] = [];
        
        // Pega as subpastas marcadas que pertencem a essa pasta mãe
        document.querySelectorAll(`.perm-subfolder[data-parent="${folderName}"]:checked`).forEach(sCb => {
            allowedFolders[folderName].push(sCb.value);
        });
    });

    const newPerms = {
        can_create_tasks: canCreate,
        allowed_folders: allowedFolders
    };

    showLoader();
    try {
        const { error } = await supabaseClient.from('lms_team')
            .update({ custom_permissions: newPerms })
            .eq('id', userId);

        if (error) throw error;

        const userIndex = lmsTeam.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            lmsTeam[userIndex].customPermissions = newPerms;
        }

        showToast("Permissões de autonomia salvas com sucesso!", "success");
    } catch (err) {
        console.error(err);
        showToast("Erro ao salvar permissões.", "error");
    }
    hideLoader();
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
        renderPermUserSelect();
        
        const btnExport = document.getElementById('btn-export-excel');
        if(btnExport) btnExport.addEventListener('click', exportToExcel);
    }
    
    populateFolderSelects();
    populateAssignees();
    setupTaskForm();
    renderSystemData();
    
    // A GRANDE MÁGICA: Se for nível 2, mas tiver autonomia, exibe o painel de criar tarefas
    if (currentUser.accessLevel === 2 && currentUser.customPermissions && currentUser.customPermissions.can_create_tasks) {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) adminPanel.classList.remove('hidden');
    }

    hideLoader(); 
});
