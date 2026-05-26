import express from 'express';
import prisma from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';
import { rowsToXlsx, sendXlsx, sendPdf } from '../utils/export.js';

const router = express.Router();

router.get('/equipements.xlsx', verifyToken, isTechnicien, async (req, res) => {
  try {
    const equipements = await prisma.equipement.findMany({
      select: {
        codeInventaire: true, nom: true, marque: true, modele: true,
        service: true, statut: true, criticite: true, mtbf: true, mttr: true,
        nombrePannes: true, dateAcquisition: true
      }
    });
    const wb = await rowsToXlsx(equipements, {
      sheetName: 'Équipements',
      columns: [
        { header: 'Code', key: 'codeInventaire', width: 18 },
        { header: 'Nom', key: 'nom', width: 30 },
        { header: 'Marque', key: 'marque', width: 18 },
        { header: 'Modèle', key: 'modele', width: 18 },
        { header: 'Service', key: 'service', width: 18 },
        { header: 'Statut', key: 'statut', width: 14 },
        { header: 'Criticité', key: 'criticite', width: 12 },
        { header: 'MTBF (h)', key: 'mtbf', width: 12 },
        { header: 'MTTR (h)', key: 'mttr', width: 12 },
        { header: 'Pannes', key: 'nombrePannes', width: 10 },
        { header: 'Acquisition', key: 'dateAcquisition', width: 18 }
      ]
    });
    await sendXlsx(res, wb, `equipements-${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) {
    res.status(500).json({ message: 'Export équipements échoué', error: err.message });
  }
});

router.get('/stock.xlsx', verifyToken, isTechnicien, async (req, res) => {
  try {
    const pieces = await prisma.piece.findMany({
      select: {
        code: true, designation: true, categorie: true,
        quantiteStock: true, seuilAlerte: true, prixUnitaire: true, emplacement: true
      }
    });
    const wb = await rowsToXlsx(pieces, { sheetName: 'Stock' });
    await sendXlsx(res, wb, `stock-${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) {
    res.status(500).json({ message: 'Export stock échoué', error: err.message });
  }
});

router.get('/codir/:id.pdf', verifyToken, isTechnicien, async (req, res) => {
  try {
    const rapport = await prisma.rapportCoDIR.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { generePar: { select: { nom: true, prenom: true } } }
    });
    if (!rapport) return res.status(404).json({ message: 'Rapport introuvable' });

    sendPdf(res, `codir-${rapport.id}.pdf`, (doc) => {
      doc.fontSize(20).text('Rapport CoDIR — GMAO Sakété-Ifangni', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Période : ${new Date(rapport.mois).toLocaleDateString('fr-FR')}`);
      doc.text(`Généré le : ${new Date(rapport.dateGeneration).toLocaleString('fr-FR')}`);
      doc.text(`Par : ${rapport.generePar?.prenom || ''} ${rapport.generePar?.nom || ''}`);
      doc.text(`Statut : ${rapport.statut}`);
      doc.moveDown();
      doc.fontSize(14).text('Indicateurs', { underline: true });
      doc.fontSize(10).text(rapport.indicateurs || '(aucun)');
      doc.moveDown();
      if (rapport.resume) {
        doc.fontSize(14).text('Résumé', { underline: true });
        doc.fontSize(10).text(rapport.resume);
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Export CoDIR échoué', error: err.message });
  }
});

export default router;
