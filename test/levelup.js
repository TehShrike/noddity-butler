var Butler = require('../')
var test = require('tape')
var createServer = require('./fakeo_remote_server/index.js')

var levelmem = require('level-mem')

test('get all posts', function(t) {
	var server = createServer(8989)
	var db = levelmem()

	var butlerOne = new Butler('http://127.0.0.1:8989', db)

	butlerOne.getPosts(function(err, posts) {
		t.notOk(err, "no errors")
		t.equal(posts.length, 6, "six posts returned")

		posts.forEach(function(post) {
			t.ok(post && post.metadata && typeof post.metadata.title === "string", "Post has a title, and it's a string")
		})
		butlerOne.stop()
		server.close()

		// Server be shut down at this point
		var butlerTwo = new Butler('http://127.0.0.1:8989', db)
		butlerTwo.getPosts(function(err, posts) {
			t.notOk(err, "no errors")
			butlerTwo.stop()
			t.equal(posts.length, 6, "six posts returned")

			posts.forEach(function(post) {
				t.ok(post && post.metadata && typeof post.metadata.title === "string", "Post has a title, and it's a string")
			})
			t.end()
		})
	})
})
