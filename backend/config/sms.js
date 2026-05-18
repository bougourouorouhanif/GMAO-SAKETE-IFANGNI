import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

let client = null;

// Initialiser Twilio seulement si configuré
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
}

// Envoi de SMS
export async function sendSMS(to, message) {
    if (!client) {
        console.log('⚠️ SMS non configuré');
        return false;
    }
    
    if (!to || to.length < 10) {
        console.log('⚠️ Numéro invalide:', to);
        return false;
    }
    
    try {
        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to,
        });
        console.log('✅ SMS envoyé à', to);
        return true;
    } catch (error) {
        console.error('❌ Erreur SMS:', error.message);
        return false;
    }
}

// SMS de validation de compte
export async function sendValidationSMS(user) {
    const message = `✅ ${user.nom}, votre compte GMAO a été activé ! Connectez-vous sur ${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html`;
    return sendSMS(user.telephone, message);
}

// SMS pour nouvelle intervention (technicien)
export async function sendInterventionSMS(technicien, intervention) {
    const message = `🚨 URGENCE GMAO: Panne sur ${intervention.equipement?.nom} au service ${intervention.equipement?.service}. Connectez-vous pour prendre en charge.`;
    return sendSMS(technicien.telephone, message);
}

// SMS confirmation signalement (soignant)
export async function sendSignalementSMS(soignant, equipement) {
    const message = `✅ ${soignant.nom}, votre signalement pour ${equipement.nom} a été enregistré. Un technicien va prendre en charge votre demande.`;
    return sendSMS(soignant.telephone, message);
}

// SMS quand intervention terminée
export async function sendInterventionTermineeSMS(soignant, equipement) {
    const message = `✅ ${soignant.nom}, la panne sur ${equipement.nom} a été résolue. L'équipement est à nouveau fonctionnel.`;
    return sendSMS(soignant.telephone, message);
}