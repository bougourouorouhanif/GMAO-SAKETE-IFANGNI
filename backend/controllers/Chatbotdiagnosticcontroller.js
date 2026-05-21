import prisma from '../config/database.js';

// ============================================================
// BASE DE CONNAISSANCES TECHNIQUE — Arbre de décision
// Pour techniciens biomédicaux uniquement
// ============================================================

const arbeDiagnostic = {
  // ── ALIMENTATION ──────────────────────────────────────────
  'pas de mise sous tension': {
    causes: ['Fusible grillé', 'Câble d\'alimentation défectueux', 'Bloc d\'alimentation HS'],
    procedures: [
      '1. Vérifier le câble secteur et la prise murale',
      '2. Contrôler et remplacer le fusible',
      '3. Mesurer la tension en sortie du bloc d\'alimentation',
      '4. Remplacer le bloc d\'alimentation si tension absente'
    ],
    pieces: ['Fusible 5A', 'Câble secteur IEC', 'Bloc alimentation'],
    urgence: 'HAUTE'
  },
  'ne démarre pas': {
    causes: ['Batterie déchargée', 'Bloc d\'alimentation défaillant', 'Carte mère HS'],
    procedures: [
      '1. Connecter à l\'alimentation secteur et attendre 30 min',
      '2. Vérifier tension batterie (> 11V)',
      '3. Tester avec alimentation externe',
      '4. Diagnostic carte mère si alimentation OK'
    ],
    pieces: ['Batterie Li-ion', 'Chargeur externe'],
    urgence: 'HAUTE'
  },

  // ── AFFICHAGE ─────────────────────────────────────────────
  'écran noir': {
    causes: ['Rétroéclairage défaillant', 'Connecteur nappe desserré', 'Carte graphique HS'],
    procedures: [
      '1. Vérifier la luminosité (réglages)',
      '2. Contrôler le connecteur de la nappe écran',
      '3. Tester avec écran externe si possible',
      '4. Remplacer l\'écran LCD/TFT'
    ],
    pieces: ['Écran LCD', 'Nappe LCD', 'Câble vidéo'],
    urgence: 'MOYENNE'
  },
  'image floue': {
    causes: ['Sonde encrassée', 'Mise au point désréglée', 'Capteur dégradé'],
    procedures: [
      '1. Nettoyer la sonde avec solution appropriée',
      '2. Réinitialiser les paramètres d\'image',
      '3. Recalibrer la mise au point automatique',
      '4. Remplacer la sonde si persistant'
    ],
    pieces: ['Sonde échographique', 'Kit nettoyage sonde'],
    urgence: 'MOYENNE'
  },

  // ── ALARMES ───────────────────────────────────────────────
  'alarme pression': {
    causes: ['Circuit pneumatique obstrué', 'Capteur de pression défaillant', 'Fuite dans le circuit'],
    procedures: [
      '1. Vérifier l\'absence d\'obstruction sur les voies',
      '2. Contrôler les connexions des tubulures',
      '3. Tester le capteur de pression (valeurs de référence)',
      '4. Remplacer le capteur si hors tolérance (±2%)'
    ],
    pieces: ['Capteur pression', 'Tubulure patient', 'Joint silicone'],
    urgence: 'CRITIQUE'
  },
  'alarme': {
    causes: ['Paramètre hors limite', 'Capteur déconnecté', 'Défaut électronique'],
    procedures: [
      '1. Identifier le code d\'alarme affiché',
      '2. Consulter le manuel technique section alarmes',
      '3. Vérifier les connexions des capteurs',
      '4. Réinitialiser l\'appareil et observer'
    ],
    pieces: [],
    urgence: 'HAUTE'
  },

  // ── MESURES ───────────────────────────────────────────────
  'sato2 inexacte': {
    causes: ['Sonde SpO2 encrassée', 'Mouvement patient', 'Vasoconstriction', 'Capteur défaillant'],
    procedures: [
      '1. Nettoyer la sonde avec alcool isopropylique',
      '2. Repositionner sur un autre doigt',
      '3. Vérifier la perfusion périphérique du patient',
      '4. Calibrer avec oxymètre de référence',
      '5. Remplacer la sonde SpO2 si dérive > 3%'
    ],
    pieces: ['Sonde SpO2 adulte', 'Sonde SpO2 pédiatrique'],
    urgence: 'HAUTE'
  },
  'spo2': {
    causes: ['Sonde SpO2 encrassée', 'Mouvement patient', 'Capteur défaillant'],
    procedures: [
      '1. Nettoyer la sonde',
      '2. Repositionner sur un autre doigt',
      '3. Calibrer avec oxymètre de référence',
      '4. Remplacer si dérive persistante'
    ],
    pieces: ['Sonde SpO2'],
    urgence: 'HAUTE'
  },
  'mesure inexacte': {
    causes: ['Dérive du capteur', 'Calibration périmée', 'Interférence électromagnétique'],
    procedures: [
      '1. Vérifier la date de dernière calibration',
      '2. Effectuer une calibration avec étalon certifié',
      '3. Éloigner des sources d\'interférence (GSM, radio)',
      '4. Remplacer le capteur si dérive persistante'
    ],
    pieces: ['Kit calibration', 'Capteur de remplacement'],
    urgence: 'HAUTE'
  },

  // ── MÉCANIQUE ─────────────────────────────────────────────
  'bruit anormal': {
    causes: ['Roulement usé', 'Corps étranger', 'Fixation desserrée', 'Ventilateur défaillant'],
    procedures: [
      '1. Localiser la source du bruit (stéthoscope technique)',
      '2. Vérifier toutes les fixations et vis',
      '3. Inspecter les ventilateurs (poussière, usure)',
      '4. Lubrifier ou remplacer le roulement défaillant'
    ],
    pieces: ['Roulement', 'Ventilateur', 'Lubrifiant technique'],
    urgence: 'MOYENNE'
  },
  'fuite': {
    causes: ['Joint usé', 'Raccord desserré', 'Tubulure percée'],
    procedures: [
      '1. Identifier précisément la zone de fuite',
      '2. Serrer les raccords (couple de serrage fabricant)',
      '3. Remplacer le joint ou la tubulure concernée',
      '4. Test d\'étanchéité à 1.5x la pression nominale'
    ],
    pieces: ['Joint torique', 'Tubulure', 'Raccord'],
    urgence: 'CRITIQUE'
  },

  // ── COMMUNICATION / RÉSEAU ────────────────────────────────
  'pas de connexion': {
    causes: ['Câble réseau défectueux', 'Configuration IP incorrecte', 'Switch/Hub HS'],
    procedures: [
      '1. Vérifier le câble RJ45 et le voyant de connexion',
      '2. Contrôler l\'adresse IP et le masque réseau',
      '3. Tester avec un autre port du switch',
      '4. Redémarrer l\'interface réseau'
    ],
    pieces: ['Câble RJ45', 'Module réseau'],
    urgence: 'BASSE'
  },

  // ── GÉNÉRIQUE ─────────────────────────────────────────────
  'panne': {
    causes: ['Cause à déterminer après inspection'],
    procedures: [
      '1. Effectuer un diagnostic visuel complet',
      '2. Consulter l\'historique de maintenance',
      '3. Identifier les codes d\'erreur affichés',
      '4. Contacter le fabricant si nécessaire'
    ],
    pieces: [],
    urgence: 'MOYENNE'
  }
};

// ============================================================
// UTILITAIRES
// ============================================================

/** Recherche le diagnostic le plus pertinent */
function findDiagnostic(message) {
  const msg = message.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [symptome, data] of Object.entries(arbeDiagnostic)) {
    const mots = symptome.split(' ');
    const score = mots.filter(m => msg.includes(m)).length / mots.length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { symptome, ...data };
    }
  }

  return bestScore > 0.3 ? bestMatch : null;
}

/** Cherche un équipement dans la base */
async function findEquipement(message) {
  try {
    const equipements = await prisma.equipement.findMany({
      select: {
        id: true, nom: true, marque: true, modele: true,
        statut: true, codeInventaire: true, service: true,
        updatedAt: true, manuelTechnique: true
      }
    });

    const msg = message.toLowerCase();
    for (const eq of equipements) {
      const nomLower = eq.nom.toLowerCase();
      if (
        msg.includes(nomLower) ||
        (eq.codeInventaire && msg.includes(eq.codeInventaire.toLowerCase())) ||
        nomLower.split(' ').some(w => w.length > 3 && msg.includes(w))
      ) {
        return eq;
      }
    }
    return null;
  } catch { return null; }
}

/** Cherche une pièce disponible en stock */
async function findPieceEnStock(keywords) {
  if (!keywords || keywords.length === 0) return null;
  try {
    for (const kw of keywords) {
      const piece = await prisma.piece.findFirst({
        where: {
          OR: [
            { designation: { contains: kw, mode: 'insensitive' } },
            { code: { contains: kw, mode: 'insensitive' } }
          ],
          quantiteStock: { gt: 0 }
        },
        select: { id: true, code: true, designation: true, quantiteStock: true, emplacement: true }
      });
      if (piece) return piece;
    }
    return null;
  } catch { return null; }
}

/** Récupère ou crée une conversation */
async function getOrCreateConversation(conversationId, userId, equipementId = null) {
  if (conversationId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: parseInt(conversationId) }
    });
    if (existing) return existing;
  }
  return prisma.conversation.create({
    data: {
      utilisateurId: userId,
      type: 'DIAGNOSTIC',
      equipementId: equipementId || null,
      dateDebut: new Date()
    }
  });
}

// ============================================================
// CONTROLLER DIAGNOSTIC — Pour TECHNICIEN
// POST /api/chatbot/diagnostic
// ============================================================
export const chatbotDiagnostic = async (req, res) => {
  const { message, equipmentId, conversationId } = req.body;
  const userId = req.user?.id;

  if (!message?.trim()) {
    return res.status(400).json({ reply: '❌ Message vide.', action: 'error' });
  }

  try {
    // 1. Identifier l'équipement
    let equipement = null;
    if (equipmentId) {
      equipement = await prisma.equipement.findUnique({
        where: { id: parseInt(equipmentId) }
      });
    }
    if (!equipement) {
      equipement = await findEquipement(message);
    }

    // 2. Conversation
    const conversation = await getOrCreateConversation(
      conversationId, userId, equipement?.id
    );

    // 3. Sauvegarder message utilisateur
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'BOT_TECHNICIEN',
        contenu: message,
        dateEnvoi: new Date()
      }
    });

    // 4. Chercher diagnostic
    const diag = findDiagnostic(message);
    let reply = '';
    let action = 'info';
    let data = {};

    if (!equipement && !diag) {
      // Pas d'équipement ni de symptôme reconnu → aide
      reply = `👋 **Assistant Diagnostic Technique**\n\n` +
        `Je peux vous aider à diagnostiquer une panne.\n\n` +
        `🔍 Décrivez le problème ou scannez le QR code de l'équipement.\n\n` +
        `**Symptômes reconnus :**\n` +
        `• Pas de mise sous tension\n• Écran noir\n• Alarme pression\n` +
        `• SpO2 inexacte\n• Bruit anormal\n• Image floue\n• Fuite`;
      action = 'aide';

    } else if (equipement && !diag) {
      // Équipement trouvé mais pas de symptôme → demander symptôme
      reply = `🔧 **${equipement.nom}** (${equipement.marque} — ${equipement.service})\n\n` +
        `📊 Statut actuel : ${equipement.statut === 'FONCTIONNEL' ? '✅ FONCTIONNEL' : '❌ EN PANNE'}\n` +
        `📅 Dernière MAJ : ${new Date(equipement.updatedAt).toLocaleDateString('fr-FR')}\n\n` +
        `Quel symptôme observez-vous sur cet équipement ?`;
      action = 'ask_symptom';
      data = { equipmentId: equipement.id };

    } else if (diag) {
      // Diagnostic trouvé ✓
      const piece = await findPieceEnStock(diag.pieces);

      reply = `🔬 **Diagnostic : ${diag.symptome.toUpperCase()}**\n\n` +
        (equipement ? `📟 Équipement : **${equipement.nom}**\n\n` : '') +
        `**🔴 Causes probables :**\n${diag.causes.map(c => `• ${c}`).join('\n')}\n\n` +
        `**📋 Procédure d'intervention :**\n${diag.procedures.join('\n')}\n\n` +
        (piece
          ? `**✅ Pièce disponible en stock :**\n🔩 ${piece.designation} (${piece.quantiteStock} unités — ${piece.emplacement || 'Stock général'})`
          : diag.pieces.length > 0
            ? `**⚠️ Pièces possiblement nécessaires :**\n${diag.pieces.map(p => `• ${p}`).join('\n')}\n_(Vérifier le stock)_`
            : ''
        );

      action = 'show_diagnostic';
      data = {
        equipmentId: equipement?.id || null,
        urgence: diag.urgence,
        pieceSuggestion: piece?.code || diag.pieces[0] || null,
        pieceId: piece?.id || null
      };

      // Marquer l'équipement EN_PANNE si CRITIQUE ou HAUTE
      if (equipement && (diag.urgence === 'CRITIQUE' || diag.urgence === 'HAUTE')) {
        await prisma.equipement.update({
          where: { id: equipement.id },
          data: { statut: 'EN_PANNE', dateDernierePanne: new Date() }
        }).catch(() => {});
      }
    }

    // 5. Sauvegarder réponse bot
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        auteur: 'BOT',
        contenu: reply,
        typeMessage: action,
        donnees: Object.keys(data).length > 0 ? JSON.stringify(data) : null,
        dateEnvoi: new Date()
      }
    });

    return res.json({ reply, action, data, conversationId: conversation.id });

  } catch (error) {
    console.error('chatbotDiagnostic:', error);
    return res.status(500).json({
      reply: '❌ Erreur serveur. Réessayez ou contactez l\'administrateur.',
      action: 'error'
    });
  }
};

// ============================================================
// CONTROLLER CRÉER INTERVENTION depuis diagnostic
// POST /api/chatbot/creer-intervention
// ============================================================
export const chatbotCreerIntervention = async (req, res) => {
  const { equipmentId, diagnostic, pieceSuggestion, pieceId, conversationId } = req.body;
  const technicienId = req.user?.id;

  if (!equipmentId) {
    return res.status(400).json({ success: false, message: '❌ Équipement requis.' });
  }

  try {
    const equipId = parseInt(equipmentId);

    const equipement = await prisma.equipement.findUnique({ where: { id: equipId } });
    if (!equipement) {
      return res.status(404).json({ success: false, message: '❌ Équipement introuvable.' });
    }

    // Créer l'intervention
    const intervention = await prisma.intervention.create({
      data: {
        equipementId: equipId,
        technicienId,
        type: 'CORRECTIF',
        statut: 'EN_COURS',
        diagnostic: diagnostic || 'Diagnostic via chatbot',
        dateDebut: new Date()
      }
    });

    // Créer une alerte
    await prisma.alerte.create({
      data: {
        type: 'INTERVENTION_CREEE',
        niveau: 'INFO',
        message: `Intervention créée via chatbot diagnostic : ${equipement.nom}`,
        equipementId: equipId,
        interventionId: intervention.id
      }
    }).catch(() => {});

    // Mettre à jour la conversation
    if (conversationId) {
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { type: 'INTERVENTION', equipementId: equipId }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `✅ Intervention **#${intervention.id}** créée sur **${equipement.nom}**.`,
      interventionId: intervention.id
    });

  } catch (error) {
    console.error('chatbotCreerIntervention:', error);
    return res.status(500).json({
      success: false,
      message: '❌ Erreur lors de la création de l\'intervention.'
    });
  }
};
