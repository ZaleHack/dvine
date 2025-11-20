import express from 'express';
import { authenticate } from '../middleware/auth.js';
import TransactionAnalysisService from '../services/TransactionAnalysisService.js';

const router = express.Router();
const transactionService = new TransactionAnalysisService();

router.get('/search', authenticate, async (req, res) => {
  try {
    const results = await transactionService.searchTransactions(req.query || {});
    res.json(results);
  } catch (error) {
    if (error?.message === 'MSISDN_REQUIS') {
      return res.status(400).json({ error: 'Numéro MSISDN requis pour la recherche' });
    }
    console.error('Erreur recherche transactions:', error);
    res.status(500).json({ error: "Impossible d'effectuer la recherche des transactions" });
  }
});

router.get('/stats', authenticate, async (_req, res) => {
  try {
    const stats = await transactionService.getGlobalStats();
    res.json(stats);
  } catch (error) {
    console.error('Erreur statistiques transactions:', error);
    res.status(500).json({ error: 'Impossible de récupérer les statistiques' });
  }
});

router.get('/export', authenticate, async (req, res) => {
  try {
    const { buffer, fileName } = await transactionService.generateReport(req.query || {});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    if (error?.message === 'MSISDN_REQUIS') {
      return res.status(400).json({ error: 'Numéro MSISDN requis pour exporter' });
    }
    console.error('Erreur export transactions:', error);
    res.status(500).json({ error: "Impossible de générer le rapport PDF des transactions" });
  }
});

export default router;
