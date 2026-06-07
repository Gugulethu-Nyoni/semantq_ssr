// @semantq/ssr/index.js
import { SSRMiddleware } from './lib/SSRMiddleware.js';
import { ResourceRenderer } from './lib/ResourceRenderer.js';
import { SlugIndex } from './lib/SlugIndex.js';
import { injectHydrationState } from './lib/Hydration.js';

// For auto-discovery by SemantqQL
export default {
  name: '@semantq/ssr',
  version: '1.0.0',
  
  // Called by SemantqQL when module is discovered
  async register(app, config) {
    console.log('[SSR] Registering with SemantqQL...');
    
    const ssrConfig = config.ssr || {};
    
    if (!ssrConfig.enabled) {
      console.log('[SSR] Disabled by configuration');
      return;
    }
    
    // Initialize slug index
    const slugIndex = new SlugIndex();
    await slugIndex.init();
    
    // Create renderer
    const renderer = new ResourceRenderer({
      templatesDir: ssrConfig.templatesDir || './views/ssr',
      cache: ssrConfig.cache !== false,
      hydrateStrategy: ssrConfig.hydrateStrategy || 'json-script'
    });
    
    // Create and mount middleware
    const middleware = new SSRMiddleware({ slugIndex, renderer, config: ssrConfig });
    app.use(middleware.handle.bind(middleware));
    
    console.log('[SSR] Middleware mounted successfully');
    
    return { slugIndex, renderer };
  }
};