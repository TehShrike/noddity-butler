var levelCache = require('levelup-cache')

function postComparator(a, b) {
	valid = a && b && a.metadata && b.metadata && a.metadata.date && b.metadata.date
	if (!valid || a.metadata.date == b.metadata.date) {
		return 0
	} else if (a.metadata.date < b.metadata.date) {
		return -1
	} else {
		return 1
	}
}

var KEY = 'index'

function PostIndexManager(retrieval, postManager, levelUpDb) {
	var cache = levelCache(levelUpDb, function(key, cb) {
		retrieval.getIndex(cb)
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
						posts = posts.sort(postComparator)
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

	return {
		getPosts: getLocalAndRemotePosts,
		getLocalPosts: getLocalPosts,
		allPostsAreLoaded: function(cb) {
			get(function(err, postNames) {
				if (err) {
					cb(false, false)
				} else {
					getLocalPosts(function(err, posts) {
						cb(err, err || (posts.length === postNames.length))
					})
				}
			})
		},
		stop: cache.stop
	}
}

module.exports = PostIndexManager
