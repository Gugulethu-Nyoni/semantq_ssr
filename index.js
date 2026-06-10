import { CapabilityRegistry } from '../../../core/registry/CapabilityRegistry.js';
import { AdapterRegistry } from '../../../core/registry/AdapterRegistry.js';
import { SlugIndex } from './lib/SlugIndex.js';
import htmlAdapter from './adapters/html.js';

export default {
  name: '@semantq/ssr',
  version: '2.0.0',

  async register(app, config) {
    const ssrConfig = config.ssr || {};
    
    if (!ssrConfig.enabled) return;

    // Initialize slug index
    const slugIndex = new SlugIndex();
    await slugIndex.init({
      mode: ssrConfig.slugIndexMode || 'prisma',
      staticRoutes: ssrConfig.staticRoutes || {}
    });

    // Get or create capability registry
    let registry = app.get('capabilityRegistry');
    if (!registry) {
      registry = new CapabilityRegistry();
      app.set('capabilityRegistry', registry);
    }
    
    // Get or create adapter registry
    let adapterRegistry = app.get('adapterRegistry');
    if (!adapterRegistry) {
      adapterRegistry = new AdapterRegistry();
      app.set('adapterRegistry', adapterRegistry);
    }
    
    // Register HTML adapter
    adapterRegistry.register('html', htmlAdapter);
    
    app.set('ssrEnabled', true);
    app.set('slugIndex', slugIndex);

    // Register capabilities
    registry.register('slug.resolve', async (params, ctx, deps) => {
      const slug = ctx.params.slug || ctx.params.identifier;
      const resolved = await slugIndex.resolve(slug);
      return resolved;
    });

    registry.register('resource.resolve', async (params, ctx, deps) => {
      const { resource_type, resource_id } = deps[0];
      const service = await import(`../../../services/${resource_type}Service.js`);
      return service.default.getById(resource_id);
    });

    // Register render.manifest capability
    registry.register('render.manifest', async (params, ctx, deps) => {
      const data = deps[0];
      return {
        adapter: params.adapter || 'html',
        component: params.component || 'default',
        props: data,
        layout: params.layout || 'default',
        metadata: {
          timestamp: Date.now(),
          path: ctx.metadata?.path
        }
      };
    });

    console.log('[SSR] Registered as pure adapter (no templates)');
  }
};
