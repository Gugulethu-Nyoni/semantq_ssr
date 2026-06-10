// adapters/html.js - Pure HTML adapter
// No templates, no Eta, just pure functions

const components = {
  // List component for blog listing
  list: (props) => {
    const items = props.items || [];
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        h1 { color: #333; }
        .post-list { list-style: none; padding: 0; }
        .post-item { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
        .post-title { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .post-title a { color: #333; text-decoration: none; }
        .post-title a:hover { text-decoration: underline; }
        .post-meta { color: #666; font-size: 0.875rem; margin-bottom: 0.5rem; }
        .post-excerpt { color: #555; }
    </style>
</head>
<body>
    <h1>Blog</h1>
    ${items.length > 0 ? `
        <ul class="post-list">
        ${items.map(item => `
            <li class="post-item">
                <h2 class="post-title"><a href="/@semantq/content/blog/${escapeHtml(item.slug)}">${escapeHtml(item.title)}</a></h2>
                <div class="post-meta">By ${escapeHtml(item.author?.name || 'Unknown')} | ${new Date(item.publishedAt).toLocaleDateString()}</div>
                <div class="post-excerpt">${escapeHtml(item.excerpt || item.title)}</div>
            </li>
        `).join('')}
        </ul>
    ` : '<p>No posts found.</p>'}
</body>
</html>`;
  },
  
  // Detail component for single post
  detail: (props) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(props.title)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        h1 { color: #333; }
        .content { margin: 2rem 0; }
        .content p { margin: 1rem 0; }
        .meta { color: #666; font-size: 0.875rem; border-top: 1px solid #eee; padding-top: 1rem; margin-top: 2rem; }
    </style>
</head>
<body>
    <h1>${escapeHtml(props.title)}</h1>
    <div class="content">${props.content || ''}</div>
    <div class="meta">
        Published: ${new Date(props.publishedAt).toLocaleDateString()}
        ${props.author ? `<br>By: ${escapeHtml(props.author.name)}` : ''}
    </div>
</body>
</html>`;
  },
  
  // Error component
  error: (props) => {
    return `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
    <h1>Error</h1>
    <p>${escapeHtml(props.message || 'An error occurred')}</p>
</body>
</html>`;
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default {
  name: 'html',
  
  render(manifest) {
    const component = components[manifest.component] || components.error;
    return component(manifest.props);
  },
  
  renderError(error) {
    return components.error({ message: error.message });
  }
};
