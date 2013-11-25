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

	this.removeFromIndex = function removeFromIndex(name) {
		index = index.filter(function(stringInIndex) {
			return stringInIndex !== name
		})
	}
	this.removePost = function removePost(name) {
		delete this[name]
		this.removeFromIndex(name)
	}
	this.addPost = function addPost(name, title, date, content) {
		index.push(name)
		this[name] = newPost(title, date, content)
	}
	this.getIndex = function getIndex(cb) {
		cb(false, index)
	}
	this.getPost = function getPost(name, cb) {
		if (typeof this[name] === 'undefined') {
			cb("There's nothing there named " + name + ", idiot")
		} else {
			cb(false, this[name])
		}
	}
}

module.exports = TestRetrieval
