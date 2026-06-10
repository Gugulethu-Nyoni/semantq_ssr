// packages/@semantq/ssr/lib/SSRMiddleware.js
import { Runtime, RuntimeContext, GraphLoader, GraphValidator } from '../../../core/index.js';

export class SSRMiddleware {
  constructor({ config }) {
    this.config = config;
    this.graphCache = new Map();
  }

  async handle(req, res, next) {
    if (!this.config.enabled) return next();

    const wantsHtml = req.headers.accept?.includes('text/html');
    if (!wantsHtml) return next();

    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico)$/)) return next();
    if (req.path.startsWith('/api/')) return next();

    try {
      const { resource, identifier } = this.parsePath(req.path);
      if (!resource || !identifier) return next();

      // Get or create graph for this resource
      let graph = this.graphCache.get(resource);
      if (!graph) {
        graph = this.buildGraph(resource);
        this.graphCache.set(resource, graph);
      }

      // Get registry from app
      const registry = req.app.get('capabilityRegistry');
      if (!registry) {
        return next();
      }

      // Create runtime and context
      const runtime = new Runtime(registry);
      const context = new RuntimeContext(
        { slug: identifier, resource, identifier },
        req.query,
        req.headers,
        req.user
      );

      // Execute graph
      const result = await runtime.evaluate(graph, `view_${resource}`, context);

      // Send response
      res.setHeader('Content-Type', 'text/html');
      res.send(result);

    } catch (error) {
      console.error('[SSR] Error:', error);
      next(error);
    }
  }

  buildGraph(resource) {
    return {
      id: `view_${resource}`,
      version: 1,
      checksum: 'auto-generated',
      intents: {
        [`view_${resource}`]: {
          id: `view_${resource}`,
          entry: 'render_html'
        }
      },
      nodes: {
        resolve_slug: {
          id: 'resolve_slug',
          capability: 'slug.resolve',
          deps: [],
          params: {}
        },
        fetch_resource: {
          id: 'fetch_resource',
          capability: 'resource.resolve',
          deps: ['resolve_slug'],
          params: {}
        },
        render_html: {
          id: 'render_html',
          capability: 'render.html',
          deps: ['fetch_resource'],
          params: { template: 'detail' }
        }
      }
    };
  }

  parsePath(path) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 2) {
      return { resource: parts[0].replace(/s$/, ''), identifier: parts[1] };
    }
    if (parts.length === 3 && parts[1] === 'posts') {
      return { resource: parts[0], identifier: parts[2] };
    }
    return { resource: null, identifier: null };
  }
}