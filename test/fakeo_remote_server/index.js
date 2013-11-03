var url = require('url')
var send = require('send')

module.exports = function(port) {
	var server = require('http').createServer(function(req, res) {
		send(req, url.parse(req.url).pathname)
			.root('./test/fakeo_remote_server/')
			.pipe(res)
	})

	server.listen(port)

	return server
}
