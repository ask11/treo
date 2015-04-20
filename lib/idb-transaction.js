const Emitter = require('component-emitter')
const request = require('idb-request')

/**
 * Expose `Transaction`.
 */

module.exports = Transaction

/**
 * Initialize new `Transaction`.
 *
 * @param {Database} db
 * @param {Array} scope
 * @param {String} mode
 */

function Transaction(db, scope, mode) {
  this.db = db
  this.origin = null
  this.status = 'close'
  this.scope = scope
  this.mode = mode
  this.promise = new request.Promise((resolve, reject) => {
    this.on('complete', resolve)
    this.on('error', reject)
    this.on('abort', reject)
  })
}

/**
 * Inherit from `Emitter`.
 */

Emitter(Transaction.prototype)

/**
 * Create new `Store` in the scope of current transaction.
 *
 * @param {String} name
 * @return {Store}
 */

Transaction.prototype.store = function(name) {
  if (this.scope.indexOf(name) == -1) throw new TypeError('name out of scope')
  return this.db.store(name, this);
}

/**
 * Abort current transaction.
 *
 * @return {Promise}
 */

Transaction.prototype.abort = function() {
  return this.getInstance().then((tr) => {
    this.removeAllListeners()
    tr.abort()
  })
}

/**
 * Make transaction thenable.
 *
 * @param {Function} onResolve
 * @param {Function} onReject
 * @return {Promise}
 */

Transaction.prototype.then = function(onResolve, onReject) {
  return this.promise.then(onResolve, onReject)
}

/**
 * Catch transaction error.
 *
 * @param {Function} onReject
 * @return {Promise}
 */

Transaction.prototype.catch = function(onReject) {
  return this.promise.then(null, onReject)
}

/**
 * Get raw transaction instance.
 * Logic is identical to db.getInstance().
 *
 * @return {Promise}
 */

Transaction.prototype.getInstance = function() {
  if (this.status == 'ready') return request.Promise.resolve(this.origin)
  if (this.status == 'initializing') return this.dbPromise
  if (this.status == 'error') throw new Error('transaction error')

  this.status = 'initializing'
  this.dbPromise = new request.Promise((resolve, reject) => {
    this.db.getInstance().then((db) => {
      const tr = db.transaction(this.scope, this.mode)
      tr.onerror = (e) => this.emit('error', e)
      tr.onabort = () => this.emit('abort')
      tr.oncomplete = () => this.emit('complete')
      this.origin = tr
      this.status = 'ready'
      resolve(tr)
    }).catch((err) => {
      this.status = 'error'
      reject(err)
    })
  })

  return this.dbPromise
}