export const isTechnicien = (req, res, next) => {
  if (req.user.role !== 'TECHNICIEN') {
    return res.status(403).json({ 
      message: 'Accès refusé. Réservé aux techniciens biomédicaux.' 
    });
  }
  next();
};

export const isSoignant = (req, res, next) => {
  if (req.user.role !== 'SOIGNANT' && req.user.role !== 'TECHNICIEN') {
    return res.status(403).json({ 
      message: 'Accès refusé. Réservé au personnel soignant.' 
    });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'TECHNICIEN') {
    return res.status(403).json({
      message: 'Accès refusé. Droits administrateur requis.'
    });
  }
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé. Rôle insuffisant.' });
  }
  next();
};