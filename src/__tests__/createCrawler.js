const createCrawler = require('../createCrawler');
const Crawler = require('@smileeio/simplecrawler');
const parse = require('url-parse');

describe('#createCrawler', () => {
  test('should export a function', () => {
    expect(createCrawler).toBeInstanceOf(Function);
  });

  test('should return crawler instance', () => {
    const crawler = createCrawler(parse('http://example.com'));
    expect(crawler).toBeInstanceOf(Crawler);
  });

  test('should apply options to crawler', () => {
    const options = {
      maxDepth: 2
    };
    const crawler = createCrawler(parse('http://example.com'), options);
    expect(crawler).toHaveProperty('maxDepth', 2);
  });
});
