[![Build Status](https://travis-ci.org/TehShrike/noddity-butler.svg)](https://travis-ci.org/TehShrike/noddity-butler)

Noddity Butler
=====

A library for interacting with a Noddity blog server thingy.

## Construction

```js
var Butler = require('noddity-butler')
var butler = new Butler(noddityUrlString | noddityRetrieval, levelUpDb, [options])
```

- `noddityUrlString | noddityRetrieval` - can be either the url of a noddity root directory containing an index.json, or a [noddity-retrieval](https://github.com/TehShrike/noddity-retrieval) object
- `levelUpDb` - any [levelUP](https://github.com/rvagg/node-levelup) object
- `options` - an optional object with two properties:
	- `refreshEvery`: how often the butler should automatically check the server to see if the index or a post has changed.  Defaults to 12 hours for posts and 10 minutes for the index
	- `cacheCheckIntervalMs`: passed to the [expire-unused-keys](https://www.npmjs.com/package/expire-unused-keys) library to determine how often it should check to see if anything needs to be refreshed.  Defaults to 1 second

## API

All callbacks follow the error-first argument convention.

### getPosts([options], cb)

`options` is an optional object with these properties:

- `local`: if true, will only return posts that have already been downloaded locally - if some of the files listed in the index.json haven't been downloaded yet, they will not be returned.  If false, it makes sure that every file listed in the index.json has finished downloading before calling the callback.  This usually only matters in the first few seconds after launching a butler and calling `getPosts` the first time.  Defaults to false.
- `mostRecent`: the number of recent posts to limit to - if you only need to get most recent 5 posts (sorted by the date metadata at the top of the post file), pass in 5.  Defaults to undefined.

### getPost(filename, cb)

Produces the most recent cached post object for the given filename.

```js
butler.getPost('hello-world.md', function(err, post) {
	console.log('this post was created on', post.metadata.date)
	console.log('words of wisdom:', post.content)
})
```

### allPostsAreLoaded(cb)

Returns true if all of the posts listed in the index.json file have been downloaded and are cached locally.

### refreshPost(filename, [cb])

Updates the cache by downloading the latest version of the post from the server.  The optional callback returns the post.

### stop()

Causes the caches to cease periodically refreshing content from the server.

## Events

These events do fire the first time an item is added to the cache.

### `post changed`

Emitted when a post is refreshed from the server and its metadata or content is different from the cached version.  Emits the new post object.

### `index changed`

Emitted when the index.json is refreshed from the server and a file has been added to or removed from the index.json, or if the order has changed.


License
-------

[WTFPL](http://wtfpl2.com/)
