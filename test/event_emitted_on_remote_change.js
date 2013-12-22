var test = require('tap').test
var PostManager = require('../lib/post_manager.js')
var TestRetrieval = require('./retrieval/stub.js')
var levelmem = require('level-mem')
var EventEmitter = require('events').EventEmitter
var isDate = require('util').isDate

test("PostManager emits when posts change", function(t) {
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	var retrieval = new TestRetrieval()

	var emitter = new EventEmitter()
	var postManager = new PostManager(retrieval, db, {
		refreshEvery: 50,
		checkToSeeIfItemsNeedToBeRefreshedEvery: 5,
		emitter: emitter
	})

	retrieval.addPost('post1.lol', 'post one', new Date(), 'whatever')
	var post = retrieval.getPostSync('post1.lol')

	var changes = 0

	emitter.on('post changed', function(key, post) {
		changes += 1
		t.equal(key, 'post1.lol', 'just the one post')
	})

	postManager.getPost('post1.lol', function(err) {
		t.notOk(err, "no error")

		emitter.once('post changed', function(key, post1) {
			t.equal(changes, 2, 'Second change')
			t.equal(key, 'post1.lol', 'was post1.lol')
			t.equal(post1.metadata.title, 'post one', 'Title was the same as before')
			t.equal(post1.content, 'updated', 'Content was updated')

			var newDate = new Date(post1.metadata.date.getTime() + 2000)

			emitter.once('post changed', function(key, post2) {
				t.equal(changes, 3, 'Third change')
				t.equal(key, 'post1.lol', 'was post1.lol')
				t.ok(isDate(post2.metadata.date), 'Retrieved post date is of type date')
				t.equal(post2.metadata.date.toString(), newDate.toString(), 'Post date matches the new one')
				postManager.stop()
				t.end()
			})

			setTimeout(function() {
				post.metadata.date = newDate
			}, 1000)
		})

		setTimeout(function() {
			post.content = 'updated'
		}, 300)
	})
})