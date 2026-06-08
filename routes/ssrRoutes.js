import express from 'express';

const router = express.Router();

// Get SSR status
router.get('/ssr/stats', async (req, res) => {
  // Check both app.get and app.locals
  const ssrEnabled = req.app.get('ssrEnabled') || false;
  const slugIndex = req.app.get('slugIndex');
  
  res.json({
    enabled: ssrEnabled,
    hasSlugIndex: !!slugIndex,
    cacheSize: slugIndex?.cache?.size || 0
  });
});

// Clear cache
router.post('/ssr/cache/clear', async (req, res) => {
  const renderer = req.app.get('ssrRenderer');
  if (renderer) {
    renderer.templateCache?.clear();
    res.json({ success: true, message: 'SSR cache cleared' });
  } else {
    res.status(404).json({ error: 'SSR not enabled' });
  }
});

export default router;
