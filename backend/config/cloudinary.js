// config/cloudinary.js - Configuration Cloudinary pour GMAO Sakété

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// VALIDATION DES VARIABES D'ENVIRONNEMENT
// ============================================

const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Variables d\'environnement Cloudinary manquantes:', missingEnvVars.join(', '));
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`Cloudinary configuration missing: ${missingEnvVars.join(', ')}`);
    }
}

// ============================================
// CONFIGURATION CLOUDINARY
// ============================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Utiliser HTTPS
    timeout: 60000 // Timeout de 60 secondes
});

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Vérifier si Cloudinary est correctement configuré
 * @returns {boolean} true si configuré
 */
export const isCloudinaryConfigured = () => {
    return !!(process.env.CLOUDINARY_CLOUD_NAME &&
              process.env.CLOUDINARY_API_KEY &&
              process.env.CLOUDINARY_API_SECRET);
};

/**
 * Upload d'un fichier vers Cloudinary
 * @param {string|Buffer} file - Fichier à uploader (base64, buffer ou URL)
 * @param {Object} options - Options d'upload
 * @returns {Promise<Object>} Résultat de l'upload
 */
export const uploadToCloudinary = async (file, options = {}) => {
    if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary non configuré');
    }

    const defaultOptions = {
        folder: 'gmao-sakete',
        resource_type: 'auto',
        quality: 'auto:good',
        secure: true
    };

    const uploadOptions = { ...defaultOptions, ...options };

    try {
        const result = await cloudinary.uploader.upload(file, uploadOptions);
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes,
            createdAt: result.created_at
        };
    } catch (error) {
        console.error('Erreur upload Cloudinary:', error);
        throw new Error(`Upload échoué: ${error.message}`);
    }
};

/**
 * Upload d'une image depuis une URL
 * @param {string} url - URL de l'image
 * @param {Object} options - Options d'upload
 * @returns {Promise<Object>} Résultat de l'upload
 */
export const uploadFromUrl = async (url, options = {}) => {
    return uploadToCloudinary(url, options);
};

/**
 * Upload d'un fichier base64
 * @param {string} base64String - Chaîne base64 du fichier
 * @param {Object} options - Options d'upload
 * @returns {Promise<Object>} Résultat de l'upload
 */
export const uploadFromBase64 = async (base64String, options = {}) => {
    return uploadToCloudinary(base64String, options);
};

/**
 * Supprimer un fichier de Cloudinary
 * @param {string} publicId - ID public du fichier
 * @returns {Promise<Object>} Résultat de la suppression
 */
export const deleteFromCloudinary = async (publicId) => {
    if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary non configuré');
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return {
            success: result.result === 'ok',
            result: result.result
        };
    } catch (error) {
        console.error('Erreur suppression Cloudinary:', error);
        throw new Error(`Suppression échouée: ${error.message}`);
    }
};

/**
 * Obtenir une URL optimisée avec transformations
 * @param {string} publicId - ID public du fichier
 * @param {Object} transformations - Transformations à appliquer
 * @returns {string} URL transformée
 */
export const getOptimizedUrl = (publicId, transformations = {}) => {
    if (!publicId) return null;

    const defaultTransformations = {
        quality: 'auto',
        fetch_format: 'auto',
        crop: 'limit'
    };

    const finalTransforms = { ...defaultTransformations, ...transformations };

    return cloudinary.url(publicId, {
        secure: true,
        ...finalTransforms
    });
};

/**
 * Obtenir une URL pour un QR code
 * @param {string} data - Données du QR code
 * @returns {Promise<string>} URL du QR code généré
 */
export const generateQrCodeUrl = async (data) => {
    if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary non configuré');
    }

    try {
        const result = await cloudinary.uploader.upload(data, {
            folder: 'gmao-sakete/qrcodes',
            resource_type: 'auto',
            transformation: [
                { width: 300, height: 300, crop: 'limit' },
                { quality: 'auto' }
            ]
        });
        return result.secure_url;
    } catch (error) {
        console.error('Erreur génération QR code:', error);
        throw new Error(`Génération QR code échouée: ${error.message}`);
    }
};

/**
 * Upload d'un document (PDF, DOC, etc.)
 * @param {Buffer} fileBuffer - Buffer du fichier
 * @param {string} originalName - Nom original du fichier
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} Résultat de l'upload
 */
export const uploadDocument = async (fileBuffer, originalName, options = {}) => {
    const defaultOptions = {
        folder: 'gmao-sakete/documents',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: originalName
    };

    return uploadToCloudinary(fileBuffer, { ...defaultOptions, ...options });
};

/**
 * Upload d'une image d'équipement
 * @param {Buffer} fileBuffer - Buffer de l'image
 * @param {number} equipementId - ID de l'équipement
 * @returns {Promise<Object>} Résultat de l'upload
 */
export const uploadEquipmentImage = async (fileBuffer, equipementId) => {
    const options = {
        folder: `gmao-sakete/equipements/${equipementId}`,
        transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto:good' }
        ]
    };
    return uploadToCloudinary(fileBuffer, options);
};

/**
 * Upload d'une photo d'intervention
 * @param {Buffer} fileBuffer - Buffer de la photo
 * @param {number} interventionId - ID de l'intervention
 * @returns {Promise<Object>} Résultat de l'upload
 */
export const uploadInterventionPhoto = async (fileBuffer, interventionId) => {
    const options = {
        folder: `gmao-sakete/interventions/${interventionId}`,
        transformation: [
            { width: 1200, height: 900, crop: 'limit' },
            { quality: 'auto:good' }
        ]
    };
    return uploadToCloudinary(fileBuffer, options);
};

/**
 * Obtenir les statistiques Cloudinary
 * @returns {Promise<Object>} Statistiques
 */
export const getCloudinaryStats = async () => {
    if (!isCloudinaryConfigured()) {
        return { configured: false };
    }

    try {
        // Récupérer les statistiques d'utilisation
        const usage = await cloudinary.api.usage();
        return {
            configured: true,
            usage: {
                storage: usage.storage,
                bandwidth: usage.bandwidth,
                requests: usage.requests,
                resources: usage.resources
            }
        };
    } catch (error) {
        console.error('Erreur récupération stats Cloudinary:', error);
        return {
            configured: true,
            error: error.message
        };
    }
};

/**
 * Créer une URL de signature pour upload direct depuis le frontend
 * @param {Object} options - Options de signature
 * @returns {Object} Signature et timestamp
 */
export const generateUploadSignature = (options = {}) => {
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
        timestamp,
        folder: 'gmao-sakete',
        ...options
    };

    const signature = cloudinary.utils.api_sign_request(
        params,
        process.env.CLOUDINARY_API_SECRET
    );

    return {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
    };
};

// ============================================
// MIDDLEWARE POUR EXPRESS
// ============================================

/**
 * Middleware pour vérifier la configuration Cloudinary
 */
export const checkCloudinaryConfig = (req, res, next) => {
    if (!isCloudinaryConfigured()) {
        return res.status(503).json({
            success: false,
            error: 'Service de stockage temporairement indisponible'
        });
    }
    next();
};

// ============================================
// EXPORTATION PAR DÉFAUT
// ============================================

// Log de statut au démarrage (non bloquant)
if (isCloudinaryConfigured()) {
    console.log('✅ Cloudinary configuré avec succès');
    console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
} else {
    console.warn('⚠️ Cloudinary non configuré - les fonctionnalités de stockage seront limitées');
}

export default cloudinary;
