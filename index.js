
"use strict";

/*

TODO:

*  In the start method, it hardcodes the I/O streams to stdin/stdout.
   Allow other in and out than that.

* i18n it

* check for cases of async invocation options (in readline, console)
  and confirm I'm using/providing this to the extent possible.

* Think about ways to provide this behavior in a less verbose way.
  Right now it wraps an object; could the user just subclass this class
  (as Python cmd.py does it)?  Reflect function names that don't follow
  the naming convention?

* consider: is the _start/_stop naming convention good?

* What if the wrapped object already had a help function; could we
  preserve it meaningfully?

* handle signals, allow for non-zero return vals at discretion of wrapped object (see readline docs)

* do i need to worry about stream pausing/resuming? (see readline docs)

* make help function smarter, respond to tab completion

*/

var readline = require("readline");



/**
 * Reflects an object and returns a bundle of information about
 * the behavior supported by the object.
 * Reflecting it first lets it create a "help" function.
 * TODO: support for dynamic objects, if that's important?
 */
var reflect = function(x) {
    var behavior = {};

    var action = /^do_(\w+)/;
    var help = /^help_(\w+)/;
    var completion = /^complete_(\w+)/;

    for (var thing in x) {
        var match;
        if (match = thing.match(action)) {
            var name = match[1];
            if (!behavior[name]) behavior[name] = {};

            if (typeof x[thing] == 'function') {
                behavior[name].action = x[thing];
            } else {
                console.warn(match[0] + " is not a function");
            }

        } else if (match = thing.match(help)) {
            var name = match[1];
            if (!behavior[name]) behavior[name] = {};

            if (typeof x[thing] == 'function') {
                behavior[name].help = x[thing];
            } else if (typeof x[thing] == 'string') {
                behavior[name].help = function() { return x[thing]; }
            } else {
                console.warn(match[0] + " is not a function or string");
            }

        } else if (match = thing.match(completion)) {
            var name = match[1];
            if (!behavior[name]) behavior[name] = {};

            if (typeof x[thing] == 'function') {
                behavior[name].complete = x[thing];
            } else {
                console.warn(match[0] + " is not a function");
            }
        }

        // TODO stop assuming that x is an object? (what else could it be?)
    }
    return behavior;
};



function Wrapper (wrapped) {
    this.wrapped = wrapped;
    var behavior = this.behavior = reflect(wrapped);

    // add a help function

    var command_names = Object.keys(behavior).filter(function(x) {
        return behavior[x].action;
    });
    command_names.sort();

    var help_topics = Object.keys(behavior).filter(function(x) {
        return behavior[x].help;
    });
    help_topics.sort();

    if (!behavior['help']) behavior['help'] = {};
    behavior['help'].action = function help(topic) {
        if (topic) {
            if (behavior[topic] && behavior[topic].help) {
                return behavior[topic].help(); // TODO additional args to help
            } else {
                return "No help topic: " + topic;
            }
        } else {
            return command_names.reduce(function(s, k) {
                            return s + "  " + k + "\n";
                        }, 'Commands:\n') +
                   help_topics.reduce(function(s, k) {
                            return s + "  " + k + "\n";
                        }, 'Help topics:\n');
        }
    };
}



/**
 * If the command isn't valid but matches only one actual command, use it.
 */
Wrapper.prototype.closest_command = function (command) {
    var behavior = this.behavior;

    if (behavior[command] && behavior[command].action) {
        return command;
    }

    var matches = Object.keys(behavior).filter(function(s) {
        return behavior[s].action && s.indexOf(command) == 0;
    });
    return (matches.length == 1) ? matches[0] : null;
};



Wrapper.prototype.start = function () {
    var wrapper = this; // the identity of "this" gets hairy below.

    if (wrapper.wrapped._start) wrapper.wrapped._start();

    var rl = readline.createInterface( {
        input: process.stdin,
        output: process.stdout,

        completer: function(partial_string, cb) {

            var response = []; // default for graceful degradation

            if (partial_string.indexOf(' ') < 0) {
                // no command was given, so complete on commands
                response = Object.keys(wrapper.behavior).filter(function(s) {
                    return wrapper.behavior[s].action && s.indexOf(partial_string) == 0;
                });
            } else {
                // they passed a command and are now trying to complete
                // on its arguments.
                var stuff = partial_string.split(/\s+/);
                if (wrapper.behavior[stuff[0]] && wrapper.behavior[stuff[0]].complete) {
                    response = wrapper.behavior[stuff[0]].complete.apply(wrapper.wrapped, stuff.splice(1));
                }
            }

            response = [ response, partial_string ];
            if (cb) {
                cb(null, response);
            } else {
                return response;
            }
        }
    });

    rl.setPrompt("> ");
    rl.prompt();

    rl.on('line', function (cmdline) {

        var response = 'error';
        // initial value has no use, but setting it to "error"
        // to make it degrade gracefully if something bad happens later.

        if (!cmdline || cmdline.trim().length < 1) {
            response = '';
        }
    
        var linebits = cmdline.split(/\s+/);
        if (linebits && linebits.length > 0) {
            var command = wrapper.closest_command(linebits[0]);
            if (command) {
                response = wrapper.behavior[command].action.apply(wrapper.wrapped, linebits.splice(1));
            } else {
                response = 'unknown command';
            }
        }
        console.log(response);  // TODO: is this tool smart enough to map console to whatever the output stream provided to readline was?
        rl.prompt();

    }).on('close', function() {
        if (wrapper.wrapped._stop) wrapper.wrapped._stop();
        process.exit(0);
    });
};


exports.create = function (x) {
    return new Wrapper(x);
};



