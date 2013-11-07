var NoddityRetrieval = require('noddity-retrieval')
var StringMap = require('stringmap')
var async = require('async')
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
			return postsByDate.slice(begin, end)
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

var PostIndexManager = function(postManager) {
	var postNames = null
	var callbacksWhenPostNamesArrive = []

	retrieval.getIndex(function(err, ary) {
		if (err) {
			console.log(err)
		} else {
			postNames = ary
		}
		callbacksWhenPostNamesArrive.forEach(function(cb) {
			cb(err, ary)
		})
	})

	var getPosts = function(begin, end, cb) {
		postManager.getPosts(postNames.slice(begin, end), function(err, posts) {
			if (err) {
				cb(err)
			} else {
				cb(false, posts.sort(postComparator))
			}
		})
	}

	return {
		getPosts: function(begin, end, cb) {
			if (kind(postNames) === 'Null') {
				callbacksWhenPostNamesArrive.push(function() {
					getPosts(begin, end, cb)
				})
			} else {
				getPosts(begin, end, cb)
			}
		}
	}
}

var turnListOfPostNamesIntoListOfPosts = function(postGetter, postNames, cb) {
	async.map(postNames, function(name, mapResultCallback) {
		postGetter(name, mapResultCallback)
	}, cb)
}

module.exports = function NoddityButler(host) {
	var retrieval = new NoddityRetrieval(host)

	var postManager = new PostManager(retrieval)
	var indexManager = new PostIndexManager(retrieval, postManager)

	var getAllPosts = function(cb) {
		turnListOfPostNamesIntoListOfPosts(getPost, postNames, function(err, posts) {
			cb(err, posts)
		})
	}

	// Need to write tests for:
	// 1. no index array yet
	// 2. index array with some posts
	var getMostRecentPosts = function(howMany, cb) {
		if (kind(allPosts) === 'Array') {
			cb(false, allPosts.slice(-howMany))
		} else if (kind(postNames) === 'Array') {
			turnListOfPostNamesIntoListOfPosts
		}
	}

	return {
		getAllPosts: function(cb) {
			if (kind(postNames) === 'Array') {
				getAllPosts(cb)
			} else {
				callbacksWhenPostNamesArrive.push(function(err, listOfPostNames) {
					if (err) {
						cb(err)
					} else {
						getAllPosts(cb)
					}
				})
			}
		}
	}
}