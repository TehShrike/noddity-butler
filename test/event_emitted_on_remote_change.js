var test = require('tap').test
var PostManager = require('../lib/post_manager.js')
var IndexManager = require('../lib/index_manager.js')
var TestRetrieval = require('./retrieval/stub.js')
var levelmem = require('level-mem')
var EventEmitter = require('events').EventEmitter
var isDate = require('util').isDate
//var Butler = require('../index.js')

function getPostManager(retrieval) {
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	return new PostManager(retrieval, db, {
		refreshEvery: 50,
		checkToSeeIfItemsNeedToBeRefreshedEvery: 5
	})
}

function getIndexManager(postManager, retrieval) {
	var db = levelmem('no location', { valueEncoding: 'json' })
	return new IndexManager(retrieval, postManager, db, {
		refreshEvery: 50,
		checkToSeeIfItemsNeedToBeRefreshedEvery: 5
	})
}

test("PostManager emits when posts change", function(t) {
	var retrieval = new TestRetrieval()
	var postManager = getPostManager(retrieval)

	retrieval.addPost('post1.lol', 'post one', new Date(), 'whatever')

	var post = retrieval.getPostSync('post1.lol')

	var changes = 0

	postManager.on('change', function(key, post) {
		changes += 1
		t.equal(key, 'post1.lol', 'just the one post')
	})

	postManager.getPost('post1.lol', function(err) {
		t.notOk(err, "no error")

		postManager.once('change', function(key, post1) {
			t.equal(changes, 2, 'Second change')
			t.equal(key, 'post1.lol', 'was post1.lol')
			t.equal(post1.metadata.title, 'post one', 'Title was the same as before')
			t.equal(post1.content, 'updated', 'Content was updated')

			var newDate = new Date(post1.metadata.date.getTime() + 2000)

			postManager.once('change', function(key, post2) {
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

test("IndexManager emits events when the index changes", function(t) {
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	var retrieval = new TestRetrieval()
	var postManager = getPostManager(retrieval)
	var indexManager = getIndexManager(postManager, retrieval)

	t.plan(4)

	indexManager.once('change', function(index) {
		t.equal(index.length, 1, 'One element in the index')
		t.equal(index[0], 'somepost.md', 'The first element is the correct string')

		indexManager.once('change', function(index) {
			t.equal(index.length, 2, 'Two elements in the index')
			t.equal(index[1], 'anotherpost.md', 'The second element is the correct string')
			postManager.stop()
			indexManager.stop()
		})

		retrieval.addPost('anotherpost.md', 'whatever', new Date(), 'I SAAAAAAID WHATEVER')
	})

	retrieval.addPost('somepost.md', 'whatever', new Date(), 'I SAID WHATEVER')
})

test("IndexManager does change detection based on the names and order of an index", function(t) {
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	var retrieval = new TestRetrieval()

	retrieval.addPost('anotherpost.md', 'whatever', new Date(), 'I SAAAAAAID WHATEVER')
	retrieval.addPost('somepost.md', 'whatever', new Date(), 'I SAID WHATEVER')

	var postManager = getPostManager(retrieval)
	var indexManager = getIndexManager(postManager, retrieval)

	t.plan(3)

	setTimeout(function() {
		indexManager.once('change', function(index) {
			t.equal(index.length, 2, 'Still only two items in index')
			t.equal(index[0], 'v2one.md')
			t.equal(index[1], 'v2two.md')

			postManager.stop()
			indexManager.stop()
		})

		retrieval.removeFromIndex('anotherpost.md')
		retrieval.removeFromIndex('somepost.md')
		retrieval.addPost('v2one.md', 'yeah', new Date(), 'meh')
		retrieval.addPost('v2two.md', 'huh', new Date(), 'k')

		setTimeout(function() {
			t.end()
		}, 100)
	}, 100)


})

test("IndexManager doesn't emit changes when none have been made", function(t) {
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	var retrieval = new TestRetrieval()

	retrieval.addPost('anotherpost.md', 'whatever', new Date(), 'I SAAAAAAID WHATEVER')
	retrieval.addPost('somepost.md', 'whatever', new Date(), 'I SAID WHATEVER')

	var postManager = getPostManager(retrieval)
	var indexManager = getIndexManager(postManager, retrieval)

	setTimeout(function() {
		indexManager.on('change', function(key, value, previousValue) {
			t.notOk(true, 'The index manager emits no changes')
		})
	}, 20)

	setTimeout(function() {
		indexManager.stop()
		postManager.stop()

		t.end()
	}, 1500)

})
