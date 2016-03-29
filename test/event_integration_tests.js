var test = require('tape')
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
	t.timeoutAfter(5000)

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

	t.plan(4)

	var occurrences = 0
	butler.on('index changed', function(newIndex) {
		occurrences++
		t.equal(occurrences, 1, 'Change only emitted once')
		t.equal(newIndex.length, 1, 'The index now has a thing in it')
		t.equal(newIndex[0], 'heh', 'That new thing is "heh"')

		butler.getPosts(function(err, posts) {
			t.equal(posts.length, 1, 'An immediate call to getPosts in the index changed event handler returns the correct length')
			butler.stop()
		})
	})

	retrieval.addPost('heh', 'hurrrrrrr', new Date(), 'dur')
})

test('Butler fetches remote posts when started on a fresh cache', function(t) {
	t.plan(1)

	var retrieval = {
		getIndex: function(cb) {
			setTimeout(function() {
				cb(null, ['fancy-file.md'])
			}, 10)
		},
		getPost: function(name, cb) {
			t.equal(name, 'fancy-file.md')
			process.nextTick(function() {
				cb(null, {
					metadata: {
						title: 'fancy',
						date: new Date()
					},
					content: 'yup'
				})
				butler.stop()
				t.end()
			})
		}
	}

	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	var butler = new Butler(retrieval, db, {
		refreshEvery: 100
	})

	t.timeoutAfter(1000)
})

test('Butler does not fetch remote posts when the option is passed in', function(t) {
	t.plan(0)

	var retrieval = {
		getIndex: function(cb) {
			setTimeout(function() {
				cb(null, ['fancy-file.md'])
			}, 10)
		},
		getPost: function(name, cb) {
			t.fail('getPost should not be called')
		}
	}

	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })
	var butler = new Butler(retrieval, db, {
		refreshEvery: 100,
		loadPostsOnIndexChange: false
	})

	setTimeout(function() {
		butler.stop()
		t.end()
	}, 1000)
})
