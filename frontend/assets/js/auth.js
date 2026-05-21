// Gestion de l'authentification - GMAO Sakété v2.1.0

// ============================================
// CONSTANTES
// ============================================

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const USER_ID_KEY = 'userId';
const USER_ROLE_KEY = 'userRole';
const USER_NAME_KEY = 'userName';
const USER_SERVICE_KEY = 'userService';
const USER_EMAIL_KEY = 'userEmail';
const LOGIN_TIMESTAMP_KEY = 'loginTimestamp';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';

// Durée de validité du token (7 jours en millisecondes)
const TOKEN_VALIDITY = 7 * 24 * 60 * 60 * 1000;

// API URL
const API_URL = 'https://gmao-sakete-ifangni-1.onrender.com/api';

// ============================================
// FONCTIONS DE BASE
// ============================================

// Récupérer le token
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Récupérer le refresh token
function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// Vérifier si l'utilisateur est authentifié
function isAuthenticated() {
    const token = getToken();
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token) return false;
    
    // Vérifier l'expiration du token
    if (expiry && Date.now() > parseInt(expiry)) {
        logout();
        return false;
    }
    
    return true;
}

// Vérifier si le token est sur le point d'expirer (moins de 5 minutes)
function isTokenExpiringSoon() {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    
    const timeLeft = parseInt(expiry) - Date.now();
    return timeLeft < 5 * 60 * 1000; // 5 minutes
}

// Récupérer le rôle de l'utilisateur
function getUserRole() {
    return localStorage.getItem(USER_ROLE_KEY);
}

// Récupérer le nom de l'utilisateur
function getUserName() {
    return localStorage.getItem(USER_NAME_KEY);
}

// Récupérer l'ID de l'utilisateur
function getUserId() {
    return localStorage.getItem(USER_ID_KEY);
}

// Récupérer le service de l'utilisateur
function getUserService() {
    return localStorage.getItem(USER_SERVICE_KEY);
}

// Récupérer l'email de l'utilisateur
function getUserEmail() {
    return localStorage.getItem(USER_EMAIL_KEY);
}

// Récupérer l'utilisateur complet
function getUser() {
    try {
        const userStr = localStorage.getItem(USER_KEY);
        if (userStr) {
            return JSON.parse(userStr);
        }
    } catch (e) {
        console.error('Erreur parsing user:', e);
    }
    return null;
}

// ============================================
// SAUVEGARDE DES DONNÉES UTILISATEUR
// ============================================

function saveUserData(user, token, refreshToken) {
    // Sauvegarder le token
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    
    // Sauvegarder l'expiration du token
    const expiry = Date.now() + TOKEN_VALIDITY;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    
    // Sauvegarder les informations utilisateur
    localStorage.setItem(USER_ID_KEY, user.id);
    localStorage.setItem(USER_ROLE_KEY, user.role);
    localStorage.setItem(USER_NAME_KEY, user.nom);
    localStorage.setItem(USER_SERVICE_KEY, user.service || '');
    localStorage.setItem(USER_EMAIL_KEY, user.email);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
}

// ============================================
// CONNEXION ET DÉCONNEXION
// ============================================

// Connexion
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Email ou mot de passe incorrect');
        }
        
        const data = await response.json();
        
        // Sauvegarder les données
        saveUserData(data.user, data.token, data.refreshToken);
        
        // Enregistrer la dernière connexion
        localStorage.setItem('lastLogin', new Date().toISOString());
        
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erreur login:', error);
        return { success: false, error: error.message };
    }
}

// Déconnexion
async function logout(redirect = true) {
    try {
        // Tenter d'invalider le token côté serveur
        const token = getToken();
        if (token) {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }).catch(() => {});
        }
    } catch (e) {
        // Ignorer les erreurs réseau lors de la déconnexion
    } finally {
        // Nettoyer le localStorage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(USER_ROLE_KEY);
        localStorage.removeItem(USER_NAME_KEY);
        localStorage.removeItem(USER_SERVICE_KEY);
        localStorage.removeItem(USER_EMAIL_KEY);
        localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        localStorage.removeItem('appSettings');
        
        if (redirect) {
            window.location.href = '/login.html';
        }
    }
}

// Rafraîchir le token
async function refreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token');
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        
        if (!response.ok) {
            throw new Error('Refresh failed');
        }
        
        const data = await response.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        
        // Mettre à jour l'expiration
        const expiry = Date.now() + TOKEN_VALIDITY;
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
        
        return data.token;
    } catch (error) {
        logout();
        throw error;
    }
}

// ============================================
# VÉRIFICATION DES ACCÈS
============================================

// Vérifier l'accès selon le rôle
function checkAccess(allowedRoles) {
    const role = getUserRole();
    const isAuth = isAuthenticated();
    
    if (!isAuth) {
        window.location.href = '/login.html';
        return false;
    }
    
    if (allowedRoles && !allowedRoles.includes(role)) {
        // Rediriger vers la page appropriée selon le rôle
        if (role === 'TECHNICIEN') {
            window.location.href = '/technicien/dashboard.html';
        } else if (role === 'SOIGNANT') {
            window.location.href = '/soignant/index.html';
        } else {
            window.location.href = '/login.html';
        }
        return false;
    }
    
    return true;
}

// Redirection après connexion
function redirectAfterLogin(role, returnUrl = null) {
    // Vérifier s'il y a une URL de retour
    if (returnUrl && returnUrl !== '/login.html' && returnUrl !== '/register.html') {
        window.location.href = returnUrl;
        return;
    }
    
    // Redirection par défaut selon le rôle
    if (role === 'TECHNICIEN') {
        window.location.href = '/technicien/dashboard.html';
    } else if (role === 'SOIGNANT') {
        window.location.href = '/soignant/index.html';
    } else {
        window.location.href = '/index.html';
    }
}

// Vérifier et rediriger automatiquement
function autoRedirect() {
    const token = getToken();
    const role = getUserRole();
    
    if (token && role) {
        if (role === 'TECHNICIEN' && !window.location.pathname.includes('/technicien/')) {
            window.location.href = '/technicien/dashboard.html';
        } else if (role === 'SOIGNANT' && !window.location.pathname.includes('/soignant/')) {
            window.location.href = '/soignant/index.html';
        }
    }
}

// ============================================
# INFORMATIONS UTILISATEUR
============================================

// Mettre à jour le nom de l'utilisateur
function updateUserName(name) {
    localStorage.setItem(USER_NAME_KEY, name);
    // Mettre à jour l'objet user
    const user = getUser();
    if (user) {
        user.nom = name;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

// Mettre à jour le service de l'utilisateur
function updateUserService(service) {
    localStorage.setItem(USER_SERVICE_KEY, service);
    const user = getUser();
    if (user) {
        user.service = service;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

// Mettre à jour le téléphone de l'utilisateur
function updateUserPhone(phone) {
    const user = getUser();
    if (user) {
        user.telephone = phone;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

// Obtenir le temps depuis la dernière connexion
function getTimeSinceLogin() {
    const timestamp = localStorage.getItem(LOGIN_TIMESTAMP_KEY);
    if (!timestamp) return null;
    
    const elapsed = Date.now() - parseInt(timestamp);
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} jour(s)`;
    if (hours > 0) return `${hours} heure(s)`;
    if (minutes > 0) return `${minutes} minute(s)`;
    return 'moins d\'une minute';
}

// ============================================
# GESTION DES SESSIONS
============================================

// Vérifier périodiquement la validité du token
let sessionCheckInterval = null;

function startSessionCheck(intervalMs = 60000) {
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);
    
    sessionCheckInterval = setInterval(() => {
        if (isTokenExpiringSoon()) {
            refreshToken().catch(() => {
                console.warn('Session expirée');
            });
        }
    }, intervalMs);
}

function stopSessionCheck() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}

// ============================================
# EXPORTATION
============================================

// Export pour ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Fonctions principales
        login,
        logout,
        refreshToken,
        
        // Vérifications
        isAuthenticated,
        isTokenExpiringSoon,
        checkAccess,
        autoRedirect,
        redirectAfterLogin,
        
        // Getters
        getToken,
        getRefreshToken,
        getUserRole,
        getUserName,
        getUserId,
        getUserService,
        getUserEmail,
        getUser,
        
        // Setters
        saveUserData,
        updateUserName,
        updateUserService,
        updateUserPhone,
        
        // Session
        startSessionCheck,
        stopSessionCheck,
        getTimeSinceLogin,
        
        // Constantes
        TOKEN_KEY,
        USER_ROLE_KEY
    };
}

// Export global (pour utilisation directe dans HTML)
if (typeof window !== 'undefined') {
    window.Auth = {
        login,
        logout,
        refreshToken,
        isAuthenticated,
        checkAccess,
        autoRedirect,
        redirectAfterLogin,
        getUserRole,
        getUserName,
        getUserId,
        getUserService,
        startSessionCheck,
        stopSessionCheck
    };
}
