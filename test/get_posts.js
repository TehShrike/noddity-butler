var Butler = require('../')
var test = require('tape')
var createServer = require('./fakeo_remote_server/index.js')
var ASQ = require('asynquence')
var levelmem = require('level-mem')

test('After all the posts are loaded, getMostRecent should return the most recent ordered by post date', function(t) {
	var server = createServer(8989, 100)
	var butler = new Butler('http://127.0.0.1:8989', levelmem())

	butler.allPostsAreLoaded(function(err, loaded) {
		t.notOk(err, "no error checking that all posts were loaded")
		t.notOk(loaded, "butler says all posts are not loaded")

		butler.getPosts(function(err, posts) {
			t.notOk(err, "no error")
			t.equal(posts.length, 6, "6 posts in total")

			butler.allPostsAreLoaded(function(err, loaded) {
				t.notOk(err, "no error checking that all posts were loaded")
				t.ok(loaded, "butler says all posts are loaded")

				butler.getPosts({ mostRecent: 3 }, function(err, posts) {
					t.notOk(err, "no error")
					t.equal(posts.length, 3, "3 recent posts found")
					// The last 3 posts by date
					t.equal(posts[0].metadata.title, 'This is the third post', "third most recent post matches")
					t.equal(posts[1].metadata.title, 'This is the fifth post', "second most recent post matches")
					t.equal(posts[2].metadata.title, 'This is the fourth post', "most recent post matches")
					butler.stop()
					server.close()
					t.end()
				})
			})
		})
	})
})

test('Getting local posts should return the available posts, ordered by date', function(t) {
	var server = createServer(8989, 100)
	var butler = new Butler('http://127.0.0.1:8989', levelmem())

	ASQ().gate(
		function(done) {
			butler.getPost('post2.md', done)
		},
		function(done) {
			butler.getPost('post3.md', done)
		},
		function(done) {
			butler.getPost('post4.md', done)
		},
		function(done) {
			butler.getPost('post1.md', done)
		}
	).then(function(done) {
		butler.getPosts({ local: true, mostRecent: 3 }, function(err, posts) {
			t.notOk(err, "no error")
			t.equal(posts.length, 3, "3 recent posts found")
			t.notOk(butler.allPostsAreLoaded(), "butler says all posts are not loaded")

			// If all posts were already loaded by the butler, these would not be the last three.
			// However, since we're only grabbing local posts, it will grab the 3 recent of what's available
			t.equal(posts[0].metadata.title, 'This is the second post', "third most recent post matches")
			t.equal(posts[1].metadata.title, 'This is the third post', "second most recent post matches")
			t.equal(posts[2].metadata.title, 'This is the fourth post', "most recent post matches")
			done()
		})
	}).then(function(done) {
		butler.stop()
		server.close()
		t.end()
		done()
	})
})


test('After grabbing all posts, we can ask for the 3 most recent and get the correct posts', function(t) {
	var server = createServer(8989, 100)
	var butler = new Butler('http://127.0.0.1:8989', levelmem())

	ASQ(function(done) {
		butler.getPosts(function(err, posts) {
			t.notOk(err, "no error")
			t.equal(posts.length, 6)
			done()
		})
	}).then(function(done) {
		butler.getPosts({ mostRecent: 3, local: true }, function(err, posts) {
			t.notOk(err, "no error")
			t.equal(posts.length, 3, "3 recent posts found")

			// The last 3 posts by date
			t.equal(posts[0].metadata.title, 'This is the third post', "third most recent post matches")
			t.equal(posts[1].metadata.title, 'This is the fifth post', "second most recent post matches")
			t.equal(posts[2].metadata.title, 'This is the fourth post', "most recent post matches")

			done()
		})
	}).then(function() {
		butler.stop()
		server.close()
		t.end()
	})
})
