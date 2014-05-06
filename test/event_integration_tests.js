var test = require('tap').test
var TestRetrieval = require('./retrieval/stub.js')
var levelmem = require('level-mem')
var Butler = require('../index.js')

test("Butler emits event from the PostManager when a new post is added", function(t) {
	var retrieval = new TestRetrieval()
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	var butler = new Butler(retrieval, db, {
		refreshEvery: 1000
	})

	t.plan(2)

	butler.getPosts(function(err, posts) {
		t.notOk(err, 'no error')
		butler.on('post changed', function(key, post) {
			t.equal(key, 'HAH')
			butler.stop()
			t.end()
		})

		retrieval.addPost('HAH', 'huh?', new Date(), 'oh')
	})
})

test("Butler emits events from the IndexManager", function(t) {
	var retrieval = new TestRetrieval()
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	var butler = new Butler(retrieval, db, {
		refreshEvery: 100
	})

	var occurrences = 0
	butler.on('index changed', function(newIndex) {
		occurrences++
		t.equal(occurrences, 1, 'Change only emitted once')
		t.equal(newIndex.length, 1, 'The index now has a thing in it')
		t.equal(newIndex[0], 'heh', 'That new thing is "heh"')
		butler.stop()
		t.end()
	})

	retrieval.addPost('heh', 'hurrrrrrr', new Date(), 'dur')
})
