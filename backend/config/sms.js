// backend/config/sms.js - Configuration SMS avec Twilio pour GMAO Sakété

import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const requiredTwilioVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
const missingTwilioVars = requiredTwilioVars.filter(varName => !process.env[varName]);

// Mode dégradé si Twilio n'est pas configuré
const isTwilioConfigured = () => {
    return !!(process.env.TWILIO_ACCOUNT_SID && 
              process.env.TWILIO_AUTH_TOKEN && 
              process.env.TWILIO_PHONE_NUMBER);
};

if (!isTwilioConfigured() && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Twilio non configuré - les SMS seront en mode simulation');
    console.warn('   Variables manquantes:', missingTwilioVars.join(', '));
}

// ============================================
// INITIALISATION DU CLIENT TWILIO
// ============================================

let twilioClient = null;

const getTwilioClient = () => {
    if (!twilioClient && isTwilioConfigured()) {
        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
    }
    return twilioClient;
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Nettoyer un numéro de téléphone (format international)
 * @param {string} phone - Numéro de téléphone
 * @returns {string} Numéro formaté
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    
    // Supprimer tous les caractères non numériques
    let cleaned = phone.replace(/\D/g, '');
    
    // Si le numéro commence par 0, remplacer par +229 (Bénin)
    if (cleaned.startsWith('0')) {
        cleaned = `+229${cleaned.substring(1)}`;
    }
    // Si le numéro commence par 229 sans +
    else if (cleaned.startsWith('229')) {
        cleaned = `+${cleaned}`;
    }
    // Si le numéro ne commence pas par +
    else if (!cleaned.startsWith('+')) {
        cleaned = `+229${cleaned}`;
    }
    
    return cleaned;
};

/**
 * Valider un numéro de téléphone
 * @param {string} phone - Numéro à valider
 * @returns {boolean} true si valide
 */
const isValidPhoneNumber = (phone) => {
    if (!phone) return false;
    const formatted = formatPhoneNumber(phone);
    // Format Bénin: +229XXXXXXXX
    const regex = /^\+229[0-9]{8}$/;
    return regex.test(formatted);
};

/**
 * Tronquer un message pour SMS (160 caractères max)
 * @param {string} message - Message original
 * @returns {string} Message tronqué
 */
const truncateMessage = (message, maxLength = 160) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
};

// ============================================
// ENVOI DE SMS
// ============================================

/**
 * Envoyer un SMS via Twilio
 * @param {string} to - Numéro du destinataire
 * @param {string} message - Message à envoyer
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<boolean>} true si envoyé
 */
export async function sendSMS(to, message, options = {}) {
    const formattedNumber = formatPhoneNumber(to);
    
    if (!isValidPhoneNumber(formattedNumber)) {
        console.warn(`⚠️ Numéro de téléphone invalide: ${to}`);
        return false;
    }
    
    // Mode simulation si Twilio non configuré
    if (!isTwilioConfigured()) {
        console.log('📱 [SIMULATION] SMS envoyé à', formattedNumber);
        console.log('   Message:', truncateMessage(message));
        return true;
    }
    
    try {
        const client = getTwilioClient();
        const result = await client.messages.create({
            body: truncateMessage(message),
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedNumber,
            ...options
        });
        
        console.log(`✅ SMS envoyé à ${formattedNumber} (SID: ${result.sid})`);
        return true;
    } catch (error) {
        console.error('❌ Erreur envoi SMS:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error(error);
        }
        return false;
    }
}

/**
 * Envoyer un SMS à plusieurs destinataires
 * @param {Array} recipients - Liste des numéros
 * @param {string} message - Message
 * @returns {Promise<Object>} Résultat
 */
export async function sendBulkSMS(recipients, message) {
    const results = {
        total: recipients.length,
        success: [],
        failed: []
    };
    
    for (const recipient of recipients) {
        const success = await sendSMS(recipient, message);
        if (success) {
            results.success.push(recipient);
        } else {
            results.failed.push(recipient);
        }
        // Pause pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`📱 SMS groupé: ${results.success.length}/${results.total} succès`);
    return results;
}

/**
 * Tester la connexion Twilio
 * @returns {Promise<Object>} Résultat du test
 */
export async function testTwilioConnection() {
    if (!isTwilioConfigured()) {
        return { success: false, error: 'Twilio non configuré' };
    }
    
    try {
        const client = getTwilioClient();
        // Récupérer les comptes pour tester la connexion
        await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('✅ Connexion Twilio établie');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur connexion Twilio:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// TEMPLATES DE SMS
// ============================================

/**
 * SMS de validation de compte
 * @param {Object} user - Utilisateur
 * @returns {Promise<boolean>}
 */
export async function sendValidationSMS(user) {
    const message = `🏥 GMAO Sakété: Votre compte a été validé ! Connectez-vous sur https://gmao-sakete.netlify.app/login.html`;
    
    if (user.telephone) {
        return sendSMS(user.telephone, message);
    }
    
    console.log(`⚠️ Aucun téléphone pour ${user.nom}`);
    return false;
}

/**
 * SMS pour nouvelle intervention (technicien)
 * @param {Object} technicien - Technicien
 * @param {Object} intervention - Intervention
 * @returns {Promise<boolean>}
 */
export async function sendInterventionSMS(technicien, intervention) {
    if (!technicien.telephone) {
        console.log(`⚠️ Aucun téléphone pour le technicien ${technicien.nom}`);
        return false;
    }
    
    const equipement = intervention.equipement || {};
    const priorite = intervention.signalement?.priorite || 'HAUTE';
    const prioriteEmoji = priorite === 'CRITIQUE' ? '🚨' : priorite === 'HAUTE' ? '⚠️' : '🔧';
    
    const message = `${prioriteEmoji} GMAO: Intervention ${priorite} sur ${equipement.nom} (${equipement.service}). Connectez-vous pour prendre en charge.`;
    
    return sendSMS(technicien.telephone, message);
}

/**
 * SMS de confirmation de signalement (soignant)
 * @param {Object} soignant - Soignant
 * @param {Object} equipement - Équipement
 * @returns {Promise<boolean>}
 */
export async function sendSignalementSMS(soignant, equipement) {
    if (!soignant.telephone) {
        console.log(`⚠️ Aucun téléphone pour le soignant ${soignant.nom}`);
        return false;
    }
    
    const message = `📋 GMAO: Signalement enregistré pour ${equipement.nom}. Un technicien va intervenir.`;
    
    return sendSMS(soignant.telephone, message);
}

/**
 * SMS quand une intervention est terminée (soignant)
 * @param {Object} soignant - Soignant
 * @param {Object} equipement - Équipement
 * @returns {Promise<boolean>}
 */
export async function sendInterventionTermineeSMS(soignant, equipement) {
    if (!soignant.telephone) {
        console.log(`⚠️ Aucun téléphone pour le soignant ${soignant.nom}`);
        return false;
    }
    
    const message = `✅ GMAO: Panne résolue sur ${equipement.nom}. L'équipement est à nouveau fonctionnel.`;
    
    return sendSMS(soignant.telephone, message);
}

// ============================================
// EXPORTATION
// ============================================

export default {
    sendSMS,
    sendBulkSMS,
    sendValidationSMS,
    sendInterventionSMS,
    sendSignalementSMS,
    sendInterventionTermineeSMS,
    testTwilioConnection,
    isTwilioConfigured,
    formatPhoneNumber,
    isValidPhoneNumber
};
