// @semantq/ssr/lib/ResourceRenderer.js
import { Eta } from 'eta';
import path from 'path';
import fs from 'fs/promises';

export class ResourceRenderer {
  constructor(config) {
    this.templatesDir = path.resolve(config.templatesDir || './views/ssr');
    this.cache = config.cache !== false;
    this.hydrateStrategy = config.hydrateStrategy || 'json-script';
    this.templateCache = new Map();
    
    // Initialize Eta
    this.eta = new Eta({
      views: this.templatesDir,
      cache: this.cache,
      autoEscape: true,
      useWith: false
    });
  }
  
  async render(resource, data, viewType = 'detail') {
    try {
      // Try resource-specific template
      const templatePath = `${resource}/${viewType}`;
      let html = await this.eta.renderAsync(templatePath, { data });
      
      // Inject hydration state
      if (this.hydrateStrategy !== 'none') {
        html = this.injectHydrationState(html, data, { resource, viewType });
      }
      
      return html;
    } catch (error) {
      // Fallback to default template
      console.warn(`[SSR] Template not found: ${resource}/${viewType}, using default`);
      return this.eta.renderAsync(`default/${viewType}`, { data });
    }
  }
  
  injectHydrationState(html, data, meta) {
    if (this.hydrateStrategy === 'window') {
      // Legacy window global approach
      const script = `<script>window.__SSR_STATE__ = ${JSON.stringify({ data, meta })};</script>`;
      return html.replace('</body>', `${script}</body>`);
    }
    
    // Default: JSON script tag (no global pollution)
    const stateId = `semantqql-ssr-${Date.now()}`;
    const script = `
      <script type="application/json" id="${stateId}">
        ${JSON.stringify({ data, meta, timestamp: Date.now() })}
      </script>
      <script>
        (function() {
          const el = document.getElementById('${stateId}');
          if (el) {
            try {
              const state = JSON.parse(el.textContent);
              el.remove();
              window.dispatchEvent(new CustomEvent('semantqql:hydrate', { detail: state }));
            } catch(e) {}
          }
        })();
      </script>
    `;
    
    return html.replace('</body>', `${script}</body>`);
  }
  
  async renderError(res, error, statusCode = 500) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>${statusCode} Error</title></head>
      <body>
        <h1>${statusCode} - ${statusCode === 404 ? 'Not Found' : 'Server Error'}</h1>
        <p>${error?.message || 'An unexpected error occurred'}</p>
      </body>
      </html>
    `;
    
    res.status(statusCode).send(errorHtml);
  }
}