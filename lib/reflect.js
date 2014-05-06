module.exports = function reflect(events, from, to, newEventName) {
	if (typeof events === 'string') {
		events = [events]
	}

	events.forEach(function(eventName) {
		from.on(eventName, to.emit.bind(to, newEventName || eventName))
	})
}
