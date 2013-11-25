var test = require('tap').test
var PostManager = require('../lib/post_manager.js')
var IndexManager = require('../lib/index_manager.js')
var TestRetrieval = require('./retrieval/stub.js')

var ASQ = require('asynquence')
var levelup = require('levelup')
var MemDOWN = require('memdown')

test("Loading the index from levelUP instead of the retrieval object", function(t) {
	var indexDb = levelup('/does/not/matter', { db: MemDOWN })


	ASQ(function(done) {
		var retrieval = new TestRetrieval()
		retrieval.addPost('post1.lol', 'post one', new Date(), 'whatever')

		var postManager = new PostManager(retrieval, levelup('temporary', { db: MemDOWN }))
		var indexManager = new IndexManager(retrieval, postManager, indexDb)

		indexManager.getPosts(function(err, posts) {
			t.notOk(err, "no error")
			t.equal(posts.length, 1, "1 post found")
			t.equal(posts[0].metadata.title, "post one", "The post returned was the correct one")

			done()
		})
	}).then(function(done) {
		var retrieval = new TestRetrieval()
		retrieval.addPost('post2.wat', 'a different post', new Date(), 'whatever')
		var postManager = new PostManager(retrieval, levelup('temporary', { db: MemDOWN }))

		var indexManager = new IndexManager({}, postManager, indexDb)

		indexManager.getPosts(function(err, posts) {
			t.ok(err, "Failed finding the post, because it was looking for post1.lol from the cached index but only post2 existed")

			retrieval.addPost('post1.lol', 'oh hey', new Date(), 'whatever')
			indexManager.getPosts(function(err, posts) {
				t.notOk(err, "no error")
				t.equal(posts.length, 1, "1 post found")
				t.equal(posts[0].metadata.title, "oh hey", "The post returned was the correct one")
				done()
			})
		})

	}).then(function() {
		t.end()
	})
})
