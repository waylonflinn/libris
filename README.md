# libris


A simple Redis script manager with library support. Works with [node-redis](https://github.com/mranney/node_redis).

## Install

    npm install libris

## Quick Example

Create a directory called `scripts` in the root of your node project with a lua file named `add.lua`
that contains this:

```lua
--// return the sum of the first two arguments
return KEYS[1] + KEYS[2]
```


Call it from some node code like this:

```javascript
var redis = require('redis'),
	libris = require('libris');


var scriptDirectory = __dirname + "/scripts/",
	store = redis.createClient(6379, "localhost"),
	scripts = libris(store, scriptDirectory);


scripts.execute("add", [2, 3], function(err, result){
	
	// should print '5'
	console.log(result);
	process.exit(0);
});
```

The first argument to the `execute` function is the name of a file in the `scripts` directory. This file
should contain the lua code you want to execute. The second argument is an array of arguments to pass to the script (node-redis style). The final argument is the ubiquitous node callback.

## Usage


1. Create a directory to hold your Redis scripts (named `scripts` above).
2. Make sure the files inside are valid Redis scripts and have a `.lua` extension.
3. Create a `script` object in your node.js code by passing your redis object and the path to 
your script directory to `libris`.
4. Call any of the scripts in your directory by passing its file name to the `execute` object,
along with an array of arguments to be passed to that script.


## Library support

The real strength of this module is that it allows you to create reusable functions and include them in your Redis scripts. To get it working create a directory named `lib` inside your `scripts` directory. The contents of this directory will be concatenated and prepended to every Redis script. Just as with the scripts directory, they must be valid lua code and have a `.lua` extension.

Here's an example of what this might look like:


	node-app
	|
	|--app.js
	|
	+--scripts
	      |
	      |--add.lua
	      |--mapper.lua
	      |
	      +--lib
	          |
	          |--simple-math.lua
	          +--utility.lua


### Functions in Redis

Here's a basic introduction to what goes in the `lib` directory. You can create a function in a Redis
script like this:

```lua
--// add two numbers
local add = function(a, b)
	return a + b
end
```

With the above function in a file in your `lib` directory (say `simple-math.lua`), you can do the following
in one of your scripts.

```lua
return add(KEYS[1], KEYS[2])
```


This is exactly the same as creating a single file with the following contents.


```lua
--// add two numbers
local add = function(a, b)
	return a + b
end

return add(KEYS[1], KEYS[2])
```

In fact, this is exactly what `libris` will send to Redis. The diffence is, you can use the functions in `simple-math.lua` in all your scripts without having to explicity include them.

### Half of a Redis Map-Reduce Framework

Here's something a little more useful. Put this function in a file in your `lib` directory (maybe `utility.lua`).


```lua
local map = function(array, func)
	local new_array = {}
	for i,v in ipairs(array) do
		new_array[i] = func(v)
	end
	return new_array
end
```

Then put this in another file in your `scripts` directory (like `mapper.lua`).


```lua
local doubleIt = function(number)
    return number + number
end

--// double all the keys and return an array-like table
return map(KEYS, doubleIt)
```


and call it like this:

```javascript
scripts.execute("mapper", [1, 2, 3, 4, 5], function(err, result){

	// should print '[ 2, 4, 6, 8, 10 ]'
	console.log(result);
	process.exit(0);
});
```

## Notes

Right now, *all the files* in your `lib` directory get concatenated and prepended to *every* script. 
The impact of this is mitigated somewhat by Redis' SHA based caching. Nonetheless, you'll want to be careful
about what you put in there. Future developments will probably address this, while leaving the current
mode as an option.