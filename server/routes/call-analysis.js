import express from 'express';
import { authenticate } from '../middleware/auth.js';
import CallAnalysisService from '../services/CallAnalysisService.js';

const router = express.Router();
const callAnalysisService = new CallAnalysisService();

router.get('/search', authenticate, async (req, res) => {
  try {
    const results = await callAnalysisService.searchCalls(req.query || {});
    res.json(results);
  } catch (error) {
    if (error?.message === 'NUMERO_REQUIS') {
      return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }
    console.error('Erreur recherche analyse des appels:', error);
    res.status(500).json({ error: "Impossible d'effectuer la recherche" });
  }
});

router.get('/stats', authenticate, async (_req, res) => {
  try {
    const stats = await callAnalysisService.getGlobalStats();
    res.json(stats);
  } catch (error) {
    console.error('Erreur statistiques analyse des appels:', error);
    res.status(500).json({ error: 'Impossible de récupérer les statistiques' });
  }
});

router.get('/export', authenticate, async (req, res) => {
  try {
    const { buffer, fileName } = await callAnalysisService.generateReport(req.query || {});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    if (error?.message === 'NUMERO_REQUIS') {
      return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }
    console.error('Erreur export analyse des appels:', error);
    res.status(500).json({ error: "Impossible de générer le rapport PDF" });
  }
});

export default router;
