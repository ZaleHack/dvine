import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import UnifiedCdrService from '../services/UnifiedCdrService.js';

const router = express.Router();
const service = new UnifiedCdrService();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'cdr');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `unified-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.txt', '.xls', '.xlsx'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formats acceptés: csv, txt, xls, xlsx'));
    }
  }
});

router.post('/ingest', authenticate, requireAdmin, upload.single('cdrFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { operator = null, direction = null, type_flux = null } = req.body || {};

    const result = await service.ingestFile(req.file.path, {
      operator,
      direction,
      type_flux,
      source_file: req.file.originalname
    });

    fs.unlink(req.file.path, () => {});
    res.json({ message: 'Ingestion terminée', ...result });
  } catch (error) {
    console.error('Erreur ingestion CDR unifié:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'ingestion' });
  }
});

router.get('/timeline', authenticate, async (req, res) => {
  try {
    const msisdn = String(req.query.msisdn || '').trim();
    if (!msisdn) {
      return res.status(400).json({ error: 'Numéro requis' });
    }
    const { start_date = null, end_date = null, operator = null } = req.query;
    const data = await service.timeline(msisdn, { start_date, end_date, operator });
    res.json({ timeline: data });
  } catch (error) {
    console.error('Erreur timeline unifiée:', error);
    res.status(500).json({ error: 'Impossible de récupérer la timeline' });
  }
});

router.get('/search', authenticate, async (req, res) => {
  try {
    const filters = {
      number: req.query.number || req.query.calling_id || null,
      operator: req.query.operator || null,
      direction: req.query.direction || null,
      type_flux: req.query.type_flux || null,
      client: req.query.client || null,
      provider: req.query.provider || null,
      release_cause: req.query.release_cause || null,
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null,
      min_duration: req.query.min_duration || null,
      max_duration: req.query.max_duration || null
    };

    const limit = req.query.limit ? Number(req.query.limit) : 200;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const results = await service.search(filters, { limit, offset });
    res.json({ results, total: results.length });
  } catch (error) {
    console.error('Erreur recherche unifiée:', error);
    res.status(500).json({ error: 'Impossible de réaliser la recherche' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await service.stats();
    res.json(stats);
  } catch (error) {
    console.error('Erreur statistiques CDR unifiés:', error);
    res.status(500).json({ error: 'Impossible de calculer les statistiques' });
  }
});

export default router;
