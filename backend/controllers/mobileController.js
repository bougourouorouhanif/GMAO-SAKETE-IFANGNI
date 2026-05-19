import prisma from '../config/database.js';

// ============================================
// DASHBOARD MOBILE
// ============================================

// Dashboard principal pour mobile
export const getMobileDashboard = async (req, res) => {
  const technicienId = req.user.id;

  try {
    // Statistiques rapides
    const [totalEquipements, statsEquipements, urgencesCount, interventionsEnCours] = await Promise.all([
      prisma.equipement.count(),
      prisma.equipement.groupBy({
        by: ['statut'],
        _count: true
      }),
      prisma.intervention.count({
        where: {
          statut: 'EN_ATTENTE',
          type: { in: ['URGEANT', 'CORRECTIF'] }
        }
      }),
      prisma.intervention.count({
        where: {
          technicienId: technicienId,
          statut: 'EN_COURS'
        }
      })
    ]);

    const fonctionnel = statsEquipements.find(s => s.statut === 'FONCTIONNEL')?._count || 0;
    const disponibilite = totalEquipements > 0 ? ((fonctionnel / totalEquipements) * 100).toFixed(1) : 0;

    // Urgences (avec détails limités pour mobile)
    const urgences = await prisma.intervention.findMany({
      where: {
        statut: 'EN_ATTENTE',
        type: { in: ['URGEANT', 'CORRECTIF'] }
      },
      include: {
        equipement: {
          select: {
            id: true,
            nom: true,
            codeInventaire: true,
            service: true,
            batiment: true,
            salle: true
          }
        },
        signalement: {
          select: {
            id: true,
            priorite: true,
            description: true,
            dateSignalement: true,
            signalePar: {
              select: { nom: true, service: true }
            }
          }
        }
      },
      orderBy: [
        { signalement: { priorite: 'desc' } },
        { dateDebut: 'asc' }
      ],
      take: 10
    });

    // Interventions en cours du technicien
    const interventionsEnCoursList = await prisma.intervention.findMany({
      where: {
        technicienId: technicienId,
        statut: 'EN_COURS'
      },
      include: {
        equipement: {
          select: {
            id: true,
            nom: true,
            codeInventaire: true,
            service: true
          }
        }
      },
      orderBy: { dateDebut: 'desc' }
    });

    // Maintenances préventives du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const preventivesToday = await prisma.maintenancePreventive.findMany({
      where: {
        statut: 'PREVU',
        prochaineRealisation: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        equipement: {
          select: {
            id: true,
            nom: true,
            codeInventaire: true,
            service: true
          }
        }
      },
      take: 5
    });

    // Alertes non résolues (critiques uniquement pour mobile)
    const alertes = await prisma.alerte.findMany({
      where: {
        resolue: false,
        niveau: 'CRITIQUE'
      },
      include: {
        equipement: {
          select: {
            id: true,
            nom: true,
            service: true
          }
        }
      },
      orderBy: { dateCreation: 'desc' },
      take: 5
    });

    res.json({
      stats: {
        totalEquipements,
        disponibilite: disponibilite + '%',
        urgencesCount,
        interventionsEnCours: interventionsEnCours.length,
        preventivesToday: preventivesToday.length,
        alertesCount: alertes.length
      },
      urgences: urgences.map(u => ({
        id: u.id,
        equipement: u.equipement,
        priorite: u.signalement?.priorite || 'MOYENNE',
        description: u.signalement?.description?.substring(0, 100),
        dateSignalement: u.signalement?.dateSignalement || u.dateDebut,
        signalePar: u.signalement?.signalePar?.nom
      })),
      interventionsEnCours: interventionsEnCoursList,
      preventivesToday,
      alertes
    });
  } catch (error) {
    console.error('Erreur mobile dashboard:', error);
    res.status(500).json({ message: 'Erreur lors du chargement du dashboard' });
  }
};


// Rafraîchir le token (prolonger la session)
export const refreshToken = async (req, res) => {
  const user = req.user;
  
  // Générer un nouveau token avec durée prolongée
  const newToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: '30d' }  // 30 jours
  );
  
  res.json({ 
    token: newToken,
    expiresIn: 30 * 24 * 60 * 60 * 1000 // 30 jours en ms
  });
};

// ============================================
// INTERVENTIONS MOBILE
// ============================================

// Liste des interventions (avec filtres)
export const getMobileInterventions = async (req, res) => {
  const { statut, page = 1, limit = 20 } = req.query;
  const technicienId = req.user.id;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const filters = {};
    if (statut && statut !== '') filters.statut = statut;
    if (statut === 'MES_INTERVENTIONS') {
      filters.technicienId = technicienId;
    }

    const [interventions, total] = await Promise.all([
      prisma.intervention.findMany({
        where: filters,
        include: {
          equipement: {
            select: {
              id: true,
              nom: true,
              codeInventaire: true,
              service: true,
              batiment: true,
              salle: true
            }
          },
          signalement: {
            select: {
              priorite: true,
              description: true,
              dateSignalement: true,
              signalePar: { select: { nom: true, service: true } }
            }
          },
          technicien: { select: { nom: true, prenom: true } }
        },
        orderBy: { dateDebut: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.intervention.count({ where: filters })
    ]);

    res.json({
      interventions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur mobile interventions:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Détail d'une intervention (mobile)
export const getMobileInterventionDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const intervention = await prisma.intervention.findUnique({
      where: { id: parseInt(id) },
      include: {
        equipement: {
          include: {
            maintenances: {
              take: 3,
              orderBy: { dateDebut: 'desc' }
            }
          }
        },
        signalement: {
          include: {
            signalePar: { select: { nom: true, prenom: true, service: true, telephone: true } }
          }
        },
        technicien: { select: { nom: true, prenom: true, telephone: true } }
      }
    });

    if (!intervention) {
      return res.status(404).json({ message: 'Intervention non trouvée' });
    }

    res.json(intervention);
  } catch (error) {
    console.error('Erreur mobile intervention detail:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Mettre à jour une intervention (mobile)
export const updateMobileIntervention = async (req, res) => {
  const { id } = req.params;
  const { actionsRealisees, rapportFinal, dureeMinutes, piecesUtilisees, statut } = req.body;

  try {
    const intervention = await prisma.intervention.update({
      where: { id: parseInt(id) },
      data: {
        ...(actionsRealisees && { actionsRealisees }),
        ...(rapportFinal && { rapportFinal }),
        ...(dureeMinutes && { dureeMinutes: parseInt(dureeMinutes) }),
        ...(piecesUtilisees && { piecesUtilisees: JSON.stringify(piecesUtilisees) }),
        ...(statut === 'TERMINE' && { dateFin: new Date() }),
        ...(statut && { statut })
      },
      include: { equipement: true }
    });

    // Si l'intervention est terminée, mettre à jour le statut de l'équipement
    if (statut === 'TERMINE') {
      await prisma.equipement.update({
        where: { id: intervention.equipementId },
        data: { statut: 'FONCTIONNEL' }
      });

      // Résoudre les alertes liées
      await prisma.alerte.updateMany({
        where: { interventionId: intervention.id, resolue: false },
        data: {
          resolue: true,
          dateResolution: new Date(),
          resolueParId: req.user.id
        }
      });
    }

    res.json({ message: 'Intervention mise à jour', intervention });
  } catch (error) {
    console.error('Erreur update mobile intervention:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Prendre en charge une intervention (mobile)
export const prendreEnChargeMobile = async (req, res) => {
  const { id } = req.params;
  const technicienId = req.user.id;

  try {
    const intervention = await prisma.intervention.update({
      where: { id: parseInt(id) },
      data: {
        technicienId,
        statut: 'EN_COURS',
        dateDebut: new Date()
      },
      include: {
        equipement: true,
        signalement: true
      }
    });

    // Mettre à jour le statut de l'équipement
    await prisma.equipement.update({
      where: { id: intervention.equipementId },
      data: { statut: 'EN_MAINTENANCE' }
    });

    res.json({
      message: 'Intervention prise en charge',
      intervention
    });
  } catch (error) {
    console.error('Erreur prise en charge mobile:', error);
    res.status(500).json({ message: 'Erreur lors de la prise en charge' });
  }
};

// ============================================
// SCAN QR CODE (MOBILE)
// ============================================

export const scanQRCodeMobile = async (req, res) => {
  const { qrData } = req.body;

  try {
    let parsed;
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch {
      parsed = { code: qrData };
    }

    const equipement = await prisma.equipement.findFirst({
      where: {
        OR: [
          { id: parsed.id ? parseInt(parsed.id) : undefined },
          { codeInventaire: parsed.code },
          { codeInventaire: parsed.codeInventaire },
          { numeroSerie: parsed.code }
        ].filter(Boolean)
      },
      include: {
        maintenances: {
          where: { statut: { not: 'TERMINE' } },
          take: 1
        },
        maintenancesPreventives: {
          where: { statut: 'PREVU' },
          orderBy: { prochaineRealisation: 'asc' },
          take: 1
        }
      }
    });

    if (!equipement) {
      return res.status(404).json({ message: 'Équipement non trouvé' });
    }

    // Dernière intervention
    const derniereIntervention = await prisma.intervention.findFirst({
      where: { equipementId: equipement.id, statut: 'TERMINE' },
      orderBy: { dateFin: 'desc' }
    });

    // Intervention en cours
    const interventionEnCours = equipement.maintenances[0];

    res.json({
      id: equipement.id,
      codeInventaire: equipement.codeInventaire,
      nom: equipement.nom,
      marque: equipement.marque,
      modele: equipement.modele,
      service: equipement.service,
      batiment: equipement.batiment,
      salle: equipement.salle,
      statut: equipement.statut,
      criticite: equipement.criticite,
      dateMiseService: equipement.dateMiseService,
      garantieFin: equipement.garantieFin,
      derniereMaintenance: derniereIntervention?.dateFin,
      interventionEnCours: interventionEnCours ? {
        id: interventionEnCours.id,
        statut: interventionEnCours.statut,
        dateDebut: interventionEnCours.dateDebut
      } : null,
      prochainePreventive: equipement.maintenancesPreventives[0]?.prochaineRealisation
    });
  } catch (error) {
    console.error('Erreur scan QR mobile:', error);
    res.status(500).json({ message: 'Erreur lors du scan' });
  }
};

// ============================================
// ÉQUIPEMENTS MOBILE
// ============================================

// Liste des équipements (version mobile)
export const getMobileEquipements = async (req, res) => {
  const { search, service, statut, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const filters = {};
    if (search) {
      filters.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { codeInventaire: { contains: search, mode: 'insensitive' } },
        { marque: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (service && service !== '') filters.service = service;
    if (statut && statut !== '') filters.statut = statut;

    const [equipements, total] = await Promise.all([
      prisma.equipement.findMany({
        where: filters,
        select: {
          id: true,
          codeInventaire: true,
          nom: true,
          marque: true,
          modele: true,
          service: true,
          batiment: true,
          salle: true,
          statut: true,
          criticite: true,
          qrcodeUrl: true
        },
        orderBy: { nom: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.equipement.count({ where: filters })
    ]);

    res.json({
      equipements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur mobile equipements:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Détail d'un équipement (mobile)
export const getMobileEquipementDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const equipement = await prisma.equipement.findUnique({
      where: { id: parseInt(id) },
      include: {
        maintenances: {
          take: 10,
          orderBy: { dateDebut: 'desc' },
          include: {
            technicien: { select: { nom: true, prenom: true } },
            signalement: { select: { priorite: true, description: true } }
          }
        },
        maintenancesPreventives: {
          where: { statut: 'PREVU' },
          orderBy: { prochaineRealisation: 'asc' }
        },
        alertes: {
          where: { resolue: false },
          take: 5
        }
      }
    });

    if (!equipement) {
      return res.status(404).json({ message: 'Équipement non trouvé' });
    }

    res.json(equipement);
  } catch (error) {
    console.error('Erreur mobile equipement detail:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// ============================================
// ALERTES MOBILE
// ============================================

export const getMobileAlertes = async (req, res) => {
  const { niveau, limit = 20 } = req.query;

  try {
    const filters = { resolue: false };
    if (niveau && niveau !== '') filters.niveau = niveau;

    const alertes = await prisma.alerte.findMany({
      where: filters,
      include: {
        equipement: {
          select: {
            id: true,
            nom: true,
            codeInventaire: true,
            service: true,
            batiment: true
          }
        }
      },
      orderBy: [
        { niveau: 'desc' },
        { dateCreation: 'desc' }
      ],
      take: parseInt(limit)
    });

    res.json(alertes);
  } catch (error) {
    console.error('Erreur mobile alertes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// ============================================
// STATISTIQUES MOBILE (PostgreSQL compatible)
// ============================================

export const getMobileStats = async (req, res) => {
  const { periode = '30' } = req.query;
  const jours = parseInt(periode);
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - jours);

  try {
    // Interventions par jour (PostgreSQL)
    const interventionsParJour = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("dateDebut", 'YYYY-MM-DD') as date,
        COUNT(*)::int as total,
        SUM(CASE WHEN statut = 'TERMINE' THEN 1 ELSE 0 END)::int as terminees
      FROM "Intervention"
      WHERE "dateDebut" >= ${dateDebut}
      GROUP BY TO_CHAR("dateDebut", 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // Pannes par service
    const pannesParService = await prisma.$queryRaw`
      SELECT 
        e.service,
        COUNT(*)::int as total
      FROM "Intervention" i
      JOIN "Equipement" e ON i."equipementId" = e.id
      WHERE i.type = 'CORRECTIF'
        AND i."dateDebut" >= ${dateDebut}
      GROUP BY e.service
      ORDER BY total DESC
      LIMIT 5
    `;

    // Top équipements en panne
    const topEquipements = await prisma.$queryRaw`
      SELECT 
        e.nom,
        e."codeInventaire",
        COUNT(*)::int as "nombrePannes"
      FROM "Intervention" i
      JOIN "Equipement" e ON i."equipementId" = e.id
      WHERE i.type = 'CORRECTIF'
        AND i."dateDebut" >= ${dateDebut}
      GROUP BY e.id, e.nom, e."codeInventaire"
      ORDER BY "nombrePannes" DESC
      LIMIT 5
    `;

    // Temps moyen d'intervention
    const tempsMoyen = await prisma.$queryRaw`
      SELECT 
        AVG("dureeMinutes")::int as moyenne
      FROM "Intervention"
      WHERE statut = 'TERMINE'
        AND "dureeMinutes" IS NOT NULL
        AND "dateDebut" >= ${dateDebut}
    `;

    res.json({
      interventionsParJour,
      pannesParService,
      topEquipements,
      tempsMoyenIntervention: Math.round(tempsMoyen[0]?.moyenne || 0),
      periode: jours
    });
  } catch (error) {
    console.error('Erreur mobile stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des stats' });
  }
};

// ============================================
// PROFIL TECHNICIEN MOBILE
// ============================================

export const getMobileProfil = async (req, res) => {
  const technicienId = req.user.id;

  try {
    const technicien = await prisma.user.findUnique({
      where: { id: technicienId },
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        photo: true,
        role: true,
        createdAt: true,
        dernierConnexion: true
      }
    });

    // Statistiques personnelles
    const [totalInterventions, interventionsTerminees, satisfaction] = await Promise.all([
      prisma.intervention.count({ where: { technicienId } }),
      prisma.intervention.count({ where: { technicienId, statut: 'TERMINE' } }),
      prisma.intervention.aggregate({
        where: { technicienId, satisfaction: { not: null } },
        _avg: { satisfaction: true }
      })
    ]);

    // Dernières interventions
    const dernieresInterventions = await prisma.intervention.findMany({
      where: { technicienId, statut: 'TERMINE' },
      include: { equipement: { select: { nom: true, service: true } } },
      orderBy: { dateFin: 'desc' },
      take: 5
    });

    res.json({
      technicien,
      stats: {
        totalInterventions,
        interventionsTerminees,
        tauxSucces: totalInterventions > 0 ? ((interventionsTerminees / totalInterventions) * 100).toFixed(1) : 0,
        satisfactionMoyenne: satisfaction._avg.satisfaction?.toFixed(1) || 0
      },
      dernieresInterventions
    });
  } catch (error) {
    console.error('Erreur mobile profil:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
  }
};

// ============================================
// MISE À JOUR POSITION GPS
// ============================================

export const updateMobilePosition = async (req, res) => {
  const { latitude, longitude } = req.body;
  const technicienId = req.user.id;

  try {
    await prisma.user.update({
      where: { id: technicienId },
      data: {
        derniereLatitude: parseFloat(latitude),
        derniereLongitude: parseFloat(longitude),
        dernierePositionAt: new Date()
      }
    });

    res.json({ message: 'Position mise à jour' });
  } catch (error) {
    console.error('Erreur update position:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// ============================================
// NOTIFICATIONS PUSH TOKEN
// ============================================

export const registerPushToken = async (req, res) => {
  const { pushToken } = req.body;
  const technicienId = req.user.id;

  try {
    await prisma.user.update({
      where: { id: technicienId },
      data: { pushToken }
    });

    res.json({ message: 'Token push enregistré' });
  } catch (error) {
    console.error('Erreur register push token:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement' });
  }
};