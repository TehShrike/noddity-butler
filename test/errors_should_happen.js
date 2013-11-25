var Butler = require('../')
var test = require('tap').test
var createServer = require('./fakeo_remote_server/index.js')
var ASQ = require('asynquence')

test("no server running", function(t) {
	var butler = new Butler('http://127.0.0.1:8989')

	ASQ(function(done) {
		butler.getPosts(function(err, posts) {
			t.ok(err, "error getting all posts")
			done()
		})
	}).then(function(done) {
		butler.getPosts({ mostRecent: 3 }, function(err, posts) {
			t.ok(err, "error getting most recent posts")

			done()
		})
	}).then(function(done) {
		butler.getPosts({ local: true }, function(err, posts) {
			t.ok(err, "error getting local posts")
			done()
		})
	}).then(function() {
		t.end()
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
