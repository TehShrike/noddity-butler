var EventEmitter = require('events').EventEmitter
var sublevel = require('level-sublevel')
var Wizard = require('weak-type-wizard')
var NoddityRetrieval = require('noddity-retrieval')
var extend = require('extend')

var reflect = require('./lib/reflect.js')
var PostIndexManager = require('./lib/index_manager.js')
var PostManager = require('./lib/post_manager.js')

var postCaster = new Wizard({
	postMetadata: 'metadata',
	string: ['content', 'filename'],
	default: {
		content: '',
		filename: ''
	},
	cast: {
		postMetadata: new Wizard({
			date: 'date',
			markdown: 'boolean'
		})
	}
})

module.exports = function NoddityButler(host, levelUpDb, options) {
	// Host can be either a noddity retrieval object/stub, or a host string to be passed in to one
	var retrieval = typeof host === 'string' ? new NoddityRetrieval(host) : host
	var db = sublevel(levelUpDb)
	var emitter = new EventEmitter()
	options = extend({}, options)

	var butler = Object.create(emitter)


	var postManager = new PostManager(retrieval, db.sublevel('posts', {
		valueEncoding: postCaster.getLevelUpEncoding()
	}), {
		refreshEvery: options.refreshEvery
	})

	var indexManager = new PostIndexManager(retrieval, postManager, db.sublevel('index', {
		valueEncoding: 'json'
	}), {
		refreshEvery: options.refreshEvery
	})

	reflect('change', postManager, emitter, 'post changed')
	reflect('post added', postManager, emitter)
	reflect('change', indexManager, emitter, 'index changed')

	indexManager.on('change', indexManager.getPosts)

	function getPosts(options, cb) {
		if (typeof options === 'function') {
			cb = options
		}
		if (typeof options !== 'object') {
			options = {}
		}
		var local = options.local || false
		var begin = typeof options.mostRecent === 'number' ? -options.mostRecent : undefined
		var postGetter = local ? indexManager.getLocalPosts : indexManager.getPosts
		postGetter(begin, undefined, cb)
	}

	function stop() {
		postManager.stop()
		indexManager.stop()
	}

	butler.getPost = postManager.getPost
	butler.getPosts = getPosts
	butler.allPostsAreLoaded = indexManager.allPostsAreLoaded
	butler.stop = stop

	return butler
}
