// @semantq/ssr/lib/SlugIndex.js
export class SlugIndex {
  constructor() {
    this.adapter = null;
    this.tableName = 'slug_index';
    this.cache = new Map();
  }
  
  async init() {
    // Get the active database adapter from SemantqQL core
    const { getActiveAdapter } = await import('semantqql/lib/db.js');
    this.adapter = getActiveAdapter();
    
    await this.ensureTable();
    console.log(`[SlugIndex] Initialized with ${this.adapter.type} adapter`);
  }
  
  async ensureTable() {
    const adapterType = this.adapter.type;
    
    const schemas = {
      mysql: `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          slug VARCHAR(255) PRIMARY KEY,
          resource_type VARCHAR(50) NOT NULL,
          resource_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_resource (resource_type, resource_id),
          INDEX idx_slug (slug)
        )
      `,
      postgresql: `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          slug VARCHAR(255) PRIMARY KEY,
          resource_type VARCHAR(50) NOT NULL,
          resource_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_resource (resource_type, resource_id)
        )
      `,
      sqlite: `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          slug TEXT PRIMARY KEY,
          resource_type TEXT NOT NULL,
          resource_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    };
    
    const sql = schemas[adapterType] || schemas.mysql;
    await this.adapter.query(sql);
    
    if (adapterType === 'sqlite') {
      await this.adapter.query(`CREATE INDEX IF NOT EXISTS idx_resource ON ${this.tableName}(resource_type, resource_id)`);
    }
  }
  
  async register(resourceType, resourceId, slug) {
    if (!slug) return;
    
    const sql = `
      INSERT INTO ${this.tableName} (slug, resource_type, resource_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        resource_type = VALUES(resource_type),
        resource_id = VALUES(resource_id),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.adapter.query(sql, [slug, resourceType, resourceId]);
    
    // Update cache
    this.cache.set(slug, { resource_type: resourceType, resource_id: resourceId });
    setTimeout(() => this.cache.delete(slug), 60000); // TTL 60 seconds
  }
  
  async resolve(slug) {
    // Check cache first
    if (this.cache.has(slug)) {
      return this.cache.get(slug);
    }
    
    const sql = `SELECT resource_type, resource_id FROM ${this.tableName} WHERE slug = ?`;
    const result = await this.adapter.query(sql, [slug]);
    
    if (result && result[0]) {
      this.cache.set(slug, result[0]);
      setTimeout(() => this.cache.delete(slug), 60000);
      return result[0];
    }
    
    return null;
  }
  
  async update(oldSlug, resourceType, resourceId, newSlug) {
    await this.delete(oldSlug);
    await this.register(resourceType, resourceId, newSlug);
  }
  
  async delete(slug) {
    const sql = `DELETE FROM ${this.tableName} WHERE slug = ?`;
    await this.adapter.query(sql, [slug]);
    this.cache.delete(slug);
  }
}