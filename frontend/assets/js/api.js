// API Service pour GMAO Sakété - Version 2.1.0

// Détection environnement
function detectApiUrl() {
    // Override manuel via localStorage (debug)
    const override = (typeof localStorage !== 'undefined') && localStorage.getItem('API_URL');
    if (override) return override.replace(/\/$/, '') + '/api';

    const host = (typeof window !== 'undefined') ? window.location.hostname : '';
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
        return `http://${host}:10000/api`;
    }
    // Prod par défaut
    return 'https://gmao-sakete-ifangni-1.onrender.com/api';
}

const API_URL = detectApiUrl();

// Configuration
const CONFIG = {
    timeout: 30000, // 30 secondes
    retryCount: 3,
    retryDelay: 1000
};

// État de l'API
let isRefreshing = false;
let failedQueue = [];

// ============================================
// UTILITAIRES
// ============================================

// Récupérer le token
function getToken() {
    return localStorage.getItem('token');
}

// Récupérer le token d'actualisation
function getRefreshToken() {
    return localStorage.getItem('refreshToken');
}

// Sauvegarder les tokens
function setTokens(token, refreshToken) {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

// Effacer les tokens
function clearTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userService');
}

// Headers par défaut
function getHeaders(includeContentType = true) {
    const headers = {
        'Authorization': `Bearer ${getToken()}`
    };
    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

// ============================================
// GESTION DES ERREURS
// ============================================

class APIError extends Error {
    constructor(message, status, code, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
        this.data = data;
    }
}

function handleError(error, endpoint) {
    console.error(`API Error [${endpoint}]:`, error);
    
    if (error.name === 'AbortError') {
        throw new APIError('Requête annulée (timeout)', 408, 'TIMEOUT');
    }
    
    if (error instanceof APIError) {
        throw error;
    }
    
    if (error.status === 401) {
        clearTokens();
        if (typeof window !== 'undefined') {
            window.location.href = '/login.html';
        }
        throw new APIError('Session expirée, veuillez vous reconnecter', 401, 'UNAUTHORIZED');
    }
    
    if (error.status === 403) {
        throw new APIError('Accès non autorisé', 403, 'FORBIDDEN');
    }
    
    if (error.status === 404) {
        throw new APIError('Ressource non trouvée', 404, 'NOT_FOUND');
    }
    
    if (error.status === 500) {
        throw new APIError('Erreur serveur, veuillez réessayer', 500, 'SERVER_ERROR');
    }
    
    throw new APIError(error.message || 'Erreur de connexion', error.status || 0, 'NETWORK_ERROR');
}

// ============================================
// REQUÊTES AVEC TIMEOUT ET RETRY
// ============================================

async function fetchWithTimeout(url, options, timeout = CONFIG.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function fetchWithRetry(url, options, retries = CONFIG.retryCount) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await fetchWithTimeout(url, options);
        } catch (error) {
            lastError = error;
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * (i + 1)));
            }
        }
    }
    
    throw lastError;
}

// ============================================
// MÉTHODES HTTP DE BASE
// ============================================

// Requête générique
async function request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const defaultOptions = {
        headers: getHeaders(),
        credentials: 'include'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetchWithRetry(url, finalOptions);
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (!response.ok) {
            throw new APIError(
                data.message || data.error || `Erreur ${response.status}`,
                response.status,
                data.code,
                data
            );
        }
        
        return data;
    } catch (error) {
        throw handleError(error, endpoint);
    }
}

// Requête GET
async function get(endpoint, params = {}) {
    let url = endpoint;
    if (Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }
    return request(url, { method: 'GET' });
}

// Requête POST
async function post(endpoint, data = {}) {
    return request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

// Requête PUT
async function put(endpoint, data = {}) {
    return request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

// Requête PATCH
async function patch(endpoint, data = {}) {
    return request(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
}

// Requête DELETE
async function del(endpoint) {
    return request(endpoint, { method: 'DELETE' });
}

// Upload de fichier
async function upload(endpoint, formData) {
    const url = `${API_URL}${endpoint}`;
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken()}`
        },
        body: formData
    };
    
    try {
        const response = await fetchWithRetry(url, options);
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (!response.ok) {
            throw new APIError(data.message || `Erreur ${response.status}`, response.status);
        }
        
        return data;
    } catch (error) {
        throw handleError(error, endpoint);
    }
}

// ============================================
// VÉRIFICATION AUTHENTIFICATION
// ============================================

async function checkAuth() {
    try {
        const user = await get('/auth/verify');
        return user;
    } catch (error) {
        if (error.status === 401) {
            clearTokens();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('login')) {
                window.location.href = '/login.html';
            }
        }
        return null;
    }
}

// Rafraîchir le token
async function refreshToken() {
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        });
    }
    
    isRefreshing = true;
    
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token');
        }
        
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        
        if (!response.ok) throw new Error('Refresh failed');
        
        const data = await response.json();
        setTokens(data.token, data.refreshToken);
        
        // Traiter la file d'attente
        failedQueue.forEach(({ resolve }) => resolve(data.token));
        failedQueue = [];
        
        return data.token;
    } catch (error) {
        failedQueue.forEach(({ reject }) => reject(error));
        failedQueue = [];
        clearTokens();
        window.location.href = '/login.html';
        throw error;
    } finally {
        isRefreshing = false;
    }
}

// ============================================
// API SPÉCIFIQUES
// ============================================

const API = {
    // Auth
    login: (email, password) => post('/auth/login', { email, password }),
    register: (data) => post('/auth/register', data),
    logout: () => {
        clearTokens();
        window.location.href = '/login.html';
    },
    changePassword: (currentPassword, newPassword) => 
        post('/auth/change-password', { currentPassword, newPassword }),
    refreshToken: () => refreshToken(),
    
    // Équipements
    getEquipements: (params = {}) => get('/equipements', params),
    getEquipement: (id) => get(`/equipements/${id}`),
    getEquipementStats: () => get('/equipements/stats'),
    addEquipement: (data) => post('/equipements', data),
    updateEquipement: (id, data) => put(`/equipements/${id}`, data),
    deleteEquipement: (id) => del(`/equipements/${id}`),
    scanQR: (qrData) => post('/equipements/scan-qr', { qrData }),
    
    // Maintenances / Interventions
    getMaintenances: (params = {}) => get('/maintenances', params),
    getMesInterventions: () => get('/maintenances/mes-interventions'),
    getMaintenance: (id) => get(`/maintenances/${id}`),
    signalerPanne: (data) => post('/maintenances/signaler', data),
    getUrgences: () => get('/maintenances/urgences'),
    prendreEnCharge: (id) => put(`/maintenances/${id}/prendre`, {}),
    terminerIntervention: (id, data) => put(`/maintenances/${id}/terminer`, data),
    getHistoriqueEquipement: (equipementId) => get(`/maintenances/historique/${equipementId}`),
    
    // Signalements (Soignant)
    getMesSignalements: () => get('/signalements/mes-signalements'),
    getSignalement: (id) => get(`/signalements/${id}`),
    createSignalement: (data) => post('/signalements', data),
    
    // Stock
    getStock: (params = {}) => get('/stock', params),
    getStockStats: () => get('/stock/stats'),
    getPiece: (id) => get(`/stock/${id}`),
    addPiece: (data) => post('/stock', data),
    updatePiece: (id, data) => put(`/stock/${id}`, data),
    deletePiece: (id) => del(`/stock/${id}`),
    mouvementStock: (data) => post('/stock/mouvement', data),
    
    // Dashboard
    getDashboardTechnicien: () => get('/dashboard/technicien'),
    getDashboardSoignant: () => get('/dashboard/soignant'),
    
    // Chatbot
    chatbotMessage: (message, conversationId, equipmentId = null) => 
        post('/chatbot/message', { message, conversationId, equipmentId }),
    chatbotSignaler: (equipmentId, description, conversationId, priorite) => 
        post('/chatbot/signaler', { equipmentId, description, conversationId, priorite }),
    
    // Diagnostic
    diagnosticMessage: (message, equipmentId, conversationId) => 
        post('/chatbot/diagnostic', { message, equipmentId, conversationId }),
    
    // Utilisateurs
    getUtilisateurs: (params = {}) => get('/users', params),
    getUtilisateur: (id) => get(`/users/${id}`),
    updateUtilisateur: (id, data) => put(`/users/${id}`, data),
    deleteUtilisateur: (id) => del(`/users/${id}`),
    validateUser: (userId) => put(`/auth/users/${userId}/validate`, {}),
    rejectUser: (userId) => del(`/auth/users/${userId}/reject`),
    toggleUserStatus: (userId, actif) => put(`/auth/users/${userId}/toggle-status`, { actif }),
    
    // Techniciens
    getTechniciens: (params = {}) => get('/techniciens', params),
    getTechnicien: (id) => get(`/techniciens/${id}`),
    addTechnicien: (data) => post('/techniciens', data),
    updateTechnicien: (id, data) => put(`/techniciens/${id}`, data),
    deleteTechnicien: (id) => del(`/techniciens/${id}`),
    enregistrerDepart: (id, data) => post(`/techniciens/${id}/depart`, data),
    reactiverTechnicien: (id) => put(`/techniciens/${id}/reactiver`, {}),
    
    // Fournisseurs
    getFournisseurs: (params = {}) => get('/fournisseurs', params),
    getFournisseur: (id) => get(`/fournisseurs/${id}`),
    addFournisseur: (data) => post('/fournisseurs', data),
    updateFournisseur: (id, data) => put(`/fournisseurs/${id}`, data),
    deleteFournisseur: (id) => del(`/fournisseurs/${id}`),
    
    // Alertes
    getAlertes: (params = {}) => get('/alertes', params),
    getAlertesStats: () => get('/alertes/stats'),
    getAlerte: (id) => get(`/alertes/${id}`),
    resoudreAlerte: (id, commentaire) => put(`/alertes/${id}/resoudre`, { commentaire }),
    
    // Documents
    getDocuments: (params = {}) => get('/documents', params),
    getDocument: (id) => get(`/documents/${id}`),
    uploadDocument: (formData) => upload('/documents/upload', formData),
    deleteDocument: (id) => del(`/documents/${id}`),
    
    // Planning
    getPlanning: (params) => get('/planning', params),
    addPlanning: (data) => post('/planning', data),
    updatePlanning: (id, data) => put(`/planning/${id}`, data),
    deletePlanning: (id) => del(`/planning/${id}`),
    
    // CoDIR
    getRapportCoDIR: (mois, annee) => get(`/codir/indicators`, { mois, annee }),
    
    // Préventives
    getPreventives: (params = {}) => get('/preventif', params),
    getPreventive: (id) => get(`/preventif/${id}`),
    addPreventive: (data) => post('/preventif/add', data),
    realiserPreventive: (id, data) => post(`/preventif/${id}/realiser`, data),
    
    // Profil
    getMonProfil: () => get('/users/me'),
    updateMonProfil: (data) => put('/users/me', data),
    
    // Statistiques
    getStatsTechnicien: () => get('/maintenances/my/stats'),
    getStatsSoignant: () => get('/signalements/mes-stats'),
    
    // Utilitaires
    checkAuth: () => checkAuth(),
    getToken: () => getToken()
};

// ============================================
// INTERCEPTEURS GLOBAUX
// ============================================

// Ajouter un intercepteur pour les logs (optionnel)
if (typeof window !== 'undefined' && window.localStorage.getItem('debug') === 'true') {
    const originalRequest = request;
    window.APIrequest = (endpoint, options) => {
        console.log(`[API] ${options?.method || 'GET'} ${endpoint}`);
        return originalRequest(endpoint, options);
    };
}

// ============================================
// EXPORTATION
// ============================================

// Support ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, getToken, checkAuth, API_URL };
}

// Support global (pour utilisation directe dans HTML)
if (typeof window !== 'undefined') {
    window.API = API;
    window.getToken = getToken;
    window.checkAuth = checkAuth;
}
