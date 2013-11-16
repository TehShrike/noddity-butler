var Butler = require('../')
var test = require('tap').test
var kind = require('kind')
var createServer = require('./fakeo_remote_server/index.js')


test('After all the posts are loaded, getMostRecent should return the most recent ordered by post date', function(t) {
	var server = createServer(8989, 500) // 500ms delay on server responses
	var butler = new Butler('http://127.0.0.1:8989')

	t.notOk(butler.allPostsAreLoaded(), "butler says all posts are not loaded")

	butler.getAllPosts(function(err, posts) {
		t.notOk(err, "no error")
		t.equal(posts.length, 6, "6 posts in total")
		t.ok(butler.allPostsAreLoaded(), "butler says all posts are loaded")

		butler.getRecentPosts(3, function(err, posts) {
			t.notOk(err, "no error")
			t.equal(posts.length, 3, "3 recent posts found")
			// The last 3 posts by date
			t.equal(posts[0].metadata.title, 'This is the third post', "third most recent post matches")
			t.equal(posts[1].metadata.title, 'This is the fifth post', "second most recent post matches")
			t.equal(posts[2].metadata.title, 'This is the fourth post', "most recent post matches")
			server.close()
			t.end()
		})
	})
})

test('The initial responses should return the last three posts in array order, but those three posts should be ordered by date', function(t) {
	var server = createServer(8989, 500) // 500ms delay on server responses
	var butler = new Butler('http://127.0.0.1:8989')

	butler.getRecentPosts(3, function(err, posts) {
		t.notOk(err, "no error")
		t.equal(posts.length, 3, "3 recent posts found")
		t.notOk(butler.allPostsAreLoaded(), "butler says all posts are not loaded")
		// The last 3 posts by array position
		// "post2.md", "post4.md", "post3.md"
		t.equal(posts[0].metadata.title, 'This is the second post', "third most recent post matches")
		t.equal(posts[1].metadata.title, 'This is the third post', "second most recent post matches")
		t.equal(posts[2].metadata.title, 'This is the fourth post', "most recent post matches")

		server.close()
		t.end()
	})
})

test('After sufficient time to load all posts, getRecentPosts should return posts sorted from the whole set', function(t) {
	var server = createServer(8989, 500) // 500ms delay on server responses
	var butler = new Butler('http://127.0.0.1:8989')

	butler.getRecentPosts(3, function(err, posts) {
		t.notOk(err, "no error")
		t.equal(posts.length, 3, "3 recent posts found")
		// The last 3 posts by array position
		// "post2.md", "post4.md", "post3.md"
		t.equal(posts[0].metadata.title, 'This is the second post', "third most recent post matches")
		t.equal(posts[1].metadata.title, 'This is the third post', "second most recent post matches")
		t.equal(posts[2].metadata.title, 'This is the fourth post', "most recent post matches")

		butler.getAllPosts(function(err) {
			t.notOk(err, "no error")
			// Ignore the post inputs, we only want to know when all the posts are loaded so we can call getRecentPosts again

			butler.getRecentPosts(3, function(err, posts) {
				t.notOk(err, "no error")
				t.equal(posts.length, 3, "3 recent posts found")

				// The last 3 posts by date
				t.equal(posts[0].metadata.title, 'This is the third post', "third most recent post matches")
				t.equal(posts[1].metadata.title, 'This is the fifth post', "second most recent post matches")
				t.equal(posts[2].metadata.title, 'This is the fourth post', "most recent post matches")

				server.close()
				t.end()
			})
		})
	})
})

test("make sure getOldestPosts works too I guess", function(t) {
	var server = createServer(8989, 200)
	var butler = new Butler('http://127.0.0.1:8989')

	butler.getAllPosts(function(err, posts) {
		t.notOk(err, "no error")
		t.equal(posts.length, 6, "6 posts in total")

		t.ok(butler.allPostsAreLoaded(), "butler says all posts are loaded")

		butler.getOldestPosts(3, function(err, posts) {
			t.notOk(err, "no error")
			t.equal(posts.length, 3, "3 oldest posts found")
			// The first 3 posts by date
			t.equal(posts[0].metadata.title, 'This is ANOTHER post', "oldest post matches")
			t.equal(posts[1].metadata.title, 'This is the first post', "second oldest post matches")
			t.equal(posts[2].metadata.title, 'This is the second post', "third oldest post matches")
			server.close()
			t.end()
		})
	})
})
