const discoverResources = require('../discoverResources');

describe('#discoverResources', () => {
  test('should be a function', () => {
    expect(discoverResources).toBeInstanceOf(Function);
  });

  test('should discover sitemap urls from sitemap index xml', () => {
    const queueItem = {
      protocol: 'https',
      url: 'https://example.com/sitemap_index.xml'
    };

    const xml = Buffer.from(`
      <?xml version="1.0" encoding="UTF-8"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://example.com/sitemap-a.xml</loc></sitemap>
        <sitemap><loc>https://example.com/sitemap-b.xml#anchor</loc></sitemap>
      </sitemapindex>
    `);

    expect(discoverResources(xml, queueItem)).toEqual([
      'https://example.com/sitemap-a.xml',
      'https://example.com/sitemap-b.xml'
    ]);
  });

  test('should discover urls from urlset xml', () => {
    const queueItem = {
      protocol: 'https',
      url: 'https://example.com/sitemap.xml'
    };

    const xml = Buffer.from(`
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/page-1</loc></url>
        <url><loc>https://example.com/page-2</loc></url>
      </urlset>
    `);

    expect(discoverResources(xml, queueItem)).toEqual([
      'https://example.com/page-1',
      'https://example.com/page-2'
    ]);
  });
});
