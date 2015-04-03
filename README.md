
# cmdy

A simple CLI-building tool for Node.js inspired by Python's cmd library.
(The name is "cmd.py" minus the ".p".)

This is very much a work in progress.

The first version of this attempted to wrap Node.js's REPL library,
but that has a few ideosyncracies; mostly it's meant to provide a
REPL for Node's Javascript execution and it's awkward to use for
general tasks.  For example, I had to monkey patch it to get
at the tab completion mechanism.  And repl.js passed it weird unparsed
command line stuff.  (Some of these issues are discussed here:
https://github.com/joyent/node/issues/9224)


The idea is, you could just pass it an object, it'll reflect it,
figure out what it needs to expose in a REPL loop, then parse etc that stuff.

It looks for functions following this naming convention:
- do_NAME exposes a command named NAME
- help_NAME provides help text for NAME
- complete_NAME is invoked to provide tab completion if the command on the current line is NAME.
- _start is a function invoked on startup.
- _stop is a function invoked when the REPL shuts down.

It also provides a "help" function to the CLI created with this, and
it lets you invoke commands with a minimal unique abbreviation (so
if you have a function "do_foo" and nothing else that starts with "do_f"
then you could invoke the function in the CLI with just "f").

### Related material:

There's a "cmd" library in NPM's repos, and in github here:
https://github.com/jonseymour/node-cmd
But it provides different (though similar) functionality.

There's this:
https://github.com/wdavidw/node-shell
which seems to provide similar functionality, but seems heavier-weight.
It extends its behavior using middleware, and may be more useful to you
if you're writing Express apps.  (Or not; it's not clear to me whether its
middleware standard is compatible with Express middleware, or if it's
just inspired by it.)


