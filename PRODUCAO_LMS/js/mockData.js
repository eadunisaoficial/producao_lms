// js/mockData.js

let lmsTeam = [];
let lmsFolders = [];
let tasks = [];
let currentUser = { id: 0, name: 'Visitante', accessLevel: 0 };

async function carregarDadosDoBanco() {
    try {
        const { data: dbTeam, error: errTeam } = await supabaseClient.from('lms_team').select('*');
        if (dbTeam) {
            lmsTeam = dbTeam.map(u => ({
                id: u.id,
                name: u.name,
                role: u.role,
                accessLevel: u.access_level,
                email: u.email,
                customPermissions: u.custom_permissions || {} // NOVA COLUNA LIDA AQUI
            }));
        }

        const { data: dbFolders, error: errFolders } = await supabaseClient.from('lms_folders').select('*');
        if (dbFolders) {
            lmsFolders = dbFolders; 
        }

        const { data: dbTasks, error: errTasks } = await supabaseClient.from('lms_tasks').select('*');
        if (dbTasks) {
            tasks = dbTasks; 
        }

        const savedUserId = localStorage.getItem('lms_logged_user_id');
        currentUser = lmsTeam.find(user => user.id === parseInt(savedUserId)) || { id: 0, name: 'Visitante', accessLevel: 0 };
        
        if (currentUser.id === 0 && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }

    } catch (error) {
        console.error("Erro Crítico: Falha ao buscar dados no Supabase.", error);
    }
}
