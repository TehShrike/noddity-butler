var parallel = require('run-parallel')
var LevelCache = require('levelup-cache')
var EventEmitter = require('events').EventEmitter
var extend = require('xtend')
var isDate = require('util').isDate
var reflect = require('./reflect.js')

function compareMetadataProperties(a, b) {
	return typeof b !== 'undefined'
		&& isDate(a) ? a.toString() === b.toString() : a === b
}

function postsAreEqual(a, b) {
	return a.content === b.content
		&& a.metadata.length === b.metadata.length
		&& a.filename === b.filename
		&& Object.keys(a.metadata).every(function(key) {
			return compareMetadataProperties(a.metadata[key], b.metadata[key])
		})
}

function PostManager(retrieval, levelUpDb, options) {
	options = options || {}
	var emitter = Object.create(new EventEmitter())
	var cacheOptions = extend({
		refreshEvery: 12 * 60 * 60 * 1000
	}, options, {
		comparison: postsAreEqual
	})

	var tehOfficialCache = new LevelCache(levelUpDb, retrieval.getPost, cacheOptions)

	reflect('change', tehOfficialCache, emitter)

	function getFromCache(filename, cb) {
		tehOfficialCache.get(filename, cb)
	}

	function getPosts(arrayOfFileNames, cb) {
		var fns = arrayOfFileNames.map(function(filename) {
			return function(done) {
				getFromCache(filename, done)
			}
		})

		parallel(fns, cb)
	}

	function getLocalPosts(arrayOfFileNames, cb) {
		var fns = arrayOfFileNames.map(function(filename) {
			return function(done) {
				tehOfficialCache.getLocal(filename, function(err, post) {
					if (err && !err.notFound) {
						done(err)
					} else {
						done(null, post)
					}
				})
			}
		})

		parallel(fns, function (err, results) {
			var filtered = results.filter(Boolean)
			cb(err, filtered)
		})
	}

	emitter.getPost = getFromCache
	emitter.getPosts = getPosts
	emitter.getLocalPosts = getLocalPosts
	emitter.stop = tehOfficialCache.stop
	emitter.refresh = tehOfficialCache.refresh

	return emitter
}

module.exports = PostManager
