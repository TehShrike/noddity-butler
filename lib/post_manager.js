var ASQ = require('asynquence')
var LevelCache = require('levelup-cache')
var EventEmitter = require('events').EventEmitter
var extend = require('extend')
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

	function getPosts(arrayOFileNames, cb) {
		var results = []
		var error = false

		var sequence = ASQ()

		var fns = arrayOFileNames.map(function(filename, index) {
			return function(done) {
				getFromCache(filename, function(err, post) {
					if (!error && err) {
						error = err
					} else if (!error) {
						results[index] = post
					}
					done()
				})
			}
		})

		sequence.gate.apply(sequence, fns).then(function() {
			cb(error, results)
		})
	}

	function getLocalPosts(arrayOFileNames, cb) {
		var foundPosts = []
		var srsError = false

		var sequence = ASQ()

		var fns = arrayOFileNames.map(function(filename) {
			return function(done) {
				tehOfficialCache.getLocal(filename, function(err, post) {
					if (!srsError) {
						if (!err) {
							foundPosts.push(post)
						} else if (!err.notFound) {
							srsError = err
							sequence.abort()
						}
					}
					done()
				})
			}
		})

		sequence.gate.apply(sequence, fns).then(function(done) {
			cb(srsError, foundPosts)
			done()
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
