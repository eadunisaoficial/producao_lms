// js/tasks.js

window.editingTaskId = null;

function populateFolderSelects() {
    const folderSelect = document.getElementById('task-folder');
    const subfolderSelect = document.getElementById('task-subfolder');
    const parentFolderSelect = document.getElementById('select-parent-folder');

    if (folderSelect) {
        folderSelect.innerHTML = '<option value="">Selecione a Pasta...</option>';
        lmsFolders.forEach(folder => {
            
            // TRAVA DE SEGURANÇA PARA O NÍVEL 2 (AUTONOMIA)
            if (currentUser.accessLevel === 2) {
                const allowedFolders = currentUser.customPermissions?.allowed_folders || {};
                // Se a pasta atual não estiver na lista de permitidas dele, ele pula e não mostra no formulário
                if (!allowedFolders.hasOwnProperty(folder.name)) {
                    return; 
                }
            }

            folderSelect.innerHTML += `<option value="${folder.name}">${folder.name}</option>`;
        });

        folderSelect.removeEventListener('change', handleFolderChange);
        folderSelect.addEventListener('change', handleFolderChange);
    }

    if (parentFolderSelect) {
        parentFolderSelect.innerHTML = '<option value="">Selecione a Pasta Principal...</option>';
        lmsFolders.forEach(folder => {
            parentFolderSelect.innerHTML += `<option value="${folder.name}">${folder.name}</option>`;
        });
    }

    const filterAssignee = document.getElementById('filter-assignee');
    const historyFilterAssignee = document.getElementById('history-filter-assignee');
    
    [filterAssignee, historyFilterAssignee].forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">👤 Qualquer Responsável</option>';
            lmsTeam.forEach(user => {
                select.innerHTML += `<option value="${user.id}">${user.name}</option>`;
            });
        }
    });

    setupFilterListeners();
}

function setupFilterListeners() {
    ['filter-search', 'filter-assignee', 'filter-status', 'filter-priority'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.listener) {
            el.dataset.listener = 'true';
            el.addEventListener('input', renderTasks);
            el.addEventListener('change', renderTasks);
        }
    });

    ['history-filter-search', 'history-filter-assignee', 'history-filter-priority'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.listener) {
            el.dataset.listener = 'true';
            el.addEventListener('input', renderHistoryTasks);
            el.addEventListener('change', renderHistoryTasks);
        }
    });
}

function handleFolderChange(e) {
    const selectedFolderName = e.target.value;
    const subfolderSelect = document.getElementById('task-subfolder');
    if (!subfolderSelect) return;

    subfolderSelect.innerHTML = '<option value="">Nenhuma / Geral</option>';
    const found = lmsFolders.find(f => f.name === selectedFolderName);
    
    if (found && found.subfolders) {
        found.subfolders.forEach(sub => {
            
            // TRAVA DE SEGURANÇA (SUBPASTA) PARA O NÍVEL 2
            if (currentUser.accessLevel === 2) {
                const allowedFolders = currentUser.customPermissions?.allowed_folders || {};
                const allowedSubs = allowedFolders[selectedFolderName] || [];
                // Se não estiver na lista de permitidas dele, pula e não exibe
                if (!allowedSubs.includes(sub)) {
                    return; 
                }
            }

            subfolderSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
}

function populateAssignees() {
    const container = document.getElementById('assignees-container');
    if (!container) return; 

    container.innerHTML = '';
    
    lmsTeam.forEach(user => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" name="assignees" value="${user.id}">
            ${user.name}
        `;
        container.appendChild(label);
    });

    const btnSelectAll = document.getElementById('btn-select-all');
    if (btnSelectAll) {
        const newBtn = btnSelectAll.cloneNode(true);
        btnSelectAll.parentNode.replaceChild(newBtn, btnSelectAll);
        
        newBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('input[name="assignees"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        });
    }
}

function changeTaskStatus(taskId, newStatus) {
    showLoader();
    setTimeout(async () => {
        try {
            let updateData = { status: newStatus };

            if (newStatus === 'Concluído') {
                updateData.completed_at = new Date().toISOString();
                updateData.completed_by = currentUser.name;
            } else {
                updateData.completed_at = null;
                updateData.completed_by = null;
            }

            const { error } = await supabaseClient.from('lms_tasks').update(updateData).eq('id', taskId);
            if (error) throw error;

            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].status = newStatus;
                if (newStatus === 'Concluído') {
                    tasks[taskIndex].completed_at = updateData.completed_at;
                    tasks[taskIndex].completed_by = updateData.completed_by;
                } else {
                    tasks[taskIndex].completed_at = null;
                    tasks[taskIndex].completed_by = null;
                }

                if (typeof renderSystemData === 'function') {
                    renderSystemData();
                } else {
                    renderTasks();
                    renderHistoryTasks();
                }
                showToast(`Status atualizado para: ${newStatus}`, 'success');
            }
        } catch (err) {
            console.error(err);
            showToast('Erro ao atualizar status no banco.', 'error');
        }
        hideLoader();
    }, 100); 
}

function saveObservation(taskId) {
    showLoader();
    setTimeout(async () => {
        try {
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const obsInput = document.getElementById(`obs-${taskId}`);
                const obsText = obsInput.value.trim();
                
                if (obsText) {
                    const now = new Date();
                    const formattedDate = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    
                    let currentObs = Array.isArray(tasks[taskIndex].observations) ? [...tasks[taskIndex].observations] : [];
                    currentObs.push({
                        author: currentUser.name,
                        date: formattedDate,
                        text: obsText
                    });

                    const { error } = await supabaseClient.from('lms_tasks').update({ observations: currentObs }).eq('id', taskId);
                    if (error) throw error;

                    tasks[taskIndex].observations = currentObs;
                    if (typeof renderSystemData === 'function') {
                        renderSystemData();
                    } else {
                        renderTasks();
                        renderHistoryTasks();
                    }
                    showToast('Observação gravada no sistema!', 'success');
                } else {
                    showToast('Digite uma observação antes de salvar.', 'error');
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Erro ao gravar observação.', 'error');
        }
        hideLoader();
    }, 100); 
}

window.editTask = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    editingTaskId = taskId;

    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description;
    
    const deadlineInput = document.getElementById('task-deadline');
    deadlineInput.removeAttribute('min');
    deadlineInput.value = task.deadline;
    
    document.getElementById('task-priority').value = task.priority;

    document.getElementById('task-folder').value = task.folder;
    handleFolderChange({ target: { value: task.folder } });
    document.getElementById('task-subfolder').value = task.subfolder || '';

    document.querySelectorAll('input[name="assignees"]').forEach(cb => cb.checked = false);
    task.assignees.forEach(id => {
        const cb = document.querySelector(`input[name="assignees"][value="${id}"]`);
        if (cb) cb.checked = true;
    });

    const linksContainer = document.getElementById('dynamic-links-container');
    linksContainer.innerHTML = '';
    if (task.links && task.links.length > 0) {
        task.links.forEach(link => {
            const row = document.createElement('div');
            row.className = 'form-row link-row';
            row.style.marginBottom = '10px';
            row.innerHTML = `
                <input type="text" class="link-title" value="${link.title || ''}" placeholder="Título (Ex: Planilha de Notas)">
                <input type="url" class="link-url" value="${link.url || ''}" placeholder="https://...">
                <button type="button" class="btn-danger" style="flex: 0 0 auto; width: 40px; padding: 0;" onclick="this.parentElement.remove()">X</button>
            `;
            linksContainer.appendChild(row);
        });
    } else {
        linksContainer.innerHTML = `
            <div class="form-row link-row" style="margin-bottom: 10px;">
                <input type="text" class="link-title" placeholder="Título (Ex: Planilha de Notas)">
                <input type="url" class="link-url" placeholder="https://...">
            </div>
        `;
    }

    document.getElementById('btn-submit-task').textContent = '💾 Salvar Alterações';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    
    const emailGroup = document.getElementById('email-notification-group');
    if(emailGroup) emailGroup.classList.add('hidden');

    document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });

    showToast("Modo de edição ativado.", "success");
}

window.cancelEdit = function() {
    editingTaskId = null;
    document.getElementById('task-form').reset();
    document.getElementById('btn-submit-task').textContent = 'Criar e Atribuir Tarefa';
    document.getElementById('btn-cancel-edit').classList.add('hidden');
    
    const emailGroup = document.getElementById('email-notification-group');
    if(emailGroup) emailGroup.classList.remove('hidden');

    const deadlineInput = document.getElementById('task-deadline');
    const local = new Date();
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    deadlineInput.min = local.toISOString().slice(0, 16);

    populateFolderSelects();

    const dynamicContainer = document.getElementById('dynamic-links-container');
    if(dynamicContainer) {
        dynamicContainer.innerHTML = `
            <div class="form-row link-row" style="margin-bottom: 10px;">
                <input type="text" class="link-title" placeholder="Título (Ex: Planilha de Notas)">
                <input type="url" class="link-url" placeholder="https://...">
            </div>
        `;
    }
}

window.deleteTask = function(taskId) {
    if (confirm("⚠️ TEM CERTEZA? Esta ação excluirá a tarefa permanentemente do banco de dados!")) {
        showLoader();
        setTimeout(async () => {
            try {
                const { error } = await supabaseClient.from('lms_tasks').delete().eq('id', taskId);
                if (error) throw error;

                const index = tasks.findIndex(t => t.id === taskId);
                if (index !== -1) {
                    tasks.splice(index, 1);
                    if (typeof renderSystemData === 'function') {
                        renderSystemData();
                    } else {
                        renderTasks();
                        renderHistoryTasks();
                    }
                    showToast("Tarefa excluída com sucesso!", "success");
                }
            } catch (err) {
                console.error(err);
                showToast("Erro ao excluir do banco de dados.", "error");
            }
            hideLoader();
        }, 100);
    }
}

function sortTasks(a, b) {
    const priorityWeight = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
    const weightA = priorityWeight[a.priority] || 0;
    const weightB = priorityWeight[b.priority] || 0;

    if (weightA !== weightB) {
        return weightB - weightA; 
    }
    return b.id - a.id; 
}

function matchesFilters(task, searchId, assigneeId, statusId, priorityId) {
    const assignedUserMatch = !assigneeId || task.assignees.includes(parseInt(assigneeId));
    const statusMatch = !statusId || task.status === statusId;
    const priorityMatch = !priorityId || task.priority === priorityId;
    
    if (!searchId) return assignedUserMatch && statusMatch && priorityMatch;

    const term = searchId.toLowerCase();
    const matchesText = task.title.toLowerCase().includes(term) || 
                        task.description.toLowerCase().includes(term) || 
                        task.id.toString().includes(term);

    return assignedUserMatch && statusMatch && priorityMatch && matchesText;
}

// CORREÇÃO: Uso de folderIndex e subIndex para garantir IDs HTML únicos
function renderTasks() {
    const container = document.getElementById('folders-container');
    if (!container) return;
    
    const searchText = document.getElementById('filter-search')?.value || '';
    const searchAssignee = document.getElementById('filter-assignee')?.value || '';
    const searchStatus = document.getElementById('filter-status')?.value || '';
    const searchPriority = document.getElementById('filter-priority')?.value || '';

    container.innerHTML = '';

    lmsFolders.forEach((folder, folderIndex) => {
        const folderTasks = tasks.filter(t => t.folder === folder.name && (!t.subfolder || t.subfolder === '') && t.status !== 'Concluído');
        const visibleFolderTasks = folderTasks.filter(t => (currentUser.accessLevel === 1 || t.assignees.includes(currentUser.id)) && matchesFilters(t, searchText, searchAssignee, searchStatus, searchPriority));
        visibleFolderTasks.sort(sortTasks);

        let totalFolderCount = tasks.filter(t => t.folder === folder.name && t.status !== 'Concluído' && (currentUser.accessLevel === 1 || t.assignees.includes(currentUser.id)) && matchesFilters(t, searchText, searchAssignee, searchStatus, searchPriority)).length;

        let subfoldersHtml = '';

        if (folder.subfolders && folder.subfolders.length > 0) {
            folder.subfolders.forEach((sub, subIndex) => {
                const subTasks = tasks.filter(t => t.folder === folder.name && t.subfolder === sub && t.status !== 'Concluído');
                const visibleSubTasks = subTasks.filter(t => (currentUser.accessLevel === 1 || t.assignees.includes(currentUser.id)) && matchesFilters(t, searchText, searchAssignee, searchStatus, searchPriority));
                visibleSubTasks.sort(sortTasks);

                if (visibleSubTasks.length > 0) {
                    let subTasksCardsHtml = '';
                    visibleSubTasks.forEach(task => {
                        subTasksCardsHtml += buildTaskCardHtml(task);
                    });

                    subfoldersHtml += `
                        <div class="subfolder-item" style="margin-top: 10px; border-left: 3px solid var(--cor-verde-lima); padding-left: 10px;">
                            <div class="subfolder-header" onclick="toggleAccordion('sub-${folderIndex}-${subIndex}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--fundo-pagina); border-radius: 4px;">
                                <span style="font-weight: 600; font-size: 0.95rem; color: var(--cor-azul-forte);">📁 Subpasta: ${sub}</span>
                                <span class="badge-access level-2" style="background-color: var(--cor-azul-forte);">(${visibleSubTasks.length})</span>
                            </div>
                            <div id="sub-${folderIndex}-${subIndex}" class="accordion-content hidden" style="margin-top: 10px;">
                                ${subTasksCardsHtml}
                            </div>
                        </div>
                    `;
                }
            });
        }

        let directTasksHtml = '';
        visibleFolderTasks.forEach(task => {
            directTasksHtml += buildTaskCardHtml(task);
        });

        if (currentUser.accessLevel === 2 && totalFolderCount === 0) {
            return;
        }

        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-box';
        folderDiv.style.border = '1px solid var(--borda)';
        folderDiv.style.borderRadius = '8px';
        folderDiv.style.backgroundColor = 'var(--fundo-card)';
        folderDiv.style.overflow = 'hidden';
        folderDiv.style.marginBottom = '15px';

        folderDiv.innerHTML = `
            <div class="folder-header" onclick="toggleAccordion('folder-${folderIndex}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background-color: var(--fundo-pagina); border-bottom: 1px solid var(--borda);">
                <span style="font-weight: bold; font-size: 1.1rem; color: var(--cor-azul-forte);">📂 ${folder.name}</span>
                <span class="badge-access level-1" style="background-color: var(--cor-laranja); font-size: 0.85rem;">Tarefas: ${totalFolderCount}</span>
            </div>
            <div id="folder-${folderIndex}" class="accordion-content hidden" style="padding: 15px 20px;">
                ${directTasksHtml}
                ${subfoldersHtml}
                ${totalFolderCount === 0 ? '<p style="color: var(--texto-mutado); font-size: 0.9rem;">Nenhuma tarefa encontrada com os filtros aplicados.</p>' : ''}
            </div>
        `;

        container.appendChild(folderDiv);
    });
}

function renderHistoryTasks() {
    const container = document.getElementById('history-folders-container');
    if (!container) return;
    
    const searchText = document.getElementById('history-filter-search')?.value || '';
    const searchAssignee = document.getElementById('history-filter-assignee')?.value || '';
    const searchPriority = document.getElementById('history-filter-priority')?.value || '';

    container.innerHTML = '';

    lmsFolders.forEach((folder, folderIndex) => {
        const folderTasks = tasks.filter(t => t.folder === folder.name && (!t.subfolder || t.subfolder === '') && t.status === 'Concluído');
        const visibleFolderTasks = folderTasks.filter(t => (currentUser.accessLevel === 1 || t.assignees.includes(currentUser.id)) && matchesFilters(t, searchText, searchAssignee, 'Concluído', searchPriority));
        visibleFolderTasks.sort(sortTasks);

        let totalFolderCount = tasks.filter(t => t.folder === folder.name && t.status === 'Concluído' && (currentUser.accessLevel === 1 || t.assignees.includes(currentUser.id)) && matchesFilters(t, searchText, searchAssignee, 'Concluído', searchPriority)).length;

        let subfoldersHtml = '';

        if (folder.subfolders && folder.subfolders.length > 0) {
            folder.subfolders.forEach((sub, subIndex) => {
                const subTasks = tasks.filter(t => t.folder === folder.name && t.subfolder === sub && t.status === 'Concluído');
                const visibleSubTasks = subTasks.filter(t => (currentUser.accessLevel === 1 || t.assignees.includes(currentUser.id)) && matchesFilters(t, searchText, searchAssignee, 'Concluído', searchPriority));
                visibleSubTasks.sort(sortTasks);

                if (visibleSubTasks.length > 0) {
                    let subTasksCardsHtml = '';
                    visibleSubTasks.forEach(task => {
                        subTasksCardsHtml += buildTaskCardHtml(task);
                    });

                    subfoldersHtml += `
                        <div class="subfolder-item" style="margin-top: 10px; border-left: 3px solid var(--cor-verde-lima); padding-left: 10px;">
                            <div class="subfolder-header" onclick="toggleAccordion('hist-sub-${folderIndex}-${subIndex}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--fundo-pagina); border-radius: 4px;">
                                <span style="font-weight: 600; font-size: 0.95rem; color: var(--cor-azul-forte);">📁 Subpasta: ${sub}</span>
                                <span class="badge-access level-2" style="background-color: var(--cor-azul-forte);">(${visibleSubTasks.length})</span>
                            </div>
                            <div id="hist-sub-${folderIndex}-${subIndex}" class="accordion-content hidden" style="margin-top: 10px;">
                                ${subTasksCardsHtml}
                            </div>
                        </div>
                    `;
                }
            });
        }

        let directTasksHtml = '';
        visibleFolderTasks.forEach(task => {
            directTasksHtml += buildTaskCardHtml(task);
        });

        if (currentUser.accessLevel === 2 && totalFolderCount === 0) {
            return;
        }

        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-box';
        folderDiv.style.border = '1px solid var(--borda)';
        folderDiv.style.borderRadius = '8px';
        folderDiv.style.backgroundColor = 'var(--fundo-card)';
        folderDiv.style.overflow = 'hidden';
        folderDiv.style.marginBottom = '15px';

        folderDiv.innerHTML = `
            <div class="folder-header" onclick="toggleAccordion('hist-folder-${folderIndex}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background-color: var(--fundo-pagina); border-bottom: 1px solid var(--borda);">
                <span style="font-weight: bold; font-size: 1.1rem; color: var(--cor-azul-forte);">📂 ${folder.name}</span>
                <span class="badge-access level-1" style="background-color: var(--cor-verde-lima); font-size: 0.85rem;">Concluídas: ${totalFolderCount}</span>
            </div>
            <div id="hist-folder-${folderIndex}" class="accordion-content hidden" style="padding: 15px 20px;">
                ${directTasksHtml}
                ${subfoldersHtml}
                ${totalFolderCount === 0 ? '<p style="color: var(--texto-mutado); font-size: 0.9rem;">Nenhuma tarefa encontrada com os filtros aplicados.</p>' : ''}
            </div>
        `;

        container.appendChild(folderDiv);
    });
}

function buildTaskCardHtml(task) {
    const assignedNames = task.assignees.map(id => {
        const u = lmsTeam.find(user => user.id === id);
        return u ? u.name : 'Desconhecido';
    }).join(', ');

    const formattedDate = new Date(task.deadline).toLocaleString('pt-BR');

    const linksHtml = task.links.map(link => {
        if (typeof link === 'string') {
            return `<a href="${link}" target="_blank" class="task-link-box" title="Clique para abrir.">🔗 ${link}</a>`;
        } else if (link && link.url) {
            return `<a href="${link.url}" target="_blank" class="task-link-box" title="Clique para abrir.">🔗 <strong>${link.title}</strong>: ${link.url}</a>`;
        }
        return '';
    }).join('');

    let statusColor = '#1C3B70'; 
    if (task.status === 'Em Andamento') statusColor = '#D97828'; 
    if (task.status === 'Concluído') statusColor = '#99BD2E'; 

    let actionButtons = '';
    if (task.status === 'A Fazer') {
        actionButtons = `<button type="button" onclick="changeTaskStatus(${task.id}, 'Em Andamento')" class="btn-sm" style="margin-top: 15px; background-color: #D97828; color: white; width: 100%;">🚀 Iniciar Tarefa</button>`;
    } else if (task.status === 'Em Andamento') {
        actionButtons = `<button type="button" onclick="changeTaskStatus(${task.id}, 'Concluído')" class="btn-sm" style="margin-top: 15px; background-color: #99BD2E; color: white; width: 100%;">✅ Marcar como Concluído</button>`;
    } else if (task.status === 'Concluído') {
        actionButtons = `<span style="display: block; margin-top: 15px; color: #99BD2E; font-weight: bold; text-align: center;">✓ Tarefa Finalizada</span>`;
    }

    let adminButtons = '';
    if (currentUser.accessLevel === 1) {
        adminButtons = `
            <div style="display: flex; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--borda);">
                <button type="button" onclick="editTask(${task.id})" class="btn-sm" style="flex: 1; background-color: var(--cor-azul-forte); color: white;">✏️ Editar</button>
                <button type="button" onclick="deleteTask(${task.id})" class="btn-sm btn-danger" style="flex: 1;">🗑️ Excluir</button>
            </div>
        `;
    }

    let historyHtml = '';
    if (Array.isArray(task.observations) && task.observations.length > 0) {
        historyHtml = task.observations.map(obs => `
            <div style="margin-bottom: 10px; font-size: 0.85rem; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: var(--cor-laranja);">${obs.author}</strong> <span style="color: var(--texto-mutado); font-size: 0.75rem;">- ${obs.date}</span><br>
                <span style="color: var(--texto-escuro); display: block; margin-top: 3px;">${obs.text}</span>
            </div>
        `).join('');
    } else {
        historyHtml = `<p style="font-size: 0.85rem; color: var(--texto-mutado); margin: 0;">Nenhuma observação registrada.</p>`;
    }

    let opacityStyle = task.status === 'Concluído' ? 'opacity: 0.6;' : '';

    return `
        <div class="task-card priority-${task.priority}" style="margin-bottom: 15px; ${opacityStyle}">
            <span class="priority-badge ${task.priority}">${task.priority}</span>
            <h3>ID: #${task.id} - ${task.title}</h3>
            <p class="task-meta"><strong>Prazo:</strong> ${formattedDate}</p>
            <p class="task-meta"><strong>Responsáveis:</strong> ${assignedNames}</p>
            <p class="task-meta"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${task.status}</span></p>
            <p style="margin-top: 10px;">${task.description}</p>
            ${linksHtml}
            
            <div style="margin-top: 15px; border-top: 1px dashed var(--borda); padding-top: 10px;">
                <label style="font-size: 0.85rem; margin-bottom: 8px; color: var(--cor-azul-forte); font-weight: bold;">Histórico de Observações:</label>
                
                <div style="max-height: 120px; overflow-y: auto; margin-bottom: 10px; padding: 10px; background-color: var(--fundo-pagina); border-radius: 4px; border: 1px solid var(--borda);">
                    ${historyHtml}
                </div>

                <textarea id="obs-${task.id}" rows="2" placeholder="Adicionar nova observação..." style="width: 100%; padding: 8px; border: 1px solid var(--borda); border-radius: 4px; font-size: 0.85rem; margin-bottom: 5px; resize: vertical; background-color: var(--fundo-card); color: var(--texto-escuro); outline: none;"></textarea>
                <button type="button" onclick="saveObservation(${task.id})" class="btn-sm" style="background-color: var(--cor-azul-forte); color: white; width: 100%;">➕ Adicionar à Linha do Tempo</button>
            </div>

            ${actionButtons}
            ${adminButtons}
        </div>
    `;
}

window.toggleAccordion = function(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.toggle('hidden');
    }
}

function setupTaskForm() {
    const form = document.getElementById('task-form');
    if (!form) return;

    const deadlineInput = document.getElementById('task-deadline');
    if (deadlineInput) {
        const local = new Date();
        local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
        deadlineInput.min = local.toISOString().slice(0, 16);
    }

    const btnAddLink = document.getElementById('btn-add-link');
    const linksContainer = document.getElementById('dynamic-links-container');
    
    if (btnAddLink && linksContainer) {
        const newBtnAddLink = btnAddLink.cloneNode(true);
        btnAddLink.parentNode.replaceChild(newBtnAddLink, btnAddLink);
        
        newBtnAddLink.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'form-row link-row';
            row.style.marginBottom = '10px';
            row.innerHTML = `
                <input type="text" class="link-title" placeholder="Título (Ex: Planilha de Notas)">
                <input type="url" class="link-url" placeholder="https://...">
                <button type="button" class="btn-danger" style="flex: 0 0 auto; width: 40px; padding: 0;" onclick="this.parentElement.remove()">X</button>
            `;
            linksContainer.appendChild(row);
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault(); 

        const selectedCheckboxes = document.querySelectorAll('input[name="assignees"]:checked');
        const selectedUsers = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

        if (selectedUsers.length === 0) {
            showToast('Por favor, atribua a tarefa a pelo menos um colaborador.', 'error');
            return;
        }

        const folderVal = document.getElementById('task-folder').value;
        const subfolderVal = document.getElementById('task-subfolder').value;
        const taskTitle = document.getElementById('task-title').value;
        const taskDeadline = document.getElementById('task-deadline').value;
        const taskPriority = document.getElementById('task-priority').value;

        if (!folderVal) {
            showToast('Por favor, selecione uma Pasta principal.', 'error');
            return;
        }

        if (!editingTaskId) {
            const selectedDate = new Date(taskDeadline);
            const currentDate = new Date();
            if (selectedDate < currentDate) {
                showToast('Não é possível criar uma tarefa com prazo no passado.', 'error');
                return;
            }
        }

        const sendEmailCheckbox = document.getElementById('task-send-email');
        const shouldSendEmail = sendEmailCheckbox ? sendEmailCheckbox.checked : false;

        showLoader(); 
        
        setTimeout(async () => {
            try {
                const linkRows = document.querySelectorAll('.link-row');
                const taskLinks = [];
                
                linkRows.forEach(row => {
                    const titleInput = row.querySelector('.link-title').value.trim();
                    const urlInput = row.querySelector('.link-url').value.trim();
                    if (urlInput !== '') {
                        taskLinks.push({ title: titleInput || 'Link de Apoio', url: urlInput });
                    }
                });

                if (editingTaskId) {
                    const updatedTask = {
                        title: taskTitle,
                        description: document.getElementById('task-desc').value,
                        deadline: taskDeadline,
                        priority: taskPriority,
                        assignees: selectedUsers,
                        links: taskLinks,
                        folder: folderVal,
                        subfolder: subfolderVal
                    };

                    const { error } = await supabaseClient.from('lms_tasks').update(updatedTask).eq('id', editingTaskId);
                    if (error) throw error;

                    const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
                    if (taskIndex !== -1) {
                        Object.assign(tasks[taskIndex], updatedTask);
                    }
                    showToast('Tarefa atualizada no banco de dados!', 'success');
                    cancelEdit();
                } else {
                    const newTaskDb = {
                        title: taskTitle,
                        description: document.getElementById('task-desc').value,
                        deadline: taskDeadline,
                        priority: taskPriority,
                        assignees: selectedUsers,
                        links: taskLinks,
                        status: 'A Fazer',
                        folder: folderVal,
                        subfolder: subfolderVal,
                        observations: [] 
                    };
                    
                    const { data, error } = await supabaseClient.from('lms_tasks').insert([newTaskDb]).select().single();
                    if (error) throw error;
                    
                    tasks.push(data);
                    
                    showToast('Tarefa salva no banco e atribuída!', 'success');
                    form.reset();
                    
                    if (deadlineInput) {
                        const local = new Date();
                        local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
                        deadlineInput.min = local.toISOString().slice(0, 16);
                    }

                    const emailsToNotify = [];
                    selectedUsers.forEach(userId => {
                        const userObj = lmsTeam.find(u => u.id === userId);
                        if (userObj && userObj.email) {
                            emailsToNotify.push(userObj.email);
                        }
                    });

                    if (shouldSendEmail && emailsToNotify.length > 0) {
                        const bccEmailsList = emailsToNotify.join(',');
                        const dataPrazoFormatada = new Date(taskDeadline).toLocaleString('pt-BR');

                        const templateParams = {
                            titulo_tarefa: taskTitle,
                            prioridade: taskPriority,
                            prazo_tarefa: dataPrazoFormatada,
                            bcc_emails: bccEmailsList
                        };

                        emailjs.send("service_gteq5eg", "template_m3tih7i", templateParams)
                            .then(function(response) {
                               console.log('E-mail de notificação enviado com sucesso!', response.status, response.text);
                            }, function(error) {
                               console.error('Falha ao enviar e-mail...', error);
                            });
                    }
                }
                
                if (typeof renderSystemData === 'function') {
                    renderSystemData();
                } else {
                    renderTasks();
                    renderHistoryTasks();
                }
                
                populateFolderSelects();
                
                const dynamicContainer = document.getElementById('dynamic-links-container');
                if(dynamicContainer && !editingTaskId) {
                    dynamicContainer.innerHTML = `
                        <div class="form-row link-row" style="margin-bottom: 10px;">
                            <input type="text" class="link-title" placeholder="Título (Ex: Planilha de Notas)">
                            <input type="url" class="link-url" placeholder="https://...">
                        </div>
                    `;
                }
            } catch (err) {
                console.error(err);
                showToast("Erro ao comunicar com o banco de dados.", "error");
            }
            hideLoader(); 
        }, 100);
    });
}
