// config/email.js - Configuration Nodemailer pour GMAO Sakété

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const requiredEmailVars = ['EMAIL_USER', 'EMAIL_PASS'];
const missingEmailVars = requiredEmailVars.filter(varName => !process.env[varName]);

if (missingEmailVars.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Variables d\'environnement email manquantes:', missingEmailVars.join(', '));
}

// ============================================
# CONFIGURATION TRANSPORTEUR
============================================

// Configuration par défaut (Gmail)
const defaultConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true pour 465, false pour 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false // Pour éviter les erreurs SSL en développement
    },
    pool: true, // Utiliser un pool de connexions
    maxConnections: 5,
    rateDelta: 1000, // 1 seconde entre les messages
    rateLimit: 5 // Maximum 5 messages par seconde
};

// Configuration alternative (SendGrid, Mailgun, etc.)
const getMailConfig = () => {
    const provider = process.env.EMAIL_PROVIDER || 'smtp';
    
    switch (provider.toLowerCase()) {
        case 'sendgrid':
            return {
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: process.env.SENDGRID_API_KEY
                }
            };
        case 'mailgun':
            return {
                host: 'smtp.mailgun.org',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.MAILGUN_USER,
                    pass: process.env.MAILGUN_PASS
                }
            };
        default:
            return defaultConfig;
    }
};

// Création du transporteur
let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        const config = getMailConfig();
        transporter = nodemailer.createTransport(config);
    }
    return transporter;
};

// ============================================
# FONCTIONS UTILITAIRES
============================================

/**
 * Vérifier si l'email est configuré
 * @returns {boolean} true si configuré
 */
export const isEmailConfigured = () => {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

/**
 * Tester la connexion email
 * @returns {Promise<Object>} Résultat du test
 */
export const testEmailConnection = async () => {
    if (!isEmailConfigured()) {
        return { success: false, error: 'Email non configuré' };
    }

    try {
        const transporter = getTransporter();
        await transporter.verify();
        console.log('✅ Serveur email connecté avec succès');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur connexion email:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Envoi d'email générique
 * @param {string} to - Destinataire
 * @param {string} subject - Sujet
 * @param {string} html - Contenu HTML
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<boolean>} true si envoyé
 */
export async function sendEmail(to, subject, html, options = {}) {
    if (!isEmailConfigured()) {
        console.log('⚠️ Email non configuré - envoi ignoré');
        console.log(`   Destinataire: ${to}`);
        console.log(`   Sujet: ${subject}`);
        return false;
    }

    try {
        const transporter = getTransporter();
        const info = await transporter.sendMail({
            from: `"GMAO Sakété" <${process.env.EMAIL_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: html,
            ...options
        });

        console.log(`✅ Email envoyé à ${to}`);
        if (process.env.NODE_ENV === 'development') {
            console.log(`   Message ID: ${info.messageId}`);
        }
        return true;
    } catch (error) {
        console.error('❌ Erreur envoi email:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error(error);
        }
        return false;
    }
}

/**
 * Envoi d'email à plusieurs destinataires
 * @param {Array} recipients - Liste des destinataires
 * @param {string} subject - Sujet
 * @param {string} html - Contenu HTML
 * @returns {Promise<Object>} Résultat avec succès et échecs
 */
export async function sendBulkEmail(recipients, subject, html) {
    const results = {
        total: recipients.length,
        success: [],
        failed: []
    };

    for (const recipient of recipients) {
        const success = await sendEmail(recipient, subject, html);
        if (success) {
            results.success.push(recipient);
        } else {
            results.failed.push(recipient);
        }
        // Petit délai pour ne pas surcharger
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`📧 Envoi groupé: ${results.success.length}/${results.total} succès`);
    return results;
}

// ============================================
# TEMPLATES HTML
============================================

/**
 * Template de base pour tous les emails
 * @param {string} title - Titre
 * @param {string} content - Contenu
 * @param {string} buttonText - Texte du bouton (optionnel)
 * @param {string} buttonUrl - URL du bouton (optionnel)
 * @param {string} color - Couleur principale
 * @returns {string} HTML complet
 */
const getBaseTemplate = (title, content, buttonText = null, buttonUrl = null, color = '#0066FF') => {
    const buttonHtml = buttonText && buttonUrl ? `
        <div style="text-align: center; margin: 25px 0;">
            <a href="${buttonUrl}" style="
                background: ${color};
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 50px;
                display: inline-block;
                font-weight: bold;
            ">${buttonText}</a>
        </div>
    ` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, ${color}, ${color === '#0066FF' ? '#0052CC' : '#166534'}); padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🏥 GMAO Sakété</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Hôpital de Zone Sakété-Ifangni</p>
                    </div>
                    
                    <div style="padding: 30px;">
                        <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
                        <div style="color: #475569; line-height: 1.6;">
                            ${content}
                        </div>
                        ${buttonHtml}
                    </div>
                    
                    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 5px; font-size: 12px; color: #64748b;">
                            GMAO - Gestion de Maintenance Assistée par Ordinateur
                        </p>
                        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                            Hôpital de Zone Sakété-Ifangni • Bénin
                        </p>
                        <p style="margin: 10px 0 0; font-size: 11px; color: #94a3b8;">
                            <a href="${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}" style="color: #0066FF; text-decoration: none;">Accéder à la plateforme</a>
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

// ============================================
# EMAILS SPÉCIFIQUES
============================================

/**
 * Email de bienvenue après inscription
 * @param {Object} user - Utilisateur
 * @param {string} plainPassword - Mot de passe en clair
 * @returns {Promise<boolean>}
 */
export async function sendWelcomeEmail(user, plainPassword) {
    const content = `
        <p>Bonjour <strong>${user.nom} ${user.prenom || ''}</strong>,</p>
        <p>Votre compte a été créé avec succès sur la plateforme GMAO.</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px; color: #1e293b;">📋 Vos identifiants de connexion :</h4>
            <p style="margin: 5px 0;"><strong>👤 Identifiant :</strong> ${user.email}</p>
            <p style="margin: 5px 0;"><strong>🔑 Mot de passe :</strong> ${plainPassword}</p>
            <p style="margin: 5px 0;"><strong>🆔 Matricule :</strong> ${user.matricule}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Important :</strong> Votre compte est en attente de validation par le technicien biomédical.</p>
            <p style="margin: 5px 0 0;">Vous recevrez un email de confirmation dès son activation.</p>
        </div>
    `;
    
    const html = getBaseTemplate(
        'Bienvenue sur GMAO Sakété',
        content,
        '🔐 Se connecter',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html`,
        '#0066FF'
    );
    
    return sendEmail(user.email, '🏥 Bienvenue sur GMAO Sakété', html);
}

/**
 * Email de validation du compte
 * @param {Object} user - Utilisateur
 * @returns {Promise<boolean>}
 */
export async function sendValidationEmail(user) {
    const content = `
        <p>Bonjour <strong>${user.nom} ${user.prenom || ''}</strong>,</p>
        <p>Votre compte a été <strong style="color: #22c55e;">validé</strong> par le technicien biomédical.</p>
        <p>Vous pouvez dès maintenant :</p>
        <ul style="margin: 15px 0; padding-left: 20px;">
            <li>📱 Scanner les QR codes des équipements</li>
            <li>⚠️ Signaler des pannes via le chatbot</li>
            <li>📊 Consulter l'état des équipements</li>
            <li>🔍 Suivre l'historique de vos signalements</li>
        </ul>
    `;
    
    const html = getBaseTemplate(
        '✅ Votre compte GMAO est activé',
        content,
        '🔐 Se connecter',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html`,
        '#22c55e'
    );
    
    return sendEmail(user.email, '✅ Votre compte GMAO est activé', html);
}

/**
 * Email de rejet d'inscription
 * @param {Object} user - Utilisateur
 * @returns {Promise<boolean>}
 */
export async function sendRejectionEmail(user) {
    const content = `
        <p>Bonjour <strong>${user.nom} ${user.prenom || ''}</strong>,</p>
        <p>Nous vous remercions de votre intérêt pour la plateforme GMAO.</p>
        <p>Après vérification, votre demande d'inscription n'a pas pu être validée.</p>
        <p>Pour toute question, veuillez contacter le service biomédical au <strong>+229 97 12 34 56</strong>.</p>
    `;
    
    const html = getBaseTemplate(
        '❌ Inscription non validée',
        content,
        null,
        null,
        '#ef4444'
    );
    
    return sendEmail(user.email, '❌ Votre inscription GMAO', html);
}

/**
 * Email pour nouvelle intervention (technicien)
 * @param {Object} technicien - Technicien
 * @param {Object} intervention - Intervention
 * @returns {Promise<boolean>}
 */
export async function sendInterventionEmail(technicien, intervention) {
    const equipement = intervention.equipement || {};
    const priorite = intervention.signalement?.priorite || 'HAUTE';
    const prioriteColor = priorite === 'CRITIQUE' ? '#ef4444' : '#f59e0b';
    
    const content = `
        <p>Bonjour <strong>${technicien.nom}</strong>,</p>
        <p>Une nouvelle panne a été signalée :</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>🔧 Équipement :</strong> ${equipement.nom || 'Non spécifié'}</p>
            <p style="margin: 5px 0;"><strong>🏥 Service :</strong> ${equipement.service || 'Non spécifié'}</p>
            <p style="margin: 5px 0;"><strong>⚠️ Priorité :</strong> <span style="color: ${prioriteColor}; font-weight: bold;">${priorite}</span></p>
            ${intervention.signalement?.description ? `<p style="margin: 5px 0;"><strong>📝 Description :</strong> ${intervention.signalement.description.substring(0, 200)}</p>` : ''}
        </div>
    `;
    
    const html = getBaseTemplate(
        '🚨 Nouvelle intervention',
        content,
        '🔧 Prendre en charge',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/technicien/maintenances.html?id=${intervention.id}`,
        '#ef4444'
    );
    
    return sendEmail(technicien.email, '🚨 Nouvelle intervention GMAO', html);
}

/**
 * Email de confirmation de signalement (soignant)
 * @param {Object} soignant - Soignant
 * @param {Object} equipement - Équipement
 * @param {string} interventionId - ID de l'intervention
 * @returns {Promise<boolean>}
 */
export async function sendSignalementConfirmationEmail(soignant, equipement, interventionId) {
    const content = `
        <p>Bonjour <strong>${soignant.nom} ${soignant.prenom || ''}</strong>,</p>
        <p>Votre signalement concernant l'équipement <strong>${equipement.nom}</strong> a bien été enregistré.</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📋 N° intervention :</strong> #${interventionId}</p>
            <p style="margin: 5px 0;"><strong>🔧 Équipement :</strong> ${equipement.nom} (${equipement.codeInventaire})</p>
            <p style="margin: 5px 0;"><strong>📍 Service :</strong> ${equipement.service || 'Non spécifié'}</p>
        </div>
        
        <p>Un technicien va prendre en charge votre demande dans les plus brefs délais.</p>
        <p>Vous pouvez suivre l'avancement de votre demande dans l'onglet <strong>"Historique"</strong>.</p>
    `;
    
    const html = getBaseTemplate(
        '📋 Signalement enregistré',
        content,
        '📜 Voir mon historique',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/soignant/historique.html`,
        '#3b82f6'
    );
    
    return sendEmail(soignant.email, '📋 Votre signalement a été enregistré', html);
}

/**
 * Email quand une intervention est terminée (soignant)
 * @param {Object} soignant - Soignant
 * @param {Object} intervention - Intervention
 * @returns {Promise<boolean>}
 */
export async function sendInterventionTermineeEmail(soignant, intervention) {
    const equipement = intervention.equipement || {};
    
    const content = `
        <p>Bonjour <strong>${soignant.nom} ${soignant.prenom || ''}</strong>,</p>
        <p>La panne sur l'équipement <strong>${equipement.nom}</strong> a été résolue.</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>🔧 Équipement :</strong> ${equipement.nom}</p>
            <p style="margin: 5px 0;"><strong>✅ Statut :</strong> Fonctionnel</p>
            ${intervention.dateFin ? `<p style="margin: 5px 0;"><strong>📅 Date de résolution :</strong> ${new Date(intervention.dateFin).toLocaleString('fr-FR')}</p>` : ''}
        </div>
        
        <p>L'équipement est à nouveau disponible.</p>
        <p>Si vous rencontrez à nouveau un problème, n'hésitez pas à signaler une nouvelle panne.</p>
    `;
    
    const html = getBaseTemplate(
        '✅ Panne résolue',
        content,
        '📋 Voir le détail',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/soignant/historique.html`,
        '#22c55e'
    );
    
    return sendEmail(soignant.email, '✅ Panne résolue - GMAO', html);
}

/**
 * Email pour le rapport mensuel
 * @param {string} email - Email du destinataire
 * @param {Object} data - Données du rapport
 * @returns {Promise<boolean>}
 */
export async function sendMonthlyReportEmail(email, data) {
    const content = `
        <p>Bonjour,</p>
        <p>Voici le rapport mensuel de maintenance pour la période du <strong>${data.mois}/${data.annee}</strong> :</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📊 Disponibilité globale :</strong> ${data.disponibilite || 0}%</p>
            <p style="margin: 5px 0;"><strong>🔧 Interventions réalisées :</strong> ${data.interventions || 0}</p>
            <p style="margin: 5px 0;"><strong>⏱️ Temps moyen de réparation :</strong> ${data.mttr || 0} heures</p>
            <p style="margin: 5px 0;"><strong>💰 Coût maintenance :</strong> ${(data.coutTotal || 0).toLocaleString()} FCFA</p>
        </div>
    `;
    
    const html = getBaseTemplate(
        '📊 Rapport mensuel GMAO',
        content,
        '📈 Voir les détails',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/technicien/codir-rapports.html`,
        '#3b82f6'
    );
    
    return sendEmail(email, '📊 Rapport mensuel GMAO', html);
}

// ============================================
# INITIALISATION
============================================

// Tester la connexion au démarrage (non bloquant)
if (process.env.NODE_ENV === 'development') {
    testEmailConnection().catch(console.error);
}

export default {
    sendEmail,
    sendBulkEmail,
    sendWelcomeEmail,
    sendValidationEmail,
    sendRejectionEmail,
    sendInterventionEmail,
    sendSignalementConfirmationEmail,
    sendInterventionTermineeEmail,
    sendMonthlyReportEmail,
    isEmailConfigured,
    testEmailConnection
};
