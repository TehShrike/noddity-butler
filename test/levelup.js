var Butler = require('../')
var test = require('tap').test
var createServer = require('./fakeo_remote_server/index.js')

var ASQ = require('asynquence')
var levelup = require('levelup')
var MemDOWN = require('memdown')

test('get all posts', function(t) {
	var server = createServer(8989)
	var db = levelup('/does/not/matter', { db: MemDOWN })

	var butlerOne = new Butler('http://127.0.0.1:8989', db)

	butlerOne.getPosts(function(err, posts) {
		t.notOk(err, "no errors")
		if (err) {
			console.log(err.message)
		} else {
			t.equal(posts.length, 6, "six posts returned")

			posts.forEach(function(post) {
				t.equal(typeof post.metadata.title, "string", "Post has a title, and it's a string")
			})
		}
		server.close()

		// Server be shut down at this point
		var butlerTwo = new Butler('http://127.0.0.1:8989', db)
			butlerTwo.getPosts(function(err, posts) {
			t.notOk(err, "no errors")
			if (err) {
				console.log(err.message)
			} else {
				t.equal(posts.length, 6, "six posts returned")

				posts.forEach(function(post) {
					t.equal(typeof post.metadata.title, "string", "Post has a title, and it's a string")
				})
			}
			t.end()
		})
	})
})
