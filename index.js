var NoddityRetrieval = require('noddity-retrieval')
var StringMap = require('stringmap')

var MemDOWN = require('memdown')
var levelup = require('levelup')
var sublevel = require('level-sublevel')

function postComparator(a, b) {
	if (a.metadata.date == b.metadata.date) {
		return 0
	} else if (a.metadata.date < b.metadata.date) {
		return -1
	} else {
		return 1
	}
}

function PostManager(retrieval, levelUpDb) {
	function getRemotePost(filename, cb) {
		retrieval.getPost(filename, function(err, post) {
			if (!err) {
				levelUpDb.put(filename, JSON.stringify(post))
			}
			cb(err, post)
		})
	}

	function getLocalPost(filename, cb) {
		levelUpDb.get(filename, function(err, post) {
			cb(err, err || JSON.parse(post))
		})
	}

	function getPost(filename, cb) {
		getLocalPost(filename, function(err, post) {
			if (err && err.notFound) {
				getRemotePost(filename, cb)
			} else if (err) {
				cb(err)
			} else {
				cb(false, post)
			}
		})
	}

	return {
		getPost: getPost,
		getPosts: function getPosts(arrayOFileNames, cb) {
			var returned = 0
			var results = []
			var error = false
			arrayOFileNames.forEach(function(filename, index) {
				getPost(filename, function(err, post) {
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
			if(arrayOFileNames.length === 0) {
				cb(false, results)
			}
		},
		getLocalPosts: function getLocalPosts(arrayOFileNames, cb) {
			var foundPosts = []
			var checked = 0
			arrayOFileNames.forEach(function(filename) {
				getLocalPost(filename, function(err, post) {
					checked++
					if (!err) {
						foundPosts.push(post)
					}

					if (checked === arrayOFileNames.length) {
						cb(foundPosts)
					}
				})
			})
			if (arrayOFileNames.length === 0) {
				cb(foundPosts)
			}
		}
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
			indexRetrievalIsFinished()
		}
	})

	function sortPosts

	function allPostsAreLoaded() {
		return typeof postNames === 'array' && postNames && postNames.length === postManager.getPostsByDate().length
	}

	function getPosts(begin, end, cb) {
		if (typeof begin === 'function') {
			cb = begin
		}

		if (allPostsAreLoaded()) {
			// Return the appropriate posts, sorted by date
			cb(false, postManager.getPostsByDate(begin, end))
		} else {
			var relevantPostNames = postNames
			if (typeof begin === 'number') {
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
		} else if (postNames === null) {
			callbacksWhenPostNamesArrive.push(function() {
				fn.apply(this, args)
			})
		} else {
			fn.apply(this, args)
		}
	}

	function fetchAllPosts(cb) {
		postManager.getPosts(postNames, function(err, posts) {
			if (!err) {

			}
			cb(err, posts)
		})
	}

	return {
		getPosts: function getPosts(begin, end, cb) {
			runWhenIndexArrives(getPosts, begin, end, cb)
		},
		fetchAllPosts: function fetchAllPosts(cb) {
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
		getAllPosts: function getAllPosts(cb) {
			indexManager.fetchAllPosts(cb)
		},
		getRecentPosts: function getRecentPosts(count, cb) {
			indexManager.getPosts(-count, undefined, cb)
		},
		getOldestPosts: function getOldestPosts(count, cb) {
			indexManager.getPosts(0, count, cb)
		},
		allPostsAreLoaded: indexManager.allPostsAreLoaded
	}
}
