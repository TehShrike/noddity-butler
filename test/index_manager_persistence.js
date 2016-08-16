var test = require('tape')
var PostManager = require('../lib/post_manager.js')
var IndexManager = require('../lib/index_manager.js')
var TestRetrieval = require('./retrieval/stub.js')

var ASQ = require('asynquence')
var levelmem = require('level-mem')

test("Loading the index from levelUP instead of the retrieval object", function(t) {
	var indexDb = levelmem('no location', {valueEncoding: 'json'})


	ASQ(function(done) {
		var retrieval = new TestRetrieval()
		retrieval.addPost('post1.lol', 'post one', new Date(), 'whatever')

		var postManager = new PostManager(retrieval, levelmem('no location', {valueEncoding: 'json'}))
		var indexManager = new IndexManager(retrieval, postManager, indexDb)

		indexManager.getPosts(function(err, posts) {
			t.notOk(err, "no error")
			t.equal(posts.length, 1, "1 post found")
			t.equal(posts[0].metadata.title, "post one", "The post returned was the correct one")

			postManager.stop()
			indexManager.stop()

			done()
		})
	}).then(function(done) {
		var retrieval = new TestRetrieval()
		retrieval.addPost('post2.wat', 'a different post', new Date(), 'whatever')
		var postManager = new PostManager(retrieval, levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') }))

		var indexManager = new IndexManager({}, postManager, indexDb)

		indexManager.getPosts(function(err, posts) {
			t.ok(err, "Failed finding the post, because it was looking for post1.lol from the cached index but only post2 existed")

			retrieval.addPost('post1.lol', 'oh hey', new Date(), 'whatever')
			indexManager.getPosts(function(err, posts) {
				t.notOk(err, "no error")
				t.equal(posts.length, 1, "1 post found")
				t.equal(posts[0].metadata.title, "oh hey", "The post returned was the correct one")
				postManager.stop()
				indexManager.stop()
				done()
			})
		})

	}).then(function() {
		t.end()
	})
})

test("index_manager.refreshPost([cb]) works", function(t) {
	var retrieval = new TestRetrieval()

	var postManager = new PostManager(retrieval, levelmem('no location, seriously', { valueEncoding: 'json' }))
	var indexManager = new IndexManager(retrieval, postManager, levelmem('no location, seriously', { valueEncoding: 'json' }))

	retrieval.addPost('name', 'title', '2015-01-01', 'CONTENT lolz')

	indexManager.getPosts(function(err, posts) { // Get the posts initially
		t.ifError(err)
		t.equal(posts.length, 1)

		retrieval.addPost('name 2', 'title 2', '2015-01-02', 'CONTENT 2 lolz') // Add another post

		indexManager.getPosts(function(err, posts) { // Get the posts again, expect cached posts
			t.ifError(err)
			t.equal(posts.length, 1)

			indexManager.refresh(function (err, posts) { // Refresh the posts (testing this functionality)
				t.ifError(err)
				t.equal(posts.length, 2)

				indexManager.refresh(function (err, posts) { // Get the posts yet again, expect them to be refreshed
					t.ifError(err)
					t.equal(posts.length, 2)

					postManager.stop()
					indexManager.stop()
					t.end()
				})
			})
		})
	})
})
