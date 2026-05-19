// API Service pour GMAO Sakété

const API_URL = 'https://gmao-sakete-ifangni-1.onrender.com/api';
// Récupérer le token
function getToken() {
    return localStorage.getItem('token');
}

// Headers par défaut
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

// Requête GET
async function get(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    return response.json();
}

// Requête POST
async function post(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    return response.json();
}

// Requête PUT
async function put(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    return response.json();
}

// Requête DELETE
async function del(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    return response.json();
}

// Upload de fichier
async function upload(endpoint, formData) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken()}`
        },
        body: formData
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    return response.json();
}

// Vérifier l'authentification
async function checkAuth() {
    try {
        const user = await get('/auth/verify');
        return user;
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return null;
    }
}

// API spécifiques
const API = {
    // Auth
    login: (email, password) => post('/auth/login', { email, password }),
    register: (data) => post('/auth/register', data),
    
    // Équipements
    getEquipements: () => get('/equipements'),
    getEquipement: (id) => get(`/equipements/${id}`),
    addEquipement: (data) => post('/equipements', data),
    updateEquipement: (id, data) => put(`/equipements/${id}`, data),
    deleteEquipement: (id) => del(`/equipements/${id}`),
    scanQR: (qrData) => post('/equipements/scan-qr', { qrData }),
    
    // Maintenances
    signalerPanne: (data) => post('/maintenances/signaler', data),
    getUrgences: () => get('/maintenances/urgences'),
    prendreEnCharge: (id) => put(`/maintenances/${id}/prendre`, {}),
    terminerIntervention: (id, data) => put(`/maintenances/${id}/terminer`, data),
    
    // Stock
    getStock: () => get('/stock'),
    addPiece: (data) => post('/stock', data),
    mouvementStock: (data) => post('/stock/mouvement', data),
    
    // Dashboard
    getDashboardTechnicien: () => get('/dashboard/technicien'),
    getDashboardSoignant: () => get('/dashboard/soignant'),
    
    // Chatbot
    chatbotMessage: (message, conversationId) => post('/chatbot/message', { message, conversationId }),
    
    // Diagnostic
    diagnosticMessage: (message, equipmentId, conversationId) => post('/diagnostic/message', { message, equipmentId, conversationId }),
    
    // Utilisateurs
    getUtilisateurs: () => get('/users'),
    validateUser: (userId) => put(`/auth/users/${userId}/validate`, {}),
    
    // CoDIR
    getRapportCoDIR: (mois, annee) => get(`/codir/indicators?mois=${mois}&annee=${annee}`)
};

export { API, getToken, checkAuth };