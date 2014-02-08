var EventEmitter = require('events').EventEmitter
var sublevel = require('level-sublevel')
var Wizard = require('weak-type-wizard')
var NoddityRetrieval = require('noddity-retrieval')

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
			date: 'date'
		})
	}
})

module.exports = function NoddityButler(host, levelUpDb) {
	var retrieval = new NoddityRetrieval(host)
	var db = sublevel(levelUpDb)

	var emitter = new EventEmitter()
	var postManager = new PostManager(retrieval, db.sublevel('posts', {
		emitter: emitter,
		valueEncoding: postCaster.getLevelUpEncoding()
	}))
	var indexManager = new PostIndexManager(retrieval, postManager, db.sublevel('index', { valueEncoding: 'json' }))

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

	emitter.getPost = postManager.getPost
	emitter.getPosts = getPosts
	emitter.allPostsAreLoaded = indexManager.allPostsAreLoaded
	emitter.stop = stop

	return emitter
}
