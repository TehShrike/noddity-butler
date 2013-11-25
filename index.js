var NoddityRetrieval = require('noddity-retrieval')
var ASQ = require('asynquence')
var MemDOWN = require('memdown')
var levelup = require('levelup')
var sublevel = require('level-sublevel')

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
			var results = []
			var error = false

			var sequence = ASQ()

			var fns = arrayOFileNames.map(function(filename, index) {
				return function(done) {
					getPost(filename, function(err, post) {
						if (!error && err) {
							sequence.abort()
							error = err
						} else if (!error) {
							results[index] = post

							done()
						}
					})
				}
			})

			sequence.gate.apply(sequence, fns).then(function() {
				cb(error, results)
			})
		},
		getLocalPosts: function getLocalPosts(arrayOFileNames, cb) {
			var foundPosts = []
			var srsError = false

			var sequence = ASQ()

			var fns = arrayOFileNames.map(function(filename) {
				return function(done) {
					getLocalPost(filename, function(err, post) {
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
	}
}

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
			indexRetrievalIsFinished()
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

module.exports = function NoddityButler(host, levelUpDb) {
	var retrieval = new NoddityRetrieval(host)

	levelUpDb = levelUpDb || levelup('/does/not/matter', { db: MemDOWN })
	var db = sublevel(levelUpDb)

	var postManager = new PostManager(retrieval, db.sublevel('posts'))
	var indexManager = new PostIndexManager(retrieval, postManager, db.sublevel('index'))

	function getPosts(options, cb) {
		if (typeof options === 'function') {
			cb = options
		}
		if (typeof options !== 'object') {
			options = {}
		}
		var local = options.local || false
		var begin = typeof options.mostRecent === 'number' ? -options.mostRecent : undefined

		var postGetter = local ? indexManager.getLocalPosts : indexManager.getPosts

		postGetter(begin, undefined, cb)
	}

	return {
		getPost: postManager.getPost,
		getPosts: getPosts,
		allPostsAreLoaded: indexManager.allPostsAreLoaded
	}
}
