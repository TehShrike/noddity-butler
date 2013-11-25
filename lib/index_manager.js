function postComparator(a, b) {
	if (a.metadata.date == b.metadata.date) {
		return 0
	} else if (a.metadata.date < b.metadata.date) {
		return -1
	} else {
		return 1
	}
}

function PostIndexManager(retrieval, postManager, levelUpDb) {
	var indexRetrievalError = false
	var postNames = null
	var callbacksWhenPostNamesArrive = []

	function indexRetrievalIsFinished(err, postNames) {
		callbacksWhenPostNamesArrive.forEach(function(cb) {
			cb(err, postNames)
		})
	}

	function getRemoteIndex(cb) {
		retrieval.getIndex(function(err, ary) {
			if (err) {
				indexRetrievalError = err
			} else {
				levelUpDb.put('index', JSON.stringify(ary))
				postNames = ary
			}
			if (typeof cb === 'function') {
				cb(err, ary)
			}
		})
	}

	levelUpDb.get('index', function(err, index) {
		if (err) {
			getRemoteIndex(indexRetrievalIsFinished)
		} else {
			postNames = JSON.parse(index)
			indexRetrievalIsFinished(false, postNames)
		}
	})

	function getPosts(begin, end, cb, postGetter) {
		if (typeof begin === 'function') {
			cb = begin
		}

		postGetter(postNames, function(err, posts) {
			if (err) {
				cb(err)
			} else {
				posts = posts.sort(postComparator)
				if (typeof begin === 'number') {
					posts = posts.slice(begin, end)
				}
				cb(false, posts)
			}
		})
	}

	function getAllPosts(begin, end, cb) {
		getPosts(begin, end, cb, postManager.getPosts)
	}

	function getLocalPosts(begin, end, cb) {
		getPosts(begin, end, cb, postManager.getLocalPosts)
	}

	function runWhenIndexArrives() {
		var args = Array.prototype.slice.call(arguments)
		var fn = args.shift()

		// Assume that the last argument is the final callback
		var cb = args.length > 0 ? args[args.length - 1] : fn

		if (indexRetrievalError) {
			cb.call(this, indexRetrievalError)
		} else if (postNames === null) {
			callbacksWhenPostNamesArrive.push(function(err, posts) {
				if (err) {
					cb(err)
				} else {
					fn.apply(this, args)
				}
			})
		} else {
			fn.apply(this, args)
		}
	}

	return {
		getPosts: function(begin, end, cb) {
			runWhenIndexArrives(getAllPosts, begin, end, cb)
		},
		getLocalPosts: function(begin, end, cb) {
			runWhenIndexArrives(getLocalPosts, begin, end, cb)
		},
		allPostsAreLoaded: function(cb) {
			runWhenIndexArrives(getLocalPosts, function(err, posts) {
				cb(err, err || (posts.length === postNames.length))
			})
		}
	}
}

module.exports = PostIndexManager
