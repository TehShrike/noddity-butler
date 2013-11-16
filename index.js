var NoddityRetrieval = require('noddity-retrieval')
var StringMap = require('stringmap')
var kind = require('kind')
var sorted = require('sorted')

var postComparator = function(a, b) {
	if (a.metadata.date == b.metadata.date) {
		return 0
	} else if (a.metadata.date < b.metadata.date) {
		return -1
	} else {
		return 1
	}
}

var PostManager = function(retrieval) {
	var postsByFileName = new StringMap()
	var postsByDate = sorted([], postComparator)

	var getPost = function(filename, cb) {
		if (postsByFileName.has(filename)) {
			cb(false, postsByFileName.get(filename))
		} else {
			retrieval.getPost(filename, function(err, post) {
				if (!err) {
					postsByDate.push(post)
					postsByFileName.set(filename, post)
				}
				cb(err, post)
			})
		}
	}

	return {
		getPost: getPost,
		getPostsByDate: function(begin, end) {
			return (kind(begin) === 'Number' ? postsByDate.slice(begin, end) : postsByDate).toArray()
		},
		getPosts: function(arrayOFileNames, cb) {
			var returned = 0
			var results = []
			var error = false
			arrayOFileNames.forEach(function(fileName, index) {
				getPost(fileName, function(err, post) {
					if (!error && err) {
						error = true
						cb(err)
					} else if (!error) {
						results[index] = post

						returned++
						if (returned === arrayOFileNames.length) {
							cb(false, results)
						}
					}
				})
			})
		}
	}
}

var PostIndexManager = function(retrieval, postManager) {
	var indexRetrievalError = false
	var postNames = null
	var callbacksWhenPostNamesArrive = []

	retrieval.getIndex(function(err, ary) {
		if (err) {
			indexRetrievalError = err
		} else {
			postNames = ary
		}

		callbacksWhenPostNamesArrive.forEach(function(cb) {
			cb(err, ary)
		})
	})

	var allPostsAreLoaded = function() {
		return kind(postNames) === 'Array' && postNames.length === postManager.getPostsByDate().length
	}

	var getPosts = function(begin, end, cb) {
		if (kind(begin) === 'Function') {
			cb = begin
		}

		if (allPostsAreLoaded()) {
			// Return the appropriate posts, sorted by date
			cb(false, postManager.getPostsByDate(begin, end))
		} else {
			var relevantPostNames = postNames
			if (kind(begin) === 'Number') {
				relevantPostNames = postNames.slice(begin, end)
			}
			postManager.getPosts(relevantPostNames, function(err, posts) {
				if (err) {
					cb(err)
				} else {
					cb(false, posts.sort(postComparator))
				}
			})
		}
	}

	function runWhenIndexArrives() {
		var args = Array.prototype.slice.call(arguments)
		var fn = args.shift()
		if (indexRetrievalError) {
			// Assume that the last argument is the final callback, and just call it
			var cb = args.length > 0 ? args[args.length - 1] : fn
			cb.call(this, indexRetrievalError)
		} else if (kind(postNames) === 'Null') {
			callbacksWhenPostNamesArrive.push(function() {
				fn.apply(this, args)
			})
		} else {
			fn.apply(this, args)
		}
	}

	function fetchAllPosts(cb) {
		runWhenIndexArrives(function(err) {
			if (err) {
				cb(err)
			} else {
				postManager.getPosts(postNames, cb)
			}
		})
	}

	return {
		getPosts: function(begin, end, cb) {
			runWhenIndexArrives(getPosts, begin, end, cb)
		},
		fetchAllPosts: function(cb) {
			runWhenIndexArrives(fetchAllPosts, cb)
		},
		allPostsAreLoaded: allPostsAreLoaded
	}
}

module.exports = function NoddityButler(host) {
	var retrieval = new NoddityRetrieval(host)

	var postManager = new PostManager(retrieval)
	var indexManager = new PostIndexManager(retrieval, postManager)

	return {
		getPost: postManager.getPost,
		getAllPosts: function(cb) {
			indexManager.fetchAllPosts(cb)
		},
		getRecentPosts: function(count, cb) {
			indexManager.getPosts(-count, undefined, cb)
		},
		getOldestPosts: function(count, cb) {
			indexManager.getPosts(0, count, cb)
		},
		allPostsAreLoaded: indexManager.allPostsAreLoaded
	}
}
