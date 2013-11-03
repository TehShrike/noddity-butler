var NoddityRetrieval = require('noddity-retrieval')
var StringMap = require('stringmap')
var async = require('async')
var kind = require('kind')

var postManager = function(retrieval) {
	var posts = new StringMap()

	return function(filename, cb) {
		if (posts.has(filename)) {
			cb(false, posts.get(filename))
		} else {
			retrieval.getPost(filename, function(err, post) {
				if (!err) {
					posts.set(filename, post)
				}
				cb(err, post)
			})
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