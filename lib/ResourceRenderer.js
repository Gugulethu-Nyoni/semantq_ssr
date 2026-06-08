import { Eta } from 'eta';
import path from 'path';
import { fileURLToPath } from 'url';
import { injectHydrationState } from './Hydration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ResourceRenderer {
  constructor(config) {
    this.templatesDir = config.templatesDir || path.join(__dirname, '..', 'views');
    this.cache = config.cache !== false;
    this.hydrateStrategy = config.hydrateStrategy || 'json-script';
    this.templateCache = new Map();

    this.eta = new Eta({
      views: this.templatesDir,
      cache: this.cache,
      autoEscape: false  // Disable auto-escaping - we'll control it manually
    });
  }

  async render(resource, data, viewType = 'detail') {
    try {
      let templatePath = `${resource}/${viewType}`;
      
      // Ensure content is not double-escaped
      if (data.content) {
        // Content already contains HTML, don't escape it
        // No transformation needed
      }
      
      let html = await this.eta.renderAsync(templatePath, { data });

      if (this.hydrateStrategy !== 'none') {
        html = injectHydrationState(html, data, { resource, viewType });
      }

      return html;
    } catch (error) {
      console.warn(`[SSR] Template ${resource}/${viewType} not found, using default`);
      return this.eta.renderAsync(`default/${viewType}`, { data });
    }
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
