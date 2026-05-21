// sidebar.js - Gestion dynamique de la sidebar pour GMAO Sakété v2.1.0

// ============================================
// CONFIGURATION
// ============================================

const SIDEBAR_CONFIG = {
    // Chemin du fichier sidebar
    url: '/components/sidebar.html',
    // Classe pour le conteneur
    containerId: 'sidebar-container',
    // Événements après chargement
    onLoaded: null,
    // Cache pour éviter les rechargements
    cache: true,
    // Durée du cache (30 minutes)
    cacheDuration: 30 * 60 * 1000
};

// Cache de la sidebar
let sidebarCache = null;
let sidebarCacheTime = null;

// ============================================
# FONCTIONS PRINCIPALES
============================================

// Créer le conteneur de sidebar si nécessaire
function ensureSidebarContainer() {
    let sidebarContainer = document.getElementById(SIDEBAR_CONFIG.containerId);
    
    if (!sidebarContainer) {
        sidebarContainer = document.createElement('div');
        sidebarContainer.id = SIDEBAR_CONFIG.containerId;
        // Insérer au début du body
        document.body.insertBefore(sidebarContainer, document.body.firstChild);
    }
    
    return sidebarContainer;
}

// Déterminer l'élément actif dans la sidebar
function setActiveMenuItem() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    let activeFound = false;
    
    sidebarItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href) {
            // Nettoyer les classes actives
            item.classList.remove('active');
            
            // Vérifier si c'est la page courante
            if (href === currentPage || 
                (currentPage === '' && href === 'index.html') ||
                (currentPath.includes(href) && href !== '#')) {
                item.classList.add('active');
                activeFound = true;
            }
        }
    });
    
    // Si aucun élément actif trouvé, activer le premier si nécessaire
    if (!activeFound && sidebarItems.length > 0) {
        const firstItem = sidebarItems[0];
        if (firstItem && firstItem.getAttribute('href') !== '#') {
            firstItem.classList.add('active');
        }
    }
}

// Mettre à jour les informations utilisateur dans la sidebar
function updateUserInfoInSidebar() {
    const userName = localStorage.getItem('userName') || 'Utilisateur';
    const userRole = localStorage.getItem('userRole');
    
    const userNameSpan = document.getElementById('sidebarUserName');
    const userRoleSpan = document.getElementById('sidebarUserRole');
    
    if (userNameSpan) {
        userNameSpan.textContent = userName;
    }
    
    if (userRoleSpan) {
        let roleText = '';
        if (userRole === 'TECHNICIEN') {
            roleText = '🔧 Technicien Biomédical';
        } else if (userRole === 'SOIGNANT') {
            roleText = '👨‍⚕️ Personnel Soignant';
        } else {
            roleText = '👤 Utilisateur';
        }
        userRoleSpan.textContent = roleText;
    }
}

// Initialiser les événements de la sidebar
function initSidebarEvents() {
    // Déconnexion
    const logoutBtn = document.querySelector('.sidebar-logout, #sidebarLogoutBtn');
    if (logoutBtn) {
        // Supprimer les anciens événements pour éviter les doublons
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('🚪 Voulez-vous vraiment vous déconnecter ?')) {
                localStorage.clear();
                window.location.href = '/login.html';
            }
        });
    }
    
    // Gérer les liens actifs au clic
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            // Sauvegarder la page active dans sessionStorage
            const href = this.getAttribute('href');
            if (href && href !== '#') {
                sessionStorage.setItem('lastPage', href);
            }
        });
    });
}

// ============================================
# CHARGEMENT DE LA SIDEBAR
============================================

// Charger la sidebar depuis le cache ou le réseau
async function loadSidebarFromCache() {
    if (!SIDEBAR_CONFIG.cache) return null;
    
    // Vérifier si le cache est valide
    if (sidebarCache && sidebarCacheTime && 
        (Date.now() - sidebarCacheTime) < SIDEBAR_CONFIG.cacheDuration) {
        console.log('📦 Sidebar chargée depuis le cache');
        return sidebarCache;
    }
    
    return null;
}

// Charger la sidebar depuis le réseau
async function loadSidebarFromNetwork() {
    try {
        const response = await fetch(SIDEBAR_CONFIG.url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        
        // Mettre en cache
        if (SIDEBAR_CONFIG.cache) {
            sidebarCache = html;
            sidebarCacheTime = Date.now();
        }
        
        return html;
    } catch (error) {
        console.error('Erreur chargement sidebar:', error);
        
        // Fallback: sidebar par défaut
        return getDefaultSidebar();
    }
}

// Sidebar par défaut (fallback en cas d'erreur)
function getDefaultSidebar() {
    const userRole = localStorage.getItem('userRole');
    const isTechnicien = userRole === 'TECHNICIEN';
    
    if (isTechnicien) {
        return `
            <div class="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">🏥 <span>GMAO</span> Sakété</div>
                    <div class="sidebar-subtitle">Hôpital de Zone Sakété-Ifangni</div>
                </div>
                <div class="sidebar-menu">
                    <div class="sidebar-section">Principal</div>
                    <a href="/technicien/dashboard.html" class="sidebar-item"><span class="sidebar-icon">📊</span><span class="sidebar-text">Dashboard</span></a>
                    <a href="/technicien/inventaire.html" class="sidebar-item"><span class="sidebar-icon">📦</span><span class="sidebar-text">Inventaire</span></a>
                    <a href="/technicien/maintenances.html" class="sidebar-item"><span class="sidebar-icon">🔧</span><span class="sidebar-text">Maintenances</span></a>
                    <a href="/technicien/stock.html" class="sidebar-item"><span class="sidebar-icon">⚙️</span><span class="sidebar-text">Stock</span></a>
                    <div class="sidebar-section">Système</div>
                    <a href="/technicien/profil.html" class="sidebar-item"><span class="sidebar-icon">👤</span><span class="sidebar-text">Mon profil</span></a>
                </div>
                <div class="sidebar-footer">
                    <div class="sidebar-user">
                        <span class="user-avatar">👨‍🔧</span>
                        <div class="user-info">
                            <div class="user-name" id="sidebarUserName">Chargement...</div>
                            <div class="user-role" id="sidebarUserRole">Technicien</div>
                        </div>
                    </div>
                    <button class="sidebar-logout">🚪 Déconnexion</button>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">🏥 <span>GMAO</span> Sakété</div>
                    <div class="sidebar-subtitle">Hôpital de Zone Sakété-Ifangni</div>
                </div>
                <div class="sidebar-menu">
                    <div class="sidebar-section">Principal</div>
                    <a href="/soignant/index.html" class="sidebar-item"><span class="sidebar-icon">🏠</span><span class="sidebar-text">Accueil</span></a>
                    <a href="/soignant/signaler-panne.html" class="sidebar-item"><span class="sidebar-icon">⚠️</span><span class="sidebar-text">Signaler</span></a>
                    <a href="/soignant/historique.html" class="sidebar-item"><span class="sidebar-icon">📋</span><span class="sidebar-text">Historique</span></a>
                    <div class="sidebar-section">Compte</div>
                    <a href="/soignant/profil.html" class="sidebar-item"><span class="sidebar-icon">👤</span><span class="sidebar-text">Mon profil</span></a>
                </div>
                <div class="sidebar-footer">
                    <div class="sidebar-user">
                        <span class="user-avatar">👨‍⚕️</span>
                        <div class="user-info">
                            <div class="user-name" id="sidebarUserName">Chargement...</div>
                            <div class="user-role" id="sidebarUserRole">Soignant</div>
                        </div>
                    </div>
                    <button class="sidebar-logout">🚪 Déconnexion</button>
                </div>
            </div>
        `;
    }
}

// Afficher un indicateur de chargement
function showSidebarLoader() {
    const container = ensureSidebarContainer();
    container.innerHTML = `
        <div class="sidebar-loader" style="
            position: fixed;
            left: 0;
            top: 0;
            width: 280px;
            height: 100vh;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        ">
            <div class="spinner" style="
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            "></div>
        </div>
        <style>
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    `;
}

// Charger la sidebar
async function loadSidebar(options = {}) {
    const config = { ...SIDEBAR_CONFIG, ...options };
    
    // Afficher le loader
    showSidebarLoader();
    
    // Essayer de charger depuis le cache
    let sidebarHtml = await loadSidebarFromCache();
    
    // Sinon depuis le réseau
    if (!sidebarHtml) {
        sidebarHtml = await loadSidebarFromNetwork();
    }
    
    // Insérer dans le DOM
    const container = ensureSidebarContainer();
    container.innerHTML = sidebarHtml;
    
    // Ajouter les styles si nécessaire
    ensureSidebarStyles();
    
    // Initialiser les événements
    initSidebarEvents();
    
    // Mettre à jour les informations utilisateur
    updateUserInfoInSidebar();
    
    // Définir l'élément actif
    setActiveMenuItem();
    
    // Exécuter le callback
    if (config.onLoaded && typeof config.onLoaded === 'function') {
        config.onLoaded();
    }
    
    // Ajouter la classe pour les animations
    setTimeout(() => {
        container.classList.add('sidebar-loaded');
    }, 100);
    
    console.log('✅ Sidebar chargée');
}

// ============================================
# STYLES
============================================

function ensureSidebarStyles() {
    // Vérifier si les styles sont déjà présents
    if (document.getElementById('sidebar-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'sidebar-styles';
    style.textContent = `
        .sidebar-loader {
            position: fixed;
            left: 0;
            top: 0;
            width: 280px;
            height: 100vh;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: 280px;
            height: 100vh;
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            color: white;
            z-index: 1000;
            overflow-y: auto;
            transition: transform 0.3s ease;
        }
        
        .sidebar::-webkit-scrollbar {
            width: 5px;
        }
        
        .sidebar::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.1);
        }
        
        .sidebar::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.3);
            border-radius: 5px;
        }
        
        .sidebar-header {
            padding: 25px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            background: rgba(0,0,0,0.2);
        }
        
        .sidebar-logo {
            font-size: 20px;
            font-weight: bold;
        }
        
        .sidebar-logo span {
            color: #0066FF;
        }
        
        .sidebar-subtitle {
            font-size: 11px;
            opacity: 0.6;
            margin-top: 5px;
        }
        
        .sidebar-menu {
            flex: 1;
            padding: 20px 0;
        }
        
        .sidebar-section {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgba(255,255,255,0.4);
            padding: 12px 20px 4px;
        }
        
        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 11px 20px;
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        
        .sidebar-item:hover {
            background: rgba(255,255,255,0.1);
            color: white;
            border-left-color: #0066FF;
        }
        
        .sidebar-item.active {
            background: rgba(255,255,255,0.15);
            color: white;
            border-left-color: #0066FF;
        }
        
        .sidebar-icon {
            width: 22px;
            text-align: center;
            font-size: 17px;
        }
        
        .sidebar-text {
            font-size: 14px;
        }
        
        .sidebar-footer {
            padding: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .sidebar-user {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            margin-bottom: 15px;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            background: #0066FF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        .user-info {
            flex: 1;
        }
        
        .user-name {
            font-weight: bold;
            font-size: 13px;
        }
        
        .user-role {
            font-size: 10px;
            opacity: 0.7;
        }
        
        .sidebar-logout {
            width: 100%;
            background: #ef4444;
            border: none;
            color: white;
            padding: 10px;
            border-radius: 30px;
            cursor: pointer;
            font-weight: 600;
            transition: 0.2s;
        }
        
        .sidebar-logout:hover {
            background: #dc2626;
            transform: translateY(-1px);
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
            }
            
            .sidebar.open {
                transform: translateX(0);
            }
        }
        
        /* Animation d'entrée */
        .sidebar-loaded .sidebar {
            animation: fadeInLeft 0.3s ease;
        }
        
        @keyframes fadeInLeft {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ============================================
# UTILITAIRES
============================================

// Rafraîchir la sidebar (recharger)
function refreshSidebar() {
    sidebarCache = null;
    sidebarCacheTime = null;
    loadSidebar();
}

// Mettre à jour les informations utilisateur sans recharger
function updateSidebarUserInfo() {
    updateUserInfoInSidebar();
}

// ============================================
# INITIALISATION
============================================

// Exécuter au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadSidebar());
} else {
    loadSidebar();
}

// Export pour ES modules (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadSidebar,
        refreshSidebar,
        updateSidebarUserInfo,
        setActiveMenuItem: setActiveMenuItem
    };
}

// Export global
if (typeof window !== 'undefined') {
    window.Sidebar = {
        load: loadSidebar,
        refresh: refreshSidebar,
        updateUser: updateSidebarUserInfo
    };
}
