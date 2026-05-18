import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Envoi d'email générique
export async function sendEmail(to, subject, html) {
    if (!process.env.RESEND_API_KEY) {
        console.log('⚠️ Email non configuré (manque RESEND_API_KEY)');
        return false;
    }
    
    try {
        const { data, error } = await resend.emails.send({
            from: `GMAO Sakété <notifications@${process.env.EMAIL_DOMAIN || 'gmao-sakete.bj'}>`,
            to: [to],
            subject: subject,
            html: html,
        });
        
        if (error) {
            console.error('Erreur Resend:', error);
            return false;
        }
        console.log('✅ Email envoyé à', to);
        return true;
    } catch (error) {
        console.error('Erreur envoi email:', error);
        return false;
    }
}

// Email de bienvenue après inscription
export async function sendWelcomeEmail(user, plainPassword) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #1a2a4f; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f5f5f5; }
                .credentials { background: white; padding: 15px; border-radius: 10px; margin: 15px 0; }
                .btn { background: #1a2a4f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🏥 Bienvenue sur GMAO Sakété</h2>
                </div>
                <div class="content">
                    <p>Bonjour ${user.nom} ${user.prenom || ''},</p>
                    <p>Votre compte a été créé avec succès sur la plateforme GMAO.</p>
                    
                    <div class="credentials">
                        <h4>📋 Vos identifiants de connexion :</h4>
                        <p><strong>👤 Identifiant :</strong> ${user.email}</p>
                        <p><strong>🔑 Mot de passe :</strong> ${plainPassword}</p>
                        <p><strong>🆔 Matricule :</strong> ${user.matricule}</p>
                    </div>
                    
                    <p>⚠️ <strong>Important :</strong> Votre compte est en attente de validation par le technicien biomédical.</p>
                    <p>Vous recevrez un email de confirmation dès son activation.</p>
                    
                    <a href="${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html" class="btn">🔐 Se connecter</a>
                </div>
                <div class="footer">
                    <p>GMAO - Hôpital de Zone Sakété-Ifangni</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(user.email, '🏥 Bienvenue sur GMAO Sakété', html);
}

// Email de validation du compte
export async function sendValidationEmail(user) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f5f5f5; }
                .btn { background: #1a2a4f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Votre compte GMAO a été activé !</h2>
                </div>
                <div class="content">
                    <p>Bonjour ${user.nom} ${user.prenom || ''},</p>
                    <p>Votre compte a été <strong>validé</strong> par le technicien biomédical.</p>
                    <p>Vous pouvez dès maintenant :</p>
                    <ul>
                        <li>📱 Scanner les QR codes des équipements</li>
                        <li>⚠️ Signaler des pannes via le chatbot</li>
                        <li>📊 Consulter l'état des équipements</li>
                    </ul>
                    <a href="${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/login.html" class="btn">🔐 Se connecter</a>
                </div>
                <div class="footer">
                    <p>GMAO - Hôpital de Zone Sakété-Ifangni</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(user.email, '✅ Votre compte GMAO est activé', html);
}

// Email pour nouvelle intervention (technicien)
export async function sendInterventionEmail(technicien, intervention) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f5f5f5; }
                .btn { background: #1a2a4f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🚨 Nouvelle intervention urgente</h2>
                </div>
                <div class="content">
                    <p>Bonjour ${technicien.nom},</p>
                    <p>Une nouvelle panne a été signalée :</p>
                    <ul>
                        <li><strong>Équipement :</strong> ${intervention.equipement?.nom}</li>
                        <li><strong>Service :</strong> ${intervention.equipement?.service}</li>
                        <li><strong>Priorité :</strong> ${intervention.signalement?.priorite || 'HAUTE'}</li>
                    </ul>
                    <a href="${process.env.FRONTEND_URL || 'https://gmao-sakete.netlify.app'}/technicien/intervention-detail.html?id=${intervention.id}" class="btn">🔧 Prendre en charge</a>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(technicien.email, '🚨 Nouvelle intervention GMAO', html);
}

// Email de confirmation de signalement (soignant)
export async function sendSignalementConfirmationEmail(soignant, equipement) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f5f5f5; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>📋 Signalement enregistré</h2>
                </div>
                <div class="content">
                    <p>Bonjour ${soignant.nom},</p>
                    <p>Votre signalement concernant l'équipement <strong>${equipement.nom}</strong> a bien été enregistré.</p>
                    <p>Un technicien va prendre en charge votre demande dans les plus brefs délais.</p>
                    <p>Vous pouvez suivre l'avancement de votre demande dans l'onglet "Historique".</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(soignant.email, '📋 Votre signalement a été enregistré', html);
}

// Email quand une intervention est terminée (soignant)
export async function sendInterventionTermineeEmail(soignant, intervention) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f5f5f5; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Panne résolue</h2>
                </div>
                <div class="content">
                    <p>Bonjour ${soignant.nom},</p>
                    <p>La panne sur l'équipement <strong>${intervention.equipement?.nom}</strong> a été résolue.</p>
                    <p>L'équipement est à nouveau fonctionnel.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(soignant.email, '✅ Panne résolue', html);
}