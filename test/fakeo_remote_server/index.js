var url = require('url')
var send = require('send')

module.exports = function(port, delay) {
	var server = require('http').createServer(function(req, res) {
		var respond = function() {
			send(req, url.parse(req.url).pathname)
				.root(__dirname)
				.pipe(res)
		}

		if (typeof delay === 'number') {
			setTimeout(respond, delay)
		} else {
			respond()
		}
	})

	server.listen(port)

	return server
}
