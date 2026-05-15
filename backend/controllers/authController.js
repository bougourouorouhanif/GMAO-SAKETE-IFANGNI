import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { generateMatricule, sendWelcomeEmail, sendValidationEmail } from '../config/email.js';

// Inscription (auto-inscription soignant, sauf email spécial pour technicien)
export const register = async (req, res) => {
    const { nom, prenom, email, telephone, service, password } = req.body;

    try {
        // Vérifier si l'email existe déjà
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }

        // Générer le matricule automatiquement
        const matricule = generateMatricule(nom, prenom || '');

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🔧 Déterminer rôle et statut selon l'email (création du premier technicien)
        let role = 'SOIGNANT';
        let statut = 'EN_ATTENTE';
        if (email === 'tech.biomedical@hopital.bj') {
            role = 'TECHNICIEN';
            statut = 'ACTIF';
        }

        // Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                nom,
                prenom: prenom || null,
                email,
                matricule,
                telephone: telephone || null,
                service: service || null,
                password: hashedPassword,
                role: role,
                statut: statut,
            },
        });

        // Envoyer email avec les identifiants (optionnel)
        try {
            await sendWelcomeEmail(user, password);
        } catch (emailError) {
            console.log('Email non envoyé (configuration manquante)');
        }

        res.status(201).json({
            message: 'Inscription réussie ! Un email avec vos identifiants a été envoyé.',
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                matricule: user.matricule,
                role: user.role,
                statut: user.statut,
            },
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
};

// Connexion
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        // Vérifier le statut
        if (user.statut === 'EN_ATTENTE') {
            return res.status(401).json({
                message: 'Votre compte est en attente de validation par le technicien.'
            });
        }

        if (user.statut === 'INACTIF') {
            return res.status(401).json({ message: 'Votre compte a été désactivé.' });
        }

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        // Mettre à jour dernière connexion
        await prisma.user.update({
            where: { id: user.id },
            data: { dernierConnexion: new Date() },
        });

        // Générer le token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                role: user.role,
                service: user.service,
            },
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
};

// Validation du compte par le technicien
export const validateUser = async (req, res) => {
    const { userId } = req.params;
    const technicienId = req.user.id;

    try {
        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: {
                statut: 'ACTIF',
                valideParId: technicienId,
                dateValidation: new Date(),
            },
        });

        try {
            await sendValidationEmail(user);
        } catch (emailError) {
            console.log('Email de validation non envoyé');
        }

        res.json({ message: 'Compte validé avec succès', user });
    } catch (error) {
        console.error('Erreur validation:', error);
        res.status(500).json({ message: 'Erreur lors de la validation' });
    }
};

// Rejeter l'inscription
export const rejectUser = async (req, res) => {
    const { userId } = req.params;

    try {
        await prisma.user.delete({ where: { id: parseInt(userId) } });
        res.json({ message: 'Inscription rejetée' });
    } catch (error) {
        console.error('Erreur rejet:', error);
        res.status(500).json({ message: 'Erreur lors du rejet' });
    }
};

// Désactiver/Activer un compte
export const toggleUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { actif } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { statut: actif ? 'ACTIF' : 'INACTIF' },
        });

        res.json({ message: `Compte ${actif ? 'activé' : 'désactivé'}`, user });
    } catch (error) {
        console.error('Erreur toggle:', error);
        res.status(500).json({ message: 'Erreur lors de l\'opération' });
    }
};

// Vérifier le token
export const verifyToken = async (req, res) => {
    res.json(req.user);
};