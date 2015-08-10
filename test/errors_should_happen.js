var Butler = require('../')
var test = require('tape-catch')
var createServer = require('./fakeo_remote_server/index.js')
var levelmem = require('level-mem')

test('no server running', function(t) {
	var butler = new Butler('http://127.0.0.1:8989', levelmem())
	t.timeoutAfter(5000)
	t.plan(3)

	t.test('getting all posts with a server error', function(t) {
		butler.getPosts(function(err, posts) {
			t.ok(err, 'error getting all posts')
			t.end()
		})
	})

	t.test('getting most recent posts with a server error', function(t) {
		butler.getPosts({ mostRecent: 3 }, function(err, posts) {
			t.ok(err, 'error getting most recent posts')
			t.end()
		})
	})

	t.test('getting local posts with a server error', function(t) {
		butler.getPosts({ local: true }, function(err, posts) {
			t.ok(err, 'error getting local posts')
			t.end()
		})
	})

})

test('No file with that name', function(t) {
	var server = createServer(8989)
	var butler = new Butler('http://127.0.0.1:8989', levelmem())

	butler.getPost('doesNotExist.lol', function(err, post) {
		t.ok(err, 'error looking up doesNotExist.lol')
		server.close()
		butler.stop()
		t.end()
	})
})

test('Bad index', function(t) {
	var server = require('http').createServer(function(req, res) {
		res.end('[this is not valid json]')
	})

	server.listen(8989)

	var butler = new Butler('http://127.0.0.1:8989', levelmem())

	butler.getPosts(function(err, posts) {
		t.ok(err, 'error getting all posts')
		butler.stop()
		server.close()
		t.end()
	})
})
