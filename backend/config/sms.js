import dotenv from 'dotenv';

dotenv.config();

// Version temporaire sans Twilio (pour que l'app démarre)
export async function sendSMS(to, message) {
    console.log('📱 SMS non envoyé (Twilio désactivé temporairement)');
    console.log('📱 Destinataire:', to);
    console.log('📱 Message:', message);
    return true;
}

export async function sendValidationSMS(user) {
    console.log('📱 SMS validation non envoyé (mode dégradé)');
    return true;
}

export async function sendInterventionSMS(technicien, intervention) {
    console.log('📱 SMS intervention non envoyé (mode dégradé)');
    return true;
}

export async function sendSignalementSMS(soignant, equipement) {
    console.log('📱 SMS signalement non envoyé (mode dégradé)');
    return true;
}

export async function sendInterventionTermineeSMS(soignant, equipement) {
    console.log('📱 SMS terminaison non envoyé (mode dégradé)');
    return true;
}