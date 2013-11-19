var NoddityRetrieval = require('noddity-retrieval')
var StringMap = require('stringmap')
var kind = require('kind')
var sorted = require('sorted')

var MemDOWN = require('memdown')
var levelup = require('levelup')
var sublevel = require('level-sublevel')

var postComparator = function(a, b) {
	if (a.metadata.date == b.metadata.date) {
		return 0
	} else if (a.metadata.date < b.metadata.date) {
		return -1
	} else {
		return 1
	}
}

var PostManager = function(retrieval, levelUpDb) {
	var postsByDate = sorted([], postComparator)

	// TODO: grab all posts in the levelUpDb on instantiation

	function getRemotePost(filename, cb) {
		retrieval.getPost(filename, function(err, post) {
			if (!err) {
				postsByDate.push(post)
				levelUpDb.put(filename, JSON.stringify(post))
			}
			cb(err, post)
		})
	}

	var getPost = function(filename, cb) {
		levelUpDb.get(filename, function(err, post) {
			if (err && err.notFound) {
				getRemotePost(filename, cb)
			} else if (err) {
				cb(err)
			} else {
				cb(false, JSON.parse(post))
			}
		})
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

var PostIndexManager = function(retrieval, postManager, levelUpDb) {
	var indexRetrievalError = false
	var postNames = null
	var callbacksWhenPostNamesArrive = []

	// TODO: grab the index from levelUpDb on instantiation

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
			if (kind(cb) === 'Function') {
				cb(err, ary)
			}
		})
	}

	levelUpDb.get('index', function(err, index) {
		if (err) {
			getRemoteIndex(indexRetrievalIsFinished)
		} else {
			postNames = JSON.parse(index)
			indexRetrievalIsFinished()
		}
	})

	var allPostsAreLoaded = function() {
		return kind(postNames) === 'Array' && postNames && postNames.length === postManager.getPostsByDate().length
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

module.exports = function NoddityButler(host, levelUpDb) {
	var retrieval = new NoddityRetrieval(host)

	levelUpDb = levelUpDb || levelup('/does/not/matter', { db: MemDOWN })
	var db = sublevel(levelUpDb)

	var postManager = new PostManager(retrieval, db.sublevel('posts'))
	var indexManager = new PostIndexManager(retrieval, postManager, db.sublevel('index'))

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
