var test = require('tape')
var PostManager = require('../lib/post_manager.js')
var levelmem = require('level-mem')
var Butler = require('../index.js')

test('respects post rate limiting', function(t) {
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })

	var limit = 2
	t.timeoutAfter(1000)

	var requestedSoFar = 0
	var currentlyBeingRequested = 0
	var indexJson = ['0.md', '1.md','2.md','3.md','4.md','5.md','6.md','7.md']

	var retrieval = {
		getIndex: function(cb) {
			cb(null, indexJson)
		},
		getPost: function(name, cb) {
			t.equal(name, requestedSoFar + '.md', 'File was requested in the expected order')
			requestedSoFar++
			currentlyBeingRequested++
			t.ok(currentlyBeingRequested <= limit, 'Hasn\'t gone over the request limit')
			setTimeout(function() {
				currentlyBeingRequested--
				cb(null, {
					metadata: {
						title: name,
						date: new Date()
					},
					content: 'yup ' + name
				})
			}, 100)
		}
	}

	var postManager = new PostManager(retrieval, db, {
		refreshEvery: 5000,
		checkToSeeIfItemsNeedToBeRefreshedEvery: 5,
		parallelPostRequests: limit
	})

	var postsReturned = false

	postManager.getPosts(indexJson, function(err, posts) {
		postsReturned = true
		t.notOk(err)
		t.equal(posts.length, indexJson.length)
	})

	postManager.getPost('8.md', function(err, post) {
		t.notOk(err)
		t.ok(postsReturned, 'Getting the single post should be queued up until after the list of posts has returned')
		t.end()
	})
})

test('defaults to no rate limiting', function(t) {
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })

	t.timeoutAfter(1000)

	var requestedSoFar = 0
	var returnedSoFar = 0
	var currentlyBeingRequested = 0
	var indexJson = ['0.md', '1.md','2.md','3.md','4.md','5.md','6.md','7.md']
	var previouslyRequestedNames = {}

	var retrieval = {
		getIndex: function(cb) {
			cb(null, indexJson)
		},
		getPost: function(name, cb) {
			requestedSoFar++
			currentlyBeingRequested++

			t.notOk(previouslyRequestedNames[name], 'Should not have been requested already')
			previouslyRequestedNames[name] = name
			setTimeout(function() {
				t.equal(currentlyBeingRequested, indexJson.length - returnedSoFar)
				returnedSoFar++
				currentlyBeingRequested--
				cb(null, {
					metadata: {
						title: name,
						date: new Date()
					},
					content: 'yup ' + name
				})
			}, 200)
		}
	}

	var postManager = new PostManager(retrieval, db, {
		refreshEvery: 5000,
		checkToSeeIfItemsNeedToBeRefreshedEvery: 5
	})

	postManager.getPosts(indexJson, function(err, posts) {
		t.notOk(err)
		t.equal(requestedSoFar, indexJson.length)
		t.end()
	})
})

test('Butler integration', function(t) {
	var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })

	var limit = 2
	t.timeoutAfter(1000)

	var currentlyBeingRequested = 0
	var indexJson = ['0.md', '1.md','2.md','3.md','4.md','5.md','6.md','7.md']

	var retrieval = {
		getIndex: function(cb) {
			cb(null, indexJson)
		},
		getPost: function(name, cb) {
			currentlyBeingRequested++
			t.ok(currentlyBeingRequested <= limit)
			setTimeout(function() {
				currentlyBeingRequested--
				cb(null, {
					metadata: {
						title: name,
						date: new Date()
					},
					content: 'yup ' + name
				})
			}, 100)
		}
	}

	var butler = new Butler(retrieval, db, {
		refreshEvery: 5000,
		parallelPostRequests: limit
	})

	butler.getPosts(function(err, posts) {
		t.notOk(err)
		t.equal(posts.length, indexJson.length)
		t.end()
	})
})
