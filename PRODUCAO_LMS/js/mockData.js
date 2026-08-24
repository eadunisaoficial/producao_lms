// js/mockData.js

// As variáveis continuam existindo no sistema, mas agora começam vazias
let lmsTeam = [];
let lmsFolders = [];
let tasks = [];
let currentUser = { id: 0, name: 'Visitante', accessLevel: 0 };

// Nova Função: Consulta no banco e preenche as variáveis
async function carregarDadosDoBanco() {
    try {
        // 1. SELECT * FROM lms_team
        const { data: dbTeam, error: errTeam } = await supabaseClient.from('lms_team').select('*');
        if (dbTeam) {
            // Mapeando a coluna access_level do banco para a variável accessLevel do nosso código
            lmsTeam = dbTeam.map(u => ({
                id: u.id,
                name: u.name,
                role: u.role,
                accessLevel: u.access_level,
                email: u.email
            }));
        }

        // 2. SELECT * FROM lms_folders
        const { data: dbFolders, error: errFolders } = await supabaseClient.from('lms_folders').select('*');
        if (dbFolders) {
            lmsFolders = dbFolders; 
        }

        // 3. SELECT * FROM lms_tasks
        const { data: dbTasks, error: errTasks } = await supabaseClient.from('lms_tasks').select('*');
        if (dbTasks) {
            tasks = dbTasks; 
        }

        // 4. Identificando quem acabou de fazer login
        const savedUserId = localStorage.getItem('lms_logged_user_id');
        currentUser = lmsTeam.find(user => user.id === parseInt(savedUserId)) || { id: 0, name: 'Visitante', accessLevel: 0 };
        
        if (currentUser.id === 0 && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }

    } catch (error) {
        console.error("Erro Crítico: Falha ao buscar dados no Supabase.", error);
    }
}