var levelCache = require('levelup-cache')
var extend = require('xtend')
var EventEmitter = require('events').EventEmitter

function postDate(post) {
	return (post && post.metadata && post.metadata.date) ? post.metadata.date : new Date(0)
}

function postSortingFunction(a, b) {
	if (postDate(a) < postDate(b)) {
		return -1
	} else if (postDate(a) > postDate(b)) {
		return 1
	} else {
		return 0
	}
}

function compareIndexArrays(a, b) {
	return a.length === b.length && a.every(function(element, index) {
		return b[index] === element
	})
}

var KEY = 'index'
var defaultOptions = {
	refreshEvery: 10 * 60 * 1000,
	comparison: compareIndexArrays
}

function PostIndexManager(retrieval, postManager, levelUpDb, options) {
	options = extend(defaultOptions, options)

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
		if (typeof cb !== 'function') {
			cb = function () {}
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
		if (typeof cb !== 'function') {
			cb = function () {}
		}
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
	emitter.refresh = cache.refresh.bind(cache, KEY)

	return emitter
}

module.exports = PostIndexManager
