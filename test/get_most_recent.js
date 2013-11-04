var Butler = require('../')
var test = require('tap').test
var kind = require('kind')
var createServer = require('./fakeo_remote_server/index.js')


test('get most recent posts', function(t) {
	var server = createServer(8989, 500) // 500ms delay on server responses
	var butler = new Butler('http://127.0.0.1:8989')

	test('The initial responses should return the last three posts in array order, but those three posts should be ordered by date', function(t) {
		butler.getMostRecentPosts(3, function(err, posts) {
			t.equal(posts.length, 3)
			// "post2.md", "post4.md", "post3.md"
			t.equal(posts[0], 'This is the second post')
			t.equal(posts[1], 'This is the third post')
			t.equal(posts[2], 'This is the fourth post')
			t.end()
		})
	})

	test('After 500ms to load the index and ~500ms to load all the posts, they should all be returned ordered by date', function(t) {
		setTimeout(function() {
			butler.getMostRecentPosts(3, function(err, posts) {
				t.equal(posts.length, 3)
				t.equal(posts[0], 'This is the third post')
				t.equal(posts[1], 'This is the fifth post')
				t.equal(posts[2], 'This is the fourth post')
				t.end()
			})			
		}, 2000)
	})
})
