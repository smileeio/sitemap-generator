const SitemapGenerator = require('../')
const http = require('http')

describe('Integration: Queue Pruning with Real Crawler', () => {
  let server
  let port

  beforeAll(done => {
    // Create a simple HTTP server for testing
    server = http.createServer((req, res) => {
      const url = req.url
      res.writeHead(200, { 'Content-Type': 'text/html' })

      if (url === '/') {
        res.end(`
          <html>
            <body>
              <a href="/page1">Page 1</a>
              <a href="/page2">Page 2</a>
            </body>
          </html>
        `)
      } else if (url === '/page1') {
        res.end('<html><body><h1>Page 1</h1></body></html>')
      } else if (url === '/page2') {
        res.end('<html><body><h1>Page 2</h1></body></html>')
      } else {
        res.end('<html><body><h1>Not Found</h1></body></html>')
      }
    })

    server.listen(0, () => {
      port = server.address().port
      done()
    })
  })

  afterAll(done => {
    server.close(done)
  })

  test('pruning should reduce queue memory usage', done => {
    const generator = SitemapGenerator(`http://localhost:${port}`, {
      filepath: null,
      maxDepth: 1,
      pruneCompletedQueueItems: true
    })

    const crawler = generator.getCrawler()
    let completedCount = 0
    let maxQueueLength = 0

    crawler.on('fetchcomplete', () => {
      completedCount++

      // Check queue length after pruning
      crawler.queue.getLength((err, length) => {
        if (!err) {
          maxQueueLength = Math.max(maxQueueLength, length)
        }
      })
    })

    generator.on('done', () => {
      // With pruning enabled, queue length should stay small
      // even though we fetched multiple pages
      expect(completedCount).toBeGreaterThan(0)
      expect(maxQueueLength).toBeLessThanOrEqual(completedCount)

      // Verify that pruned items are indeed null
      let nullCount = 0
      for (let i = 0; i < crawler.queue.length; i++) {
        if (crawler.queue[i] === null) {
          nullCount++
        }
      }
      expect(nullCount).toBeGreaterThan(0)

      done()
    })

    generator.start()
  }, 10000)

  test('without pruning, all items should be retained', done => {
    const generator = SitemapGenerator(`http://localhost:${port}`, {
      filepath: null,
      maxDepth: 1,
      pruneCompletedQueueItems: false
    })

    const crawler = generator.getCrawler()
    let completedCount = 0

    crawler.on('fetchcomplete', () => {
      completedCount++
    })

    generator.on('done', () => {
      // Without pruning, queue length equals array length
      expect(completedCount).toBeGreaterThan(0)

      // Verify that no items are null
      let nullCount = 0
      for (let i = 0; i < crawler.queue.length; i++) {
        if (crawler.queue[i] === null) {
          nullCount++
        }
      }
      expect(nullCount).toBe(0)

      // All fetched items should still be accessible
      let fetchedCount = 0
      for (let i = 0; i < crawler.queue.length; i++) {
        if (crawler.queue[i] && crawler.queue[i].fetched) {
          fetchedCount++
        }
      }
      expect(fetchedCount).toBe(completedCount)

      done()
    })

    generator.start()
  }, 10000)

  test('deduplication should work with pruning enabled', done => {
    const generator = SitemapGenerator(`http://localhost:${port}`, {
      filepath: null,
      maxDepth: 1,
      pruneCompletedQueueItems: true
    })

    const crawler = generator.getCrawler()
    const addedUrls = new Set()

    generator.on('add', url => {
      // Track unique URLs added to sitemap
      expect(addedUrls.has(url)).toBe(false)
      addedUrls.add(url)
    })

    generator.on('done', () => {
      // All URLs should be unique even with pruning
      expect(addedUrls.size).toBeGreaterThan(0)
      done()
    })

    generator.start()
  }, 10000)
})
