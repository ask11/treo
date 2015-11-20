import parseRange from 'idb-range'
import { request, requestCursor } from '../../idb-request/src'
import Index from './idb-index'

export default class Store {

  /**
   * Initialize new `Store`.
   *
   * @param {Database} db
   * @param {Object} opts { name, keyPath, autoIncrement, indexes }
   */

  constructor(db, opts) {
    this.db = db
    this.opts = opts.indexes
    this.name = opts.name
    this.key = opts.keyPath
    this.increment = opts.autoIncrement
    this.indexes = opts.indexes.map((index) => index.name)
  }

  /**
   * Get index by `name`.
   *
   * @param {String} name
   * @return {Index}
   */

  index(name) {
    const i = this.indexes.indexOf(name)
    if (i === -1) throw new TypeError('invalid index name')
    return new Index(this, this.opts[i])
  }

  /**
   * Put (create or replace) `val` to `key`.
   *
   * @param {Any} [key] is optional when store.key exists.
   * @param {Any} val
   * @return {Promise}
   */

  put(key, val) {
    if (this.key && typeof val !== 'undefined') {
      val[this.key] = key
    } else if (this.key) {
      val = key
    }
    return this.db.getInstance().then((db) => {
      const tr = db.transaction(this.name, 'readwrite')
      const store = tr.objectStore(this.name)
      return request(this.key ? store.put(val) : store.put(val, key), tr)
    })
  }

  /**
   * Add `val` to `key`.
   *
   * @param {Any} [key] is optional when store.key exists.
   * @param {Any} val
   * @return {Promise}
   */

  add(key, val) {
    if (this.key && typeof val !== 'undefined') {
      val[this.key] = key
    } else if (this.key) {
      val = key
    }
    return this.db.getInstance().then((db) => {
      const tr = db.transaction(this.name, 'readwrite')
      const store = tr.objectStore(this.name)
      return request(this.key ? store.add(val) : store.add(val, key), tr)
    })
  }

  /**
   * Get one value by `key`.
   *
   * @param {Any} key
   * @return {Promise}
   */

  get(key) {
    return this.db.getInstance().then((db) => {
      return request(db.transaction(this.name, 'readonly').objectStore(this.name).get(key))
    })
  }

  /**
   * Del value by `key`.
   *
   * @param {String} key
   * @return {Promise}
   */

  del(key) {
    return this.db.getInstance().then((db) => {
      const tr = db.transaction(this.name, 'readwrite')
      return request(tr.objectStore(this.name).delete(key), tr)
    })
  }

  /**
   * Count.
   *
   * Support range as an argument:
   * https://github.com/axemclion/IndexedDBShim/issues/202
   *
   * @param {Any} [range]
   * @return {Promise}
   */

  count(range) {
    return this.getAll(range).then((all) => all.length)
  }

  /**
   * Clear.
   *
   * @return {Promise}
   */

  clear() {
    return this.db.getInstance().then((db) => {
      const tr = db.transaction(this.name, 'readwrite')
      return request(tr.objectStore(this.name).clear(), tr)
    })
  }

  /**
   * Perform batch operation using `ops`.
   * It uses raw callback API to avoid issues with transaction reuse.
   *
   * {
   * 	 key1: 'val1', // put val1 to key1
   * 	 key2: 'val2', // put val2 to key2
   * 	 key3: null,   // delete key
   * }
   *
   * @param {Object} ops
   * @return {Promise}
   */

  batch(ops) {
    const keys = Object.keys(ops)

    return this.db.getInstance().then((db) => {
      return new Promise((resolve, reject) => {
        const tr = db.transaction(this.name, 'readwrite')
        const store = tr.objectStore(this.name)
        const that = this
        let current = 0

        tr.onerror = tr.onabort = reject
        tr.oncomplete = () => resolve()
        next()

        function next() {
          if (current >= keys.length) return
          const currentKey = keys[current]
          const currentVal = ops[currentKey]
          let req

          if (currentVal === null) {
            req = store.delete(currentKey)
          } else if (that.key) {
            if (!currentVal[that.key]) currentVal[that.key] = currentKey
            req = store.put(currentVal)
          } else {
            req = store.put(currentVal, currentKey)
          }

          req.onerror = reject
          req.onsuccess = next
          current += 1
        }
      })
    })
  }

  /**
   * Get all.
   *
   * @param {Any} [range]
   * @return {Promise}
   */

  getAll(range) {
    const result = []
    return this.cursor({ iterator, range }).then(() => result)

    function iterator(cursor) {
      result.push(cursor.value)
      cursor.continue()
    }
  }

  /**
   * Create read cursor for specific `range`,
   * and pass IDBCursor to `iterator` function.
   *
   * @param {Object} opts:
   *   {Any} [range] - passes to .openCursor()
   *   {String} [direction] - "prev", "prevunique", "next", "nextunique"
   *   {Function} iterator - function to call with IDBCursor
   * @return {Promise}
   */

  cursor({ iterator, range, direction }) {
    if (typeof iterator !== 'function') throw new TypeError('iterator is required')
    return this.db.getInstance().then((db) => {
      const store = db.transaction(this.name, 'readonly').objectStore(this.name)
      const req = store.openCursor(parseRange(range), direction || 'next')
      return requestCursor(req, iterator)
    })
  }
}
