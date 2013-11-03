var Butler = require('../')
var test = require('tap').test
var kind = require('kind')
var createServer = require('./fakeo_remote_server/index.js')

test('get all posts', function(t) {
	var server = createServer(8989)
	var butler = new Butler('http://127.0.0.1:8989')

	butler.getAllPosts(function(err, posts) {
		t.notOk(err, "no errors")
		if (err) {
			console.log(err.message)
		} else {
			t.equal(posts.length, 6, "six posts returned")

			posts.forEach(function(post) {
				t.equal(kind(post.metadata.title), "String", "Post has a title, and it's a string")
			})
		}
		server.close()
		t.end()
	})
})
