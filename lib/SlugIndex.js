// packages/@semantq/ssr/lib/SlugIndex.js

export class SlugIndex {
  constructor() {
    this.mode = null;
    this.prisma = null;
    this.adapter = null;
    this.staticRoutes = null;
  }

  async init({ mode, prisma, adapter, staticRoutes }) {
    this.mode = mode || 'prisma';
    
    if (this.mode === 'prisma') {
      this.prisma = prisma;
      console.log('[SSR] SlugIndex: Prisma mode');
    } 
    else if (this.mode === 'static') {
      this.staticRoutes = staticRoutes || {};
      console.log('[SSR] SlugIndex: Static mode (no DB)');
    }
    else if (this.mode === 'raw') {
      this.adapter = adapter;
      await this.ensureTable();
      console.log('[SSR] SlugIndex: Raw SQL mode');
    }
  }

  async ensureTable() {
    const adapterType = this.adapter.type;
    const tableName = 'slug_index';
    
    const schemas = {
      mysql: `CREATE TABLE IF NOT EXISTS ${tableName} (
        slug VARCHAR(255) PRIMARY KEY,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_resource (resource_type, resource_id)
      )`,
      postgresql: `CREATE TABLE IF NOT EXISTS ${tableName} (
        slug VARCHAR(255) PRIMARY KEY,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      sqlite: `CREATE TABLE IF NOT EXISTS ${tableName} (
        slug TEXT PRIMARY KEY,
        resource_type TEXT NOT NULL,
        resource_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    };
    
    const sql = schemas[adapterType] || schemas.mysql;
    await this.adapter.query(sql);
    console.log(`[SSR] SlugIndex: Table ensured for ${adapterType}`);
  }

  async resolve(slug) {
    if (this.mode === 'static') {
      return this.staticRoutes[slug] || null;
    }
    
    if (this.mode === 'prisma' && this.prisma) {
      return this.prisma.slugIndex.findUnique({ where: { slug } });
    }
    
    if (this.mode === 'raw' && this.adapter) {
      const sql = `SELECT resource_type, resource_id FROM slug_index WHERE slug = ?`;
      const result = await this.adapter.query(sql, [slug]);
      return result[0] || null;
    }
    
    return null;
  }

  async register(resourceType, resourceId, slug) {
    if (!slug) return;
    
    if (this.mode === 'prisma' && this.prisma) {
      await this.prisma.slugIndex.upsert({
        where: { slug },
        update: { resourceType, resourceId },
        create: { slug, resourceType, resourceId }
      });
    }
    
    if (this.mode === 'raw' && this.adapter) {
      const sql = `
        INSERT INTO slug_index (slug, resource_type, resource_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          resource_type = VALUES(resource_type),
          resource_id = VALUES(resource_id)
      `;
      await this.adapter.query(sql, [slug, resourceType, resourceId]);
    }
    
    // Static mode: no registration (read-only)
  }

  async delete(slug) {
    if (!slug) return;
    
    if (this.mode === 'prisma' && this.prisma) {
      await this.prisma.slugIndex.delete({ where: { slug } });
    }
    
    if (this.mode === 'raw' && this.adapter) {
      const sql = `DELETE FROM slug_index WHERE slug = ?`;
      await this.adapter.query(sql, [slug]);
    }
    
    // Static mode: no deletion (read-only)
  }
}