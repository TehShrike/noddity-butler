var test = require('tape')
var Butler = require('../')
var createServer = require('./fakeo_remote_server/index.js')
var levelmem = require('level-mem')


test('Able to remove posts', function(t) {
	var server = createServer(8989, 100)
	var butler = new Butler('http://127.0.0.1:8989', levelmem())

	butler.getPosts(function(err, posts) { // get all posts
		var postFilenames = posts.map(function (post) { return post.filename }).join()

		t.notOk(err, "no error")
		t.equal(posts.length, 6)
		t.notEqual(postFilenames.indexOf('post5.md'), -1, "post that is about to be deleted exists now")

		butler.removePost('post5.md', function(err) { // remove a post
			t.notOk(err, "no error")

			butler.getPosts({ local: true }, function(err, posts) { // get local posts
				var postFilenames2 = posts.map(function (post) { return post.filename }).join()

				t.notOk(err, "no error")
				t.equal(posts.length, 5)
				t.equal(postFilenames2.indexOf('post5.md'), -1, "post was deleted successfully from the cache")

				butler.getPosts(function(err, posts) {
					var postFilenames3 = posts.map(function (post) { return post.filename }).join()

					t.notOk(err, "no error")
					t.equal(posts.length, 6)
					t.notEqual(postFilenames3.indexOf('post5.md'), -1, "the deleted post returns after getPosts is called")

					butler.stop()
					server.close()
					t.end()
				})
			})
		})
	})
})