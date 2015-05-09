module.exports = function reflect(eventName, from, to, newEventName) {
	from.on(eventName, to.emit.bind(to, newEventName || eventName))
}
