const SitemapGenerator = require('../')
const Crawler = require('@smileeio/simplecrawler')

describe('Queue Pruning', () => {
  describe('FetchQueue pruning functionality', () => {
    let queue

    beforeEach(() => {
      const FetchQueue = require('@smileeio/simplecrawler/lib/queue.js')
      queue = new FetchQueue()
    })

    test('should initialize _itemCount to 0', () => {
      expect(queue._itemCount).toBe(0)
    })

    test('should increment _itemCount when adding items', done => {
      const queueItem = {
        url: 'http://example.com/page1',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page1',
        depth: 1
      }

      queue.add(queueItem, false, err => {
        expect(err).toBeNull()
        expect(queue._itemCount).toBe(1)
        expect(queue.length).toBe(1)
        done()
      })
    })

    test('should have pruneItem method', () => {
      expect(queue.pruneItem).toBeInstanceOf(Function)
    })

    test('pruneItem should set item to null and decrement _itemCount', done => {
      const queueItem = {
        url: 'http://example.com/page1',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page1',
        depth: 1
      }

      queue.add(queueItem, false, (err, item) => {
        expect(err).toBeNull()
        const itemId = item.id
        expect(queue[itemId]).toBeTruthy()
        expect(queue._itemCount).toBe(1)

        // Prune the item
        queue.pruneItem(itemId)

        expect(queue[itemId]).toBeNull()
        expect(queue._itemCount).toBe(0)
        expect(queue.length).toBe(1) // Array length doesn't change
        done()
      })
    })

    test('pruneItem should remove URL from _scanIndex', done => {
      const queueItem = {
        url: 'http://example.com/page1',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page1',
        depth: 1
      }

      queue.add(queueItem, false, (err, item) => {
        expect(err).toBeNull()
        expect(queue._scanIndex['http://example.com/page1']).toBe(true)

        queue.pruneItem(item.id)

        expect(queue._scanIndex['http://example.com/page1']).toBeUndefined()
        done()
      })
    })

    test('getLength should return _itemCount instead of array length when items are pruned', done => {
      const queueItem1 = {
        url: 'http://example.com/page1',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page1',
        depth: 1
      }
      const queueItem2 = {
        url: 'http://example.com/page2',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page2',
        depth: 1
      }

      queue.add(queueItem1, false, (err, item1) => {
        expect(err).toBeNull()
        queue.add(queueItem2, false, err => {
          expect(err).toBeNull()

          queue.getLength((err, length) => {
            expect(err).toBeNull()
            expect(length).toBe(2)

            // Prune first item
            queue.pruneItem(item1.id)

            queue.getLength((err, length) => {
              expect(err).toBeNull()
              expect(length).toBe(1) // Should return _itemCount
              expect(queue.length).toBe(2) // Array length unchanged
              done()
            })
          })
        })
      })
    })

    test('oldestUnfetchedItem should skip null slots', done => {
      const queueItem1 = {
        url: 'http://example.com/page1',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page1',
        depth: 1
      }
      const queueItem2 = {
        url: 'http://example.com/page2',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page2',
        depth: 1
      }

      queue.add(queueItem1, false, (err, item1) => {
        expect(err).toBeNull()
        queue.add(queueItem2, false, (err, item2) => {
          expect(err).toBeNull()

          // Prune first item
          queue.pruneItem(item1.id)

          // Should find second item
          queue.oldestUnfetchedItem((err, item) => {
            expect(err).toBeNull()
            expect(item).toBeTruthy()
            expect(item.id).toBe(item2.id)
            done()
          })
        })
      })
    })

    test('filterItems should skip null slots', done => {
      const queueItem1 = {
        url: 'http://example.com/page1',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page1',
        depth: 1,
        fetched: true
      }
      const queueItem2 = {
        url: 'http://example.com/page2',
        protocol: 'http',
        host: 'example.com',
        port: 80,
        path: '/page2',
        depth: 1,
        fetched: true
      }

      queue.add(queueItem1, false, (err, item1) => {
        expect(err).toBeNull()
        queue.add(queueItem2, false, (err, item2) => {
          expect(err).toBeNull()

          // Mark as fetched
          queue.update(item1.id, { fetched: true }, () => {
            queue.update(item2.id, { fetched: true }, () => {
              // Prune first item
              queue.pruneItem(item1.id)

              // Filter for fetched items
              queue.filterItems({ fetched: true }, (err, items) => {
                expect(err).toBeNull()
                expect(items.length).toBe(1)
                expect(items[0].id).toBe(item2.id)
                done()
              })
            })
          })
        })
      })
    })
  })

  describe('Crawler pruning option', () => {
    test('crawler should have pruneCompletedQueueItems property', () => {
      const crawler = new Crawler('http://example.com')
      expect(crawler).toHaveProperty('pruneCompletedQueueItems')
      expect(crawler.pruneCompletedQueueItems).toBe(false)
    })

    test('crawler should accept pruneCompletedQueueItems option', () => {
      const gen = SitemapGenerator('http://example.com', {
        pruneCompletedQueueItems: false
      })
      const crawler = gen.getCrawler()
      expect(crawler.pruneCompletedQueueItems).toBe(false)
    })

    test('pruneCompletedQueueItems should default to true in SitemapGenerator', () => {
      const gen = SitemapGenerator('http://example.com')
      const crawler = gen.getCrawler()
      expect(crawler.pruneCompletedQueueItems).toBe(true)
    })

    test('can explicitly enable pruning', () => {
      const gen = SitemapGenerator('http://example.com', {
        pruneCompletedQueueItems: true
      })
      const crawler = gen.getCrawler()
      expect(crawler.pruneCompletedQueueItems).toBe(true)
    })
  })
})
