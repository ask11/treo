var expect = require('chai').expect
var Promise = require('es6-promise').Promise
var treo = require('../lib')
var schema = require('./support/schema')
var treo = require('../lib')
var websql = require('./support/treo-websql')

treo.Promise = Promise // set Promise library
websql(treo) // patch to support WebSQL env

describe('Transaction', function() {
  var db

  beforeEach(function() {
    db = treo('treo.database', schema)
  })

  afterEach(function() {
    return db.del()
  })

  it('has .mode property', function() {
    var tr1 = db.transaction(['books'], 'write')
    var tr2 = db.transaction(['storage', 'magazines'])
    expect(tr1.mode).equal('readwrite')
    expect(tr2.mode).equal('readonly')
  })

  it('validates scope', function() {
    var tr = db.transaction(['books'], 'read')
    expect(function() {
      tr.store('magazines')
    }).throws(/out of scope/)
  })

  it('is thenable', function() {
    var tr = db.transaction(['books'], 'write')
    expect(tr.then).a('function')
    expect(tr.catch).a('function')
    tr.store('books').put({ isbn: 'id1', title: 'Quarry Memories', author: 'Fred' })

    return tr.then(function() {
      return db.store('books').get('id1').then(function(book) {
        expect(book).eql({ isbn: 'id1', title: 'Quarry Memories', author: 'Fred' })
        expect(tr.status).equal('complete')
      })
    })
  })

  it.skip('#abort', function() {
    var tr = db.transaction(['books', 'magazines'], 'write')
    tr.store('books').put({ isbn: 'id1', title: 'Quarry Memories', author: 'Fred' })
    tr.store('books').put({ isbn: 'id2', title: 'Bedrocky Nights', publisher: 'Bob' })
    tr.store('magazines').put({ id: 'id1', title: 'Quarry Memories', publisher: 'Bob' })

    return tr.abort().then(function() {
      return Promise.all([
        db.store('books').count(),
        db.store('magazines').count(),
      ]).then(function(results) {
        expect(results[0]).equal(0)
        expect(results[1]).equal(0)
        expect(tr.status).equal('aborted')
      })
    })
  })

  it.skip('#on "abort"', function(done) {
    var tr = db.transaction(['magazines'], 'write')
    tr.store('magazines').put({ id: 'id1', title: 'Quarry Memories', publisher: 'Bob' })
    tr.abort()
    tr.on('abort', function() {
      expect(tr.status).equal('aborted')
      done()
    })
  })

  it('#on "complete"', function(done) {
    var tr = db.transaction(['books'], 'write')
    tr.store('books').put({ isbn: 'id1', title: 'Quarry Memories', author: 'Fred' })
    tr.on('complete', function() {
      expect(tr.status).equal('complete')
      done()
    })
  })

  it('#on "error"', function(done) {
    db.store('magazines').put({ publisher: 'Leanpub' }).then(function(key) {
      var tr = db.transaction(['magazines'], 'write')
      tr.store('magazines').add(key, { publisher: 'Leanpub' }).then(function() {
        done('should be an error')
      })
      tr.on('error', function() {
        expect(tr.status).equal('error')
        done()
      })
    })
  })
})
