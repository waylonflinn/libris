/* pass in a redis store and a path to a script directory
 * 
 * script = libris(store, scriptDirectory);
 *
 * // scriptName is a file in scriptDirectory
 * executor.execute(scriptName, arguments);
 *
 * script directory should contain files with:
 *		* a '.lua' extension
 * 		* filename before '.lua' extension is a valid javascript identifier
 *
 * may also contain a library directory
 *		* named 'lib'
 *		* contains files with the same restrictions as above
 *
 * if a library directory is present contents are read and concatenated, then prepended to all scripts
 */

var fs = require('fs');


var Script = function(store, scriptDirectory){
	if(!(this instanceof Script)) return new Script(store, scriptDirectory);

	var self = this;

	self.store = store;

	// read directory and find scripts
	var contents = fs.readdirSync(scriptDirectory),
		names = contents.filter(function(filename){ return filename.substring(filename.length - 3) == "lua"}),
		identifiers = names.map(function(filename){ return filename.substring(0, filename.length - 4)});

	var library = Script.readLibrary(scriptDirectory + 'lib/');

	// read all scripts from filesystem and pre-load them in redis
	this.scripts = {};

	for(var i = 0; i < identifiers.length; i++){

		name = names[i];
		identifier = identifiers[i];
		contents = fs.readFileSync(scriptDirectory + name, 'utf-8');
		this.scripts[identifier] = library + "\n" + contents;

		// pre-load scripts, so we can use the SHA1 later
		// when sharding this will have to go to multiple servers
		this.store.send_command("SCRIPT", ["LOAD", this.scripts[identifier]]);
	}
};

/*
 * Read a library directory and concatenate all the files.
 */ 
Script.readLibrary = function(directory){

	if(!fs.existsSync(directory)) return "";

	// read directory and find scripts
	var contents = fs.readdirSync(directory),
		names = contents.filter(function(filename){ return filename.substring(filename.length - 3) == "lua"});

	// read all scripts from filesystem and pre-load them in redis
	library = "";

	for(var i = 0; i < names.length; i++){

		name = names[i];
		library += fs.readFileSync(directory + name, 'utf-8');
		library += "\n";
	}

	return library;
}

Script.prototype.execute = function(name, arguments, callback){

	var	script = this.scripts[name],
		joinedArgs = [script, arguments.length].concat(arguments);

	// this should automatically use evalsha
	this.store.eval(joinedArgs, callback);
}

module.exports = Script;