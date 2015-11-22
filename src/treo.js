import Schema from 'idb-schema'
import Database from './idb-database'
import Store from './idb-store'
import Index from './idb-index'

/**
 * Expose API.
 */

exports = module.exports = (name, schema) => new Database(name, schema)
exports.schema = () => new Schema()

/**
 * Expose core classes.
 */

exports.Schema = Schema
exports.Database = Database
exports.Store = Store
exports.Index = Index