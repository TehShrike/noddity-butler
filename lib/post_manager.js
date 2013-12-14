var ASQ = require('asynquence')
var levelCache = require('levelup-cache')

function PostManager(retrieval, levelUpDb) {
	var tehOfficialCache = new levelCache(levelUpDb, retrieval.getPost)

	function getPosts(arrayOFileNames, cb) {
		var results = []
		var error = false

		var sequence = ASQ()

		var fns = arrayOFileNames.map(function(filename, index) {
			return function(done) {
				tehOfficialCache.get(filename, function(err, post) {
					if (!error && err) {
						error = err
					} else if (!error) {
						results[index] = post
					}
					done()
				})
			}
		})

		sequence.gate.apply(sequence, fns).then(function() {
			cb(error, results)
		})
	}

	function getLocalPosts(arrayOFileNames, cb) {
		var foundPosts = []
		var srsError = false

		var sequence = ASQ()

		var fns = arrayOFileNames.map(function(filename) {
			return function(done) {
				tehOfficialCache.getLocal(filename, function(err, post) {
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

	return {
		getPost: tehOfficialCache.get,
		getPosts: getPosts,
		getLocalPosts: getLocalPosts,
		stop: tehOfficialCache.stop
	}
}

module.exports = PostManager
