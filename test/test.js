var Butler = require('../')
var test = require('tap').test
var createServer = require('./fakeo_remote_server/index.js')
var levelmem = require('level-mem')
var isDate = require('util').isDate

test('get all posts', function(t) {
	var server = createServer(8989)
	var butler = new Butler('http://127.0.0.1:8989', levelmem())

	butler.getPosts(function(err, posts) {
		t.notOk(err, "no errors")
		if (err) {
			console.log(err.message)
		} else {
			t.equal(posts.length, 6, "six posts returned")

			posts.forEach(function(post) {
				t.equal(typeof post.metadata.title, "string", "Post has a title, and it's a string")
				t.ok(isDate(post.metadata.date), "Post has a date property of type date")
			})
		}
		butler.stop()
		server.close()
		t.end()
	})
})
