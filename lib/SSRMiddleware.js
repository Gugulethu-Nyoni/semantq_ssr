// packages/@semantq/ssr/lib/SSRMiddleware.js
export class SSRMiddleware {
  constructor({ slugIndex, renderer, config }) {
    this.slugIndex = slugIndex;
    this.renderer = renderer;
    this.config = config;
    this.resources = config.resources || [];
  }
  
  async handle(req, res, next) {
    // Skip if not enabled
    if (!this.config.enabled) return next();
    
    // Skip if not HTML request
    const wantsHtml = req.headers.accept?.includes('text/html');
    if (!wantsHtml) return next();
    
    // Skip API routes
    if (req.path.startsWith('/api/')) return next();
    
    // Skip static files
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico)$/)) return next();
    
    try {
      // Parse path to extract resource and identifier
      const { resource, identifier } = this.parsePath(req.path);
      
      if (!resource || !identifier) return next();
      
      // Check if this resource supports SSR
      if (!this.resources.includes(resource)) return next();
      
      // Resolve slug to actual resource
      const resolved = await this.slugIndex.resolve(identifier);
      
      if (!resolved) {
        return this.renderer.renderError(res, null, 404);
      }
      
      // FIXED: Use resourceType (camelCase from Prisma) not resource_type
      const service = await this.getService(resolved.resourceType);
      const data = await service.getById(resolved.resourceId);
      
      if (!data) {
        return this.renderer.renderError(res, null, 404);
      }
      
      // FIXED: Use resourceType (camelCase)
      const html = await this.renderer.render(resolved.resourceType, data, 'detail');
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-SSR-Rendered', 'true');
      res.setHeader('X-Slug-Resolution', 'index-table');
      
      return res.send(html);
      
    } catch (error) {
      console.error('[SSR] Error:', error);
      
      if (this.config.fallbackToApi) {
        // Fallback: Let normal API route handle it
        return next();
      }
      
      this.renderer.renderError(res, error, 500);
    }
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
  
  async getService(resourceType) {
    const { default: service } = await import(
          `../../../../services/${resourceType}Service.js`

    );
    return service;
  }
}