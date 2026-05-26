// backend/config/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const isEmailConfigured = () => {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

if (!isEmailConfigured() && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Email non configuré - les emails seront en mode simulation');
    console.warn('   Variables manquantes: EMAIL_USER, EMAIL_PASS');
}

// ============================================
// CONFIGURATION DU TRANSPORTEUR
// ============================================

const getTransporter = () => {
    if (!isEmailConfigured()) {
        // Mode simulation
        return null;
    }

    const config = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 5,
        rateDelta: 1000,
        rateLimit: 5
    };

    // Configuration spécifique pour Gmail
    if (config.host === 'smtp.gmail.com') {
        config.auth = {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        };
    }

    return nodemailer.createTransport(config);
};

let transporter = null;

// ============================================
// FONCTION D'ENVOI D'EMAIL
// ============================================

/**
 * Envoyer un email
 * @param {string} to - Destinataire
 * @param {string} subject - Sujet
 * @param {string} html - Contenu HTML
 * @param {string} text - Contenu texte (optionnel)
 * @returns {Promise<Object>} Résultat de l'envoi
 */
export const sendEmail = async (to, subject, html, text = null) => {
    // Mode simulation
    if (!isEmailConfigured()) {
        console.log('📧 [SIMULATION] Email envoyé à', to);
        console.log('   Sujet:', subject);
        console.log('   Contenu:', text || html.replace(/<[^>]*>/g, '').substring(0, 200));
        return { messageId: `sim-${Date.now()}`, accepted: [to] };
    }

    // Initialiser le transporteur si nécessaire
    if (!transporter) {
        transporter = getTransporter();
        // Vérifier la connexion
        try {
            await transporter.verify();
            console.log('✅ Serveur email connecté');
        } catch (error) {
            console.error('❌ Erreur connexion email:', error.message);
            throw error;
        }
    }

    try {
        const info = await transporter.sendMail({
            from: `"GMAO Hôpital Sakété" <${process.env.EMAIL_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            text: text || html.replace(/<[^>]*>/g, ''),
            html: html,
        });

        console.log(`✅ Email envoyé à ${to} (${info.messageId})`);
        return info;
    } catch (error) {
        console.error('❌ Erreur envoi email:', error.message);
        throw error;
    }
};

// ============================================
// TEMPLATE DE BASE
// ============================================

/**
 * Template de base pour les emails
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
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f1f5f9; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, ${color}, ${color === '#0066FF' ? '#0052CC' : '#166534'}); color: white; padding: 30px 20px; text-align: center; border-radius: 20px 20px 0 0; }
                .content { background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; }
                .button { display: inline-block; padding: 12px 30px; background: ${color}; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; }
                .info-box { background: #f8fafc; padding: 15px; border-radius: 12px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🏥 GMAO Hôpital Sakété-Ifangni</h2>
                </div>
                <div class="content">
                    <h3>${title}</h3>
                    ${content}
                    ${buttonHtml}
                </div>
                <div class="footer">
                    <p>GMAO - Gestion de Maintenance Assistée par Ordinateur</p>
                    <p>Hôpital de Zone Sakété-Ifangni • Bénin</p>
                    <p style="margin-top: 10px;">
                        <a href="${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}" style="color: #0066FF; text-decoration: none;">Accéder à la plateforme</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
};

// ============================================
// EMAILS SPÉCIFIQUES
// ============================================

/**
 * Email de validation de compte
 */
export const sendValidationEmail = async (user) => {
    const content = `
        <p>Bonjour <strong>${user.nom} ${user.prenom || ''}</strong>,</p>
        <p>Votre compte a été <strong style="color: #22c55e;">validé</strong> par le service biomédical.</p>
        
        <div class="info-box">
            <p><strong>📋 Vos identifiants :</strong></p>
            <p>👤 Identifiant : ${user.email}</p>
            <p>🆔 Matricule : ${user.matricule}</p>
        </div>
        
        <p>Vous pouvez maintenant vous connecter à l'application GMAO.</p>
    `;

    const html = getBaseTemplate(
        '✅ Votre compte GMAO a été validé',
        content,
        '🔐 Se connecter',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html`,
        '#22c55e'
    );

    return sendEmail(user.email, '✅ Votre compte GMAO a été validé', html);
};

/**
 * Email de bienvenue après inscription
 */
export const sendWelcomeEmail = async (user, plainPassword) => {
    const content = `
        <p>Bonjour <strong>${user.nom} ${user.prenom || ''}</strong>,</p>
        <p>Votre compte a été créé avec succès sur la plateforme GMAO.</p>
        
        <div class="info-box">
            <p><strong>📋 Vos identifiants de connexion :</strong></p>
            <p><strong>👤 Identifiant :</strong> ${user.email}</p>
            <p><strong>🔑 Mot de passe :</strong> ${plainPassword}</p>
            <p><strong>🆔 Matricule :</strong> ${user.matricule}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 12px; margin: 15px 0;">
            <p><strong>⚠️ Important :</strong> Votre compte est en attente de validation par le technicien biomédical.</p>
            <p>Vous recevrez un email de confirmation dès son activation.</p>
        </div>
    `;

    const html = getBaseTemplate(
        '🏥 Bienvenue sur GMAO Sakété',
        content,
        '🔐 Se connecter',
        `${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html`,
        '#0066FF'
    );

    return sendEmail(user.email, '🏥 Bienvenue sur GMAO Sakété', html);
};

// ============================================
// TEST DE CONNEXION
// ============================================

/**
 * Tester la connexion email
 */
export const testEmailConnection = async () => {
    if (!isEmailConfigured()) {
        return { success: false, error: 'Email non configuré' };
    }

    try {
        const testTransporter = getTransporter();
        await testTransporter.verify();
        console.log('✅ Connexion email établie');
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur connexion email:', error.message);
        return { success: false, error: error.message };
    }
};

// ============================================
// NOTIFICATIONS INTERVENTIONS (templates)
// ============================================

export const sendInterventionEmail = async (technicien, intervention) => {
    if (!isEmailConfigured() || !technicien?.email) return { success: false, skipped: true };
    const subject = `🔧 Nouvelle intervention #${intervention?.id || ''}`;
    const html = `<h2>Bonjour ${technicien.prenom || ''} ${technicien.nom || ''}</h2>
        <p>Une nouvelle intervention vous est assignée.</p>
        <p><strong>Équipement :</strong> ${intervention?.equipement?.nom || '-'}</p>
        <p><strong>Priorité :</strong> ${intervention?.priorite || 'MOYENNE'}</p>`;
    return sendEmail(technicien.email, subject, html);
};

export const sendSignalementConfirmationEmail = async (soignant, equipement) => {
    if (!isEmailConfigured() || !soignant?.email) return { success: false, skipped: true };
    const subject = `✅ Signalement enregistré — ${equipement?.nom || ''}`;
    const html = `<h2>Bonjour ${soignant.prenom || ''}</h2>
        <p>Votre signalement pour <strong>${equipement?.nom || 'cet équipement'}</strong> a été enregistré.</p>
        <p>Un technicien interviendra dès que possible.</p>`;
    return sendEmail(soignant.email, subject, html);
};

export const sendInterventionTermineeEmail = async (soignant, equipement) => {
    if (!isEmailConfigured() || !soignant?.email) return { success: false, skipped: true };
    const subject = `✅ Panne résolue — ${equipement?.nom || ''}`;
    const html = `<h2>Bonjour ${soignant.prenom || ''}</h2>
        <p>L'équipement <strong>${equipement?.nom || ''}</strong> est à nouveau fonctionnel.</p>`;
    return sendEmail(soignant.email, subject, html);
};

// ============================================
// EXPORTATION
// ============================================

export default {
    sendEmail,
    sendValidationEmail,
    sendWelcomeEmail,
    testEmailConnection,
    isEmailConfigured
};
