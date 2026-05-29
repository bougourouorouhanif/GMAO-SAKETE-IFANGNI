import prisma from '../config/database.js';

// Liste des pièces avec filtres
export const getAllPieces = async (req, res) => {
  const { categorie, search, stockFaible } = req.query;

  try {
    const filters = {};
    
    if (categorie && categorie !== '') filters.categorie = categorie;
    if (stockFaible === 'true') filters.quantiteStock = { lte: prisma.piece.fields.seuilAlerte };
    if (search) {
      filters.OR = [
        { designation: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const pieces = await prisma.piece.findMany({
      where: filters,
      orderBy: { designation: 'asc' }
    });

    res.json(pieces);
  } catch (error) {
    console.error('Erreur liste pièces:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};

// Ajouter une pièce
export const addPiece = async (req, res) => {
  const { code, designation, categorie, description, prixUnitaire, quantiteStock, seuilAlerte, emplacement, fournisseur } = req.body;

  try {
    const existing = await prisma.piece.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: 'Ce code pièce existe déjà' });
    }

    const piece = await prisma.piece.create({
      data: {
        code,
        designation,
        categorie,
        description: description || null,
        prixUnitaire: parseFloat(prixUnitaire) || 0,
        quantiteStock: parseInt(quantiteStock) || 0,
        seuilAlerte: parseInt(seuilAlerte) || 5,
        emplacement: emplacement || null,
        fournisseur: fournisseur || null,
      }
    });

    // Créer un mouvement d'entrée
    if (quantiteStock > 0) {
      await prisma.mouvementStock.create({
        data: {
          pieceId: piece.id,
          type: 'ENTRER',
          quantite: parseInt(quantiteStock),
          date: new Date(),
          motif: 'Ajout initial au stock',
          utilisateurId: req.user.id,
        }
      });
    }

    res.status(201).json({ message: 'Pièce ajoutée avec succès', piece });
  } catch (error) {
    console.error('Erreur ajout pièce:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout' });
  }
};

// Mettre à jour une pièce
export const updatePiece = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const piece = await prisma.piece.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({ message: 'Pièce mise à jour', piece });
  } catch (error) {
    console.error('Erreur mise à jour pièce:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer une pièce
export const deletePiece = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.piece.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Pièce supprimée' });
  } catch (error) {
    console.error('Erreur suppression pièce:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

// Mouvement de stock (entrée/sortie)
export const mouvementStock = async (req, res) => {
  const { pieceId, type, quantite, motif, prixUnitaire } = req.body;

  try {
    const piece = await prisma.piece.findUnique({
      where: { id: parseInt(pieceId) }
    });

    if (!piece) {
      return res.status(404).json({ message: 'Pièce non trouvée' });
    }

    // Mettre à jour le stock
    let nouvelleQuantite = piece.quantiteStock;
    if (type === 'ENTRER') {
      nouvelleQuantite += parseInt(quantite);
    } else if (type === 'SORTIR') {
      if (piece.quantiteStock < quantite) {
        return res.status(400).json({ message: 'Stock insuffisant' });
      }
      nouvelleQuantite -= parseInt(quantite);
    }

    const updatedPiece = await prisma.piece.update({
      where: { id: piece.id },
      data: {
        quantiteStock: nouvelleQuantite,
        derniereEntree: type === 'ENTRER' ? new Date() : undefined,
        derniereSortie: type === 'SORTIR' ? new Date() : undefined,
      }
    });

    // Créer le mouvement
    const mouvement = await prisma.mouvementStock.create({
      data: {
        pieceId: piece.id,
        type,
        quantite: parseInt(quantite),
        prixUnitaire: prixUnitaire ? parseFloat(prixUnitaire) : piece.prixUnitaire,
        date: new Date(),
        motif,
        utilisateurId: req.user.id,
      }
    });

    // Vérifier le seuil d'alerte → alerte DB + notifications
    if (nouvelleQuantite <= piece.seuilAlerte && type === 'SORTIR') {
      const niveau = nouvelleQuantite === 0 ? 'CRITIQUE' : 'ATTENTION';
      const alerte = await prisma.alerte.create({
        data: {
          type: 'STOCK_FAIBLE',
          niveau,
          message: `Stock faible pour ${piece.designation}: ${nouvelleQuantite} unité(s) restante(s)`,
          pieceId: piece.id,
        }
      });

      // Notification socket temps réel aux techniciens
      try {
        const { notifyLowStock, notifyNewAlert } = await import('../config/socket.js');
        notifyLowStock({ ...updatedPiece, alerteId: alerte.id });
        notifyNewAlert(alerte);
      } catch (e) {
        console.warn('Notif socket stock échouée:', e.message);
      }

      // Email + SMS techniciens (best-effort, async)
      try {
        const techniciens = await prisma.user.findMany({
          where: { role: { in: ['TECHNICIEN', 'ADMIN'] }, statut: 'ACTIF' },
          select: { id: true, email: true, telephone: true, prenom: true, nom: true }
        });
        const { sendEmail } = await import('../config/email.js');
        const { sendSMS } = await import('../config/sms.js');
        const subject = `⚠️ Stock faible — ${piece.designation}`;
        const html = `<p>La pièce <strong>${piece.designation}</strong> (code ${piece.code}) ne compte plus que <strong>${nouvelleQuantite}</strong> unité(s).</p>`;
        const smsBody = `GMAO: stock faible ${piece.designation} = ${nouvelleQuantite} restant`;
        for (const t of techniciens) {
          if (t.email) sendEmail(t.email, subject, html).catch(() => {});
          if (t.telephone && niveau === 'CRITIQUE') sendSMS(t.telephone, smsBody).catch(() => {});
        }
      } catch (e) {
        console.warn('Notif email/SMS stock échouée:', e.message);
      }
    }

    res.json({ message: 'Mouvement enregistré', piece: updatedPiece, mouvement });
  } catch (error) {
    console.error('Erreur mouvement stock:', error);
    res.status(500).json({ message: 'Erreur lors du mouvement' });
  }
};

// Vérifier le stock d'une pièce
export const checkStock = async (req, res) => {
  const { pieceCode } = req.params;

  try {
    const piece = await prisma.piece.findUnique({
      where: { code: pieceCode }
    });

    if (!piece) {
      return res.status(404).json({ message: 'Pièce non trouvée' });
    }

    res.json({
      code: piece.code,
      designation: piece.designation,
      quantite: piece.quantiteStock,
      seuilAlerte: piece.seuilAlerte,
      stockFaible: piece.quantiteStock <= piece.seuilAlerte,
      emplacement: piece.emplacement,
      prixUnitaire: piece.prixUnitaire
    });
  } catch (error) {
    console.error('Erreur vérification stock:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification' });
  }
};

// Statistiques stock
export const getStockStats = async (req, res) => {
  try {
    const [
      totalPieces,
      valeurStock,
      piecesFaibles,
      mouvementsRecents
    ] = await Promise.all([
      prisma.piece.count(),
      prisma.piece.aggregate({
        _sum: { quantiteStock: true, prixUnitaire: true }
      }),
      prisma.piece.count({
        where: {
          quantiteStock: { lte: prisma.piece.fields.seuilAlerte }
        }
      }),
      prisma.mouvementStock.findMany({
        take: 10,
        orderBy: { date: 'desc' },
        include: { piece: true }
      })
    ]);

    // Calculer la valeur totale du stock
    const pieces = await prisma.piece.findMany();
    const valeurTotale = pieces.reduce((total, p) => total + (p.quantiteStock * p.prixUnitaire), 0);

    // Périodes de consommation
    const consommationsParMois = await prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', date) as mois,
        SUM(quantite) as totalSorties
      FROM MouvementStock
      WHERE type = 'SORTIR'
      GROUP BY strftime('%Y-%m', date)
      ORDER BY mois DESC
      LIMIT 6
    `;

    res.json({
      totalPieces,
      valeurTotale: valeurTotale.toFixed(0),
      piecesFaibles,
      mouvementsRecents,
      consommationsParMois,
      alertes: pieces.filter(p => p.quantiteStock <= p.seuilAlerte).map(p => ({
        code: p.code,
        designation: p.designation,
        quantite: p.quantiteStock,
        seuil: p.seuilAlerte
      }))
    });
  } catch (error) {
    console.error('Erreur stats stock:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération' });
  }
};