var Butler = require('../')
var test = require('tap').test
var kind = require('kind')
var createServer = require('./fakeo_remote_server/index.js')

test("no server running", function(t) {
	var butler = new Butler('http://127.0.0.1:8989')

	butler.getAllPosts(function(err, posts) {
		t.ok(err, "error getting all posts")

		butler.getRecentPosts(3, function(err, posts) {
			t.ok(err, "error getting most recent posts")

			butler.getOldestPosts(3, function(err, posts) {
				t.ok(err, "error getting oldest posts")
				t.end()
			})
		})
	})
})

test("No file with that name", function(t) {
	var server = createServer(8989)
	var butler = new Butler('http://127.0.0.1:8989')

	butler.getPost('doesNotExist.lol', function(err, post) {
		t.ok(err, "error looking up doesNotExist.lol")
		server.close()
		t.end()
	})
})
