var sublevel = require('level-sublevel')

var NoddityRetrieval = require('noddity-retrieval')

var PostIndexManager = require('./lib/index_manager.js')
var PostManager = require('./lib/post_manager.js')

module.exports = function NoddityButler(host, levelUpDb) {
	var retrieval = new NoddityRetrieval(host)
	var db = sublevel(levelUpDb)

	var postManager = new PostManager(retrieval, db.sublevel('posts', {valueEncoding: 'json'}))
	var indexManager = new PostIndexManager(retrieval, postManager, db.sublevel('index'))

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
	}

	return {
		getPost: postManager.getPost,
		getPosts: getPosts,
		allPostsAreLoaded: indexManager.allPostsAreLoaded,
		stop: stop
	}
}
