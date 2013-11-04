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

var postManager = function(retrieval) {
	var postsByFileName = new StringMap()
	var postsByDate = sorted([], postComparator)

	return {
		getPost: function(filename, cb) {
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
		},
		getPostsByDate: function(begin, end) {
			return postsByDate.slice(begin, end)
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

	var getPost = postManager(retrieval)
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

	var getAllPosts = function(cb) {
		turnListOfPostNamesIntoListOfPosts(getPost, postNames, function(err, posts) {
			cb(err, posts)
		})
	}

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