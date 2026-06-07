// @semantq/ssr/routes/ssrRoutes.js
import express from 'express';

const router = express.Router();

// Optional: Manual SSR trigger endpoint
router.post('/ssr/cache/clear', async (req, res) => {
  // Clear template cache
  if (req.app.locals.ssrRenderer) {
    req.app.locals.ssrRenderer.templateCache?.clear();
    res.json({ success: true, message: 'SSR cache cleared' });
  } else {
    res.status(404).json({ error: 'SSR not enabled' });
  }
});

// Optional: Get slug index stats
router.get('/ssr/stats', async (req, res) => {
  if (req.app.locals.slugIndex) {
    res.json({
      enabled: true,
      table: 'slug_index',
      cacheSize: req.app.locals.slugIndex.cache?.size || 0
    });
  } else {
    res.json({ enabled: false });
  }
});

export default router;