const fs       = require('fs');
const Readable = require('stream').Readable;
const parse    = require('csv-parse');
const moment   = require('moment');
const Account  = require('./Account');

/**
 * Represents a Ledger containing transactions and Accounts associated
 * with transactions
 */
class Ledger {

  constructor () {
    this.columns      = ['date', 'payer', 'payee', 'amount'];
    this.accounts     = {};
    this.transactions = [];
  }

  /**
   * Retrieve the Account object associated with accountName or create
   * a new Account object if none exists for that key.
   *
   * @param {string} accountName
   * @returns {Account}
   */
  findOrCreateAccount (accountName) {
    if (!Object.keys(this.accounts).includes(accountName)) {
      this.accounts[accountName] = new Account(accountName);
    }
    return this.accounts[accountName];
  }

  /**
   * Retrieve the Account object associated with accountName or undefined
   * if it doesn't exist.
   *
   * @param {string} accountName
   * @returns {Account | undefined}
   */
  findAccount (accountName) {
    return this.accounts[accountName] || undefined;
  }

  /**
   * Convenience method that takes a filename, creates a readable stream
   * from it and parses that stream as Ledger-formatted CSV.
   *
   * @param {string} filename
   * @returns {Promise} resolves to Ledger (self)
   */
  parseFile (filename) {
    return this.parse(fs.createReadStream(filename));
  }

  /**
   * Parses Ledger-formatted CSV from a string or stream.
   * If provided a string, will streamify it for you.
   * Adds any contained transactions
   * to this Ledger's transaction collection and to affected Accounts.
   *
   * @param {(string | Stream)} stringOrStream CSV source
   * @returns {Promise} resolves to Ledger (self)
   */
  parse (stringOrStream) {
    return new Promise ((resolve, reject) => {
      const parser = parse({ columns : this.columns });
      let readable = stringOrStream;

      if (typeof stringOrStream === 'string') {
        readable = new Readable();
        readable.push(stringOrStream);
        readable.push(null);
      } else if (!stringOrStream) { // TODO REFINE
        reject(new Error('Nothing to parse'));
      }

      parser.on('readable', () => {
        let record;
        while(record = parser.read()) {
          try {
            const trx = this._formatRecord(record);
            this.createTransaction(trx);
          } catch (err) {
            // Catch formatting/validation errors and reject the Promise
            reject(err);
          }
        }
      });
      parser.on('finish', () => resolve(this));
      parser.on('error', err => reject(err));

      readable.pipe(parser);
    });
  }

  /**
   * Validate parsed CSV row and format it as a ledger transaction
   *
   * @param {object} row
   * @param {string} row.date - ISO 8601-compatible date string
   * @param {string} row.payer - accountName of account to debit
   * @param {string} row.payee - accountName of account to credit
   * @param {string} row.amount - transaction amount, parse-able as float
   * @return {object} formatted ledger transaction
   * @throws Will throw if date element cannot be parsed as date or if amount
   *         element cannot be parsed as a float
   */
  _formatRecord (row) {
    const record = Object.assign({}, row);
    record.date   = moment(record.date, moment.ISO_8601);
    if (!record.date.isValid()) {
      throw new Error(`invalid date format in input: ${row.date}`);
    }
    record.amount = parseFloat(record.amount);
    if (isNaN(record.amount)) {
      throw new Error(`invalid amount value in input: ${row.amount}`);
    }
    return record;
  }

  /**
   * Add a transaction to this Ledger's Array of transactions, and
   * also add that transaction to each of the relevant accounts
   * (payer and payee).
   *
   * @param {Object} record - Object representing transaction data
   * @param {Object} record.date - moment.js date object
   * @param {string} record.payer
   * @param {string} record.payee
   * @param {Number} record.amount
   */
  createTransaction (record) {
    this.transactions.push(record);
    // Give each affected account a copy of the ledger transaction object
    this.findOrCreateAccount(record.payee)
      .createTransaction(Object.assign({}, record));
    this.findOrCreateAccount(record.payer)
      .createTransaction(Object.assign({}, record));
  }
}

module.exports = Ledger;
