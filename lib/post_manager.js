var ASQ = require('asynquence')

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

module.exports = PostManager
