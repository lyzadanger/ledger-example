const repl = require('repl');
const Ledger = require('./lib/ledger');

repl.start('> ').context.Ledger = Ledger;
