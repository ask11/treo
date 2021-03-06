// ES6-generators is a powerful way to approach async workflow
// This example uses [co](https://github.com/visionmedia/co) and treo-promise
// to provide great readability.
// It's a near future, because Chrome enabled ES6-Generators by default and
// ES7 async/await proposal is basically the same approach.
// Right now, we can compile generators with https://github.com/facebook/regenerator
// and write nice code today.

var treo = require('treo');
var promise = require('treo/plugins/treo-promise');
var co = require('co');

// define schema

var schema = treo.schema()
  .version(1)
    .addStore('books')
    .addIndex('byTitle', 'title', { unique: true })
    .addIndex('byAuthor', 'author')
    .addStore('locals')
  .version(2)
    .getStore('books')
    .addIndex('byYear', 'year')
  .version(3)
    .addStore('magazines', { key: 'id' })
    .addIndex('byPublisher', 'publisher')
    .addIndex('byFrequency', 'frequency')
    .addIndex('byWords', 'words', { multi: true });

// create db with promises support

var db = treo('library', schema)
  .use(promise());

// wrap async operations with generator.

co(function*() {
  var books = db.store('books');
  var magazines = db.store('magazines');

  // load initial data

  yield books.batch({
    1: { title: 'Quarry Memories', author: 'Fred', isbn: 1, year: 2012 },
    2: { title: 'Water Buffaloes', author: 'Fred', isbn: 2, year: 2013 },
    3: { title: 'Bedrock Nights', author: 'Barney', isbn: 3, year: 2012 },
  });

  yield magazines.batch([
    { id: 'id1', title: 'Quarry Memories', publisher: 'Bob' },
    { id: 'id2', title: 'Water Buffaloes', publisher: 'Bob' },
    { id: 'id3', title: 'Bedrocky Nights', publisher: 'Tim' },
    { id: 'id4', title: 'Waving Wings', publisher: 'Ken' },
  ]);

  // run queries

  var book = yield books.index('byTitle').get('Bedrock Nights');
  console.log('Find book by unique index:', book);

  var byAuthor = yield books.index('byAuthor').get('Fred');
  console.log('Filter books:', byAuthor);

  var magazinesCount = yield magazines.count();
  console.log('Count magazines:', magazinesCount);
});
