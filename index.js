// packages/@semantq/ssr/index.js
import { SSRMiddleware } from './lib/SSRMiddleware.js';
import { ResourceRenderer } from './lib/ResourceRenderer.js';
import { SlugIndex } from './lib/SlugIndex.js';
import { injectHydrationState } from './lib/Hydration.js';

export default {
  name: '@semantq/ssr',
  version: '1.0.0',

  async register(app, config) {
    console.log('[SSR] Register function CALLED');
    console.log('[SSR] Config received:', JSON.stringify(config.ssr, null, 2));
    
    const ssrConfig = config.ssr || {};
    
    if (!ssrConfig.enabled) {
      console.log('[SSR] Disabled by configuration');
      return;
    }
    
    console.log('[SSR] SSR is ENABLED, initializing...');
    
    // Get event bus from app
    const eventBus = app.get('eventBus');
    const dbAdapter = app.get('dbAdapter');
    
    // Get Prisma client if available
    let prisma = null;
    try {
      const getPrisma = await import('../../../lib/prisma.js');
      prisma = await getPrisma.default();
    } catch (err) {
      console.log('[SSR] Prisma not available');
    }
    
    // Determine slug index mode
    const slugIndexMode = ssrConfig.slugIndexMode || (prisma ? 'prisma' : 'raw');
    
    // Initialize slug index
    const slugIndex = new SlugIndex();
    await slugIndex.init({
      mode: slugIndexMode,
      prisma: prisma,
      adapter: dbAdapter,
      staticRoutes: ssrConfig.staticRoutes || {}
    });
    
    // Create renderer
    const renderer = new ResourceRenderer({
      templatesDir: ssrConfig.templatesDir || './views/ssr',
      cache: ssrConfig.cache !== false,
      hydrateStrategy: ssrConfig.hydrateStrategy || 'json-script'
    });
    
    // Store on app for controllers
    app.set('ssrRenderer', renderer);
    app.set('ssrEnabled', true);
    app.set('slugIndex', slugIndex);
    
    // Create and mount middleware
    const middleware = new SSRMiddleware({ slugIndex, renderer, config: ssrConfig });
    app.use(middleware.handle.bind(middleware));
    
    console.log('[SSR] Module registered successfully');
    
    return { slugIndex, renderer };
  }
};
