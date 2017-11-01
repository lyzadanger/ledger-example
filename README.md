## Install

* clone or download repository
* `npm install`

## Use

* `npm start` will put you in a REPL with `Ledger` in global context
* `npm test` to run tests
* `npm run docs` to generate JSDoc documentation (open created `out/index.html` in a browser)

### Basic API

1. Instantiate a new ledger: `const ledger = new Ledger();`
2. Parse something in valid "ledger" CSV format. Parsing methods are promise-based
    1. To parse a string or Stream: `ledger.parse(stringOrStream).then(/* ... */)`
    2. To parse CSV from a file: `ledger.parseFile(filename).then(/* ... */)`
3. Check balances: `ledger.account(accountName).balance([atDate])` where optional `atDate` is ISO8601 format or a `moment` date object.

_Note_: for full documentation, use `npm run docs`

Example:

```
const Ledger = require('lib/ledger');
const ledger = new Ledger(); // create a new ledger
ledger.parseFile('./data/ledger-example.csv').then(() => {
  console.log(ledger.account('mary').balance()); // -> 3183
  console.log(ledger.account('mary').balance('2015-01-17')); // -> 125
  console.log(ledger.account('mary').balance('2015-01-17')); // -> 25
});
```
