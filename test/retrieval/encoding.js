var Wizard = require('weak-type-wizard')

var postCaster = new Wizard({
	postMetadata: 'metadata',
	default: {
		content: ''
	},
	cast: {
		postMetadata: new Wizard({
			date: 'date'
		})
	}
})

module.exports = postCaster.getLevelUpEncoding()
