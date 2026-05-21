// utils/matricule.js - Génération de matricules uniques pour GMAO Sakété

// ============================================
# CONFIGURATION
============================================

const MATRICULE_CONFIG = {
    PREFIX: 'HZSI', // Hôpital Zone Sakété-Ifangni
    LENGTH: {
        NOM: 3,
        PRENOM: 2,
        RANDOM: 4
    },
    SEPARATOR: '-'
};

// ============================================
# FONCTIONS UTILITAIRES
============================================

/**
 * Nettoyer une chaîne (enlever accents, caractères spéciaux)
 * @param {string} str - Chaîne à nettoyer
 * @returns {string} Chaîne nettoyée
 */
const cleanString = (str) => {
    if (!str) return '';
    
    // Supprimer les accents
    const accents = {
        'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
        'à': 'A', 'á': 'A', 'â': 'A', 'ã': 'A', 'ä': 'A', 'å': 'A',
        'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
        'è': 'E', 'é': 'E', 'ê': 'E', 'ë': 'E',
        'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
        'ì': 'I', 'í': 'I', 'î': 'I', 'ï': 'I',
        'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
        'ò': 'O', 'ó': 'O', 'ô': 'O', 'õ': 'O', 'ö': 'O',
        'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
        'ù': 'U', 'ú': 'U', 'û': 'U', 'ü': 'U',
        'Ç': 'C', 'ç': 'C',
        'Ñ': 'N', 'ñ': 'N'
    };
    
    let cleaned = str;
    for (const [accent, letter] of Object.entries(accents)) {
        cleaned = cleaned.replace(new RegExp(accent, 'g'), letter);
    }
    
    // Supprimer les caractères non alphabétiques
    cleaned = cleaned.replace(/[^A-Za-z]/g, '');
    
    return cleaned.toUpperCase();
};

/**
 * Générer une partie aléatoire
 * @param {number} length - Longueur de la partie aléatoire
 * @returns {string} Chaîne aléatoire
 */
const generateRandomPart = (length = 4) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Générer un numéro séquentiel
 * @param {number} count - Compteur actuel
 * @param {number} length - Longueur du padding
 * @returns {string} Numéro formaté
 */
const generateSequentialNumber = (count, length = 4) => {
    return count.toString().padStart(length, '0');
};

// ============================================
# GÉNÉRATEURS DE MATRICULE
============================================

/**
 * Générer un matricule unique (version standard)
 * @param {string} nom - Nom de la personne
 * @param {string} prenom - Prénom de la personne
 * @param {number} sequence - Numéro séquentiel (optionnel)
 * @returns {string} Matricule généré
 */
export function generateMatricule(nom, prenom, sequence = null) {
    const cleanedNom = cleanString(nom);
    const cleanedPrenom = cleanString(prenom || '');
    
    const nomCode = cleanedNom.substring(0, MATRICULE_CONFIG.LENGTH.NOM).padEnd(MATRICULE_CONFIG.LENGTH.NOM, 'X');
    const prenomCode = cleanedPrenom.substring(0, MATRICULE_CONFIG.LENGTH.PRENOM).padEnd(MATRICULE_CONFIG.LENGTH.PRENOM, 'X');
    
    const year = new Date().getFullYear();
    
    let randomPart;
    if (sequence !== null) {
        randomPart = generateSequentialNumber(sequence, MATRICULE_CONFIG.LENGTH.RANDOM);
    } else {
        randomPart = generateRandomPart(MATRICULE_CONFIG.LENGTH.RANDOM);
    }
    
    return `${MATRICULE_CONFIG.PREFIX}${MATRICULE_CONFIG.SEPARATOR}${year}${MATRICULE_CONFIG.SEPARATOR}${nomCode}${prenomCode}${MATRICULE_CONFIG.SEPARATOR}${randomPart}`;
}

/**
 * Générer un matricule pour un technicien
 * @param {string} nom - Nom du technicien
 * @param {string} prenom - Prénom du technicien
 * @param {number} sequence - Numéro séquentiel
 * @returns {string} Matricule technicien
 */
export function generateTechnicienMatricule(nom, prenom, sequence = null) {
    const prefix = 'TECH';
    const cleanedNom = cleanString(nom);
    const cleanedPrenom = cleanString(prenom || '');
    
    const nomCode = cleanedNom.substring(0, 2).toUpperCase();
    const prenomCode = cleanedPrenom.substring(0, 1).toUpperCase();
    
    const year = new Date().getFullYear();
    const randomPart = sequence !== null 
        ? generateSequentialNumber(sequence, 3)
        : generateRandomPart(3);
    
    return `${prefix}${MATRICULE_CONFIG.SEPARATOR}${year}${MATRICULE_CONFIG.SEPARATOR}${nomCode}${prenomCode}${MATRICULE_CONFIG.SEPARATOR}${randomPart}`;
}

/**
 * Générer un matricule pour un équipement
 * @param {string} type - Type d'équipement
 * @param {string} service - Service
 * @param {number} sequence - Numéro séquentiel
 * @returns {string} Matricule équipement
 */
export function generateEquipmentMatricule(type, service, sequence = null) {
    const typeMap = {
        'IMAGERIE': 'IMG',
        'MONITORING': 'MON',
        'RESPIRATION': 'RES',
        'LABORATOIRE': 'LAB',
        'CHIRURGIE': 'CHI',
        'STERILISATION': 'STE',
        'AUTRE': 'AUT'
    };
    
    const serviceMap = {
        'URGENCES': 'URG',
        'RADIOLOGIE': 'RAD',
        'BLOC_OPERATOIRE': 'BLO',
        'PEDIATRIE': 'PED',
        'MEDECINE_INTERNE': 'MED',
        'CHIRURGIE': 'CHI',
        'LABORATOIRE': 'LAB',
        'USI': 'USI'
    };
    
    const typeCode = typeMap[type] || 'EQU';
    const serviceCode = serviceMap[service] || 'SRV';
    const year = new Date().getFullYear();
    const sequencePart = sequence !== null 
        ? generateSequentialNumber(sequence, 3)
        : generateRandomPart(3);
    
    return `${typeCode}${MATRICULE_CONFIG.SEPARATOR}${serviceCode}${MATRICULE_CONFIG.SEPARATOR}${year}${MATRICULE_CONFIG.SEPARATOR}${sequencePart}`;
}

/**
 * Générer un matricule pour une pièce détachée
 * @param {string} categorie - Catégorie de la pièce
 * @param {number} sequence - Numéro séquentiel
 * @returns {string} Matricule pièce
 */
export function generatePieceMatricule(categorie, sequence = null) {
    const categorieMap = {
        'ELECTRONIQUE': 'ELC',
        'MECANIQUE': 'MEC',
        'CONSOMMABLE': 'CON',
        'SONDE': 'SND',
        'CABLE': 'CAB',
        'BATTERIE': 'BAT',
        'CARTE_MERE': 'CAR',
        'AUTRE': 'AUT'
    };
    
    const categorieCode = categorieMap[categorie] || 'PCE';
    const year = new Date().getFullYear();
    const sequencePart = sequence !== null 
        ? generateSequentialNumber(sequence, 4)
        : generateRandomPart(4);
    
    return `${categorieCode}${MATRICULE_CONFIG.SEPARATOR}${year}${MATRICULE_CONFIG.SEPARATOR}${sequencePart}`;
}

/**
 * Valider un format de matricule
 * @param {string} matricule - Matricule à valider
 * @param {string} type - Type de matricule ('user', 'technicien', 'equipment', 'piece')
 * @returns {boolean} true si valide
 */
export function validateMatricule(matricule, type = 'user') {
    if (!matricule) return false;
    
    const patterns = {
        user: /^HZSI-\d{4}-[A-Z]{3}[A-Z]{2}-\d{4}$/,
        technicien: /^TECH-\d{4}-[A-Z]{2}[A-Z]{1}-\d{3}$/,
        equipment: /^[A-Z]{3}-[A-Z]{3}-\d{4}-\d{3}$/,
        piece: /^[A-Z]{3}-\d{4}-\d{4}$/
    };
    
    const pattern = patterns[type];
    return pattern ? pattern.test(matricule) : false;
}

/**
 * Extraire les informations d'un matricule
 * @param {string} matricule - Matricule à analyser
 * @returns {Object} Informations extraites
 */
export function parseMatricule(matricule) {
    if (!matricule) return null;
    
    const parts = matricule.split(MATRICULE_CONFIG.SEPARATOR);
    
    if (parts.length === 4) {
        return {
            prefix: parts[0],
            year: parseInt(parts[1]),
            code: parts[2],
            unique: parts[3],
            isValid: validateMatricule(matricule)
        };
    }
    
    return { isValid: false };
}

/**
 * Générer un matricule unique en vérifiant l'existence
 * @param {string} nom - Nom
 * @param {string} prenom - Prénom
 * @param {Function} checkExists - Fonction pour vérifier l'existence
 * @returns {Promise<string>} Matricule unique
 */
export async function generateUniqueMatricule(nom, prenom, checkExists) {
    let matricule;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (exists && attempts < maxAttempts) {
        matricule = generateMatricule(nom, prenom);
        exists = await checkExists(matricule);
        attempts++;
    }
    
    if (exists) {
        // Dernier recours : utiliser un matricule avec timestamp
        const timestamp = Date.now().toString().slice(-4);
        matricule = generateMatricule(nom, prenom, parseInt(timestamp));
    }
    
    return matricule;
}

// ============================================
# EXPORTATION
============================================

export default {
    generateMatricule,
    generateTechnicienMatricule,
    generateEquipmentMatricule,
    generatePieceMatricule,
    validateMatricule,
    parseMatricule,
    generateUniqueMatricule
};
