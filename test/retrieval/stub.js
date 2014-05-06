function newPost(title, date, content) {
	return {
		metadata: {
			title: title,
			date: date
		},
		content: content
	}
}

function TestRetrieval() {
	var index = []
	var posts = {}

	this.removeFromIndex = function removeFromIndex(name) {
		index = index.filter(function(stringInIndex) {
			return stringInIndex !== name
		})
	}
	this.removePost = function removePost(name) {
		delete posts[name]
		this.removeFromIndex(name)
	}
	this.addPost = function addPost(name, title, date, content) {
		index.push(name)
		posts[name] = newPost(title, date, content)
	}
	this.getIndex = function getIndex(cb) {
		setTimeout(cb.bind(null, false, index), 10)
	}
	this.getPost = function getPost(name, cb) {
		process.nextTick(function() {
			if (typeof posts[name] === 'undefined') {
				cb("There's nothing there named " + name + ", idiot")
			} else {
				cb(false, posts[name])
			}
		})
	}
	this.getPostSync = function(name) {
		return posts[name]
	}
}

module.exports = TestRetrieval
