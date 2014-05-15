var levelCache = require('levelup-cache')
var extend = require('extend')
var EventEmitter = require('events').EventEmitter
var reflect = require('./reflect.js')

function postSortingFunction(a, b) {
	var valid = a && b && a.metadata && b.metadata && a.metadata.date && b.metadata.date
	if (!valid || a.metadata.date == b.metadata.date) {
		return 0
	} else if (a.metadata.date < b.metadata.date) {
		return -1
	} else {
		return 1
	}
}

function compareIndexArrays(a, b) {
	return a.length === b.length && a.every(function(element, index) {
		return b[index] === element
	})
}

var KEY = 'index'

function PostIndexManager(retrieval, postManager, levelUpDb, options) {
	options = extend({
		refreshEvery: 10 * 60 * 1000,
		comparison: compareIndexArrays
	}, options)

	var emitter = Object.create(new EventEmitter())

	var cache = levelCache(levelUpDb, function(key, cb) {
		retrieval.getIndex(cb)
	}, options)

	cache.on('change', function(key, contents) {
		emitter.emit('change', contents)
	})

	var get = cache.get.bind(cache, KEY)
	get()

	function getPosts(postGetter, begin, end, cb) {
		if (typeof begin === 'function') {
			cb = begin
		}
		get(function(err, postNames) {
			if (err) {
				cb(err)
			} else {
				postGetter(postNames, function(err, posts) {
					if (!err) {
						posts = posts.sort(postSortingFunction)
						if (typeof begin === 'number') {
							posts = posts.slice(begin, end)
						}
					}
					cb(err, posts)
				})
			}
		})
	}

	var getLocalAndRemotePosts = getPosts.bind(null, postManager.getPosts)

	var getLocalPosts = getPosts.bind(null, postManager.getLocalPosts)

	emitter.getPosts = getLocalAndRemotePosts
	emitter.getLocalPosts = getLocalPosts
	emitter.allPostsAreLoaded = function(cb) {
		get(function(err, postNames) {
			if (err) {
				cb(false, false)
			} else {
				getLocalPosts(function(err, posts) {
					cb(err, err || (posts.length === postNames.length))
				})
			}
		})
	}
	emitter.stop = cache.stop

	return emitter
}

module.exports = PostIndexManager
