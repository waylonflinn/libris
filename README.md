# libris


A simple Redis script manager with library support. Works with [node-redis](https://github.com/mranney/node_redis).

## Install

    npm install libris

## Quick Example

Create a directory called `scripts` in the root of your node project with a lua file named `add.lua`
that contains this:


	-- return the sum of the first two arguments
	return KEYS[1] + KEYS[2]


Then call it from some node code like this:

	var redis = require('redis'),
		libris = require('libris');


	var scriptDirectory = __dirname + "/scripts/",
		store = redis.createClient(6379, "localhost"),
		script = libris(store, scriptDirectory);


	script.execute("add", [2, 3], function(err, result){
		// should print '5'
		console.log(result);
	});


The first argument to the `execute` function is the name of a file in the `scripts` directory. This file
should contain the lua code you want to execute. Second argument is an array of arguments to pass to the script (node-redis style). Third argument is the ubiquitous node callback.

## Usage


1. Create a directory to hold your Redis scripts (named `scripts` above).
2. Make sure the files inside are valid Redis scripts and have a `.lua` extension.
3. Create a `script` object in your node.js code by passing your redis object and the path to 
your script directory to `libris`.
4. Call any of the scripts in your directory by passing the file name to the `execute` object,
along with an array of arguments to be passed to the Redis script.


## Library support

The real strength of this module is that it allows you to create reusable functions and include them in your Redis scripts. To get it working create a directory named `lib` inside your `scripts` directory. The contents of this directory will be concatenated and prepended to every Redis script. They must be valid lua code.


## Functions in Redis

A basic introduction to what goes in the `lib` directory. This is how you create a function in a Redis
script:

	-- Add two numbers
	local add = function(a, b)
		return a + b
	end

With the above function in a file in your `lib` directory (say `simple-math.lua`), you can do the following
in one of your scripts.

	return add(KEYS[1], KEYS[2])


This is exactly the same as creating a single file with the following contents, except now the functions in
your `simple-math.lua` file can be used by other scripts.

	-- Add two numbers
	local add = function(a, b)
		return a + b
	end

	return add(KEYS[1], KEYS[2])


Here's something a little more useful. Put this function in a file in your `lib` directory (maybe `utility.lua`).

	local map = function(array, func)
		local new_array = {}
		for i,v in ipairs(array) do
			new_array[i] = func(v)
		end
		return new_array
	end


Then put this in another file in your `scripts` directory (like `mapper.lua`).

	local set1 = {1, 2, 3, 4, 5}

	local doubleIt = function(number)
		return number + number
	end

	-- returns {2, 4, 6, 8, 10}
	return map(set1, doubleIt)


and call it like this

	script.execute('mapper', [], function(err, result){

		// should print '[2, 4, 6, 8, 10]'
		console.log(result);
	});
