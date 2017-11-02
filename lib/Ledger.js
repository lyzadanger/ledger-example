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
   * Retrieve the Account object associated with accountName or undefined
   * if it doesn't exist.
   *
   * @param {string} accountName
   * @returns {Account | undefined}
   */
  account (accountName) {
    return this.accounts[accountName] || undefined;
  }

  /**
   * Retrieve balance for account accountName vis-a-vis this ledger
   * at optional atDate.
   *
   * @param {string} accountName
   * @param {string | moment } [atDate] - optional date string (ISO 8601)
   *                           or Moment.js date object; granularity 1 day
   * @return {number | undefined} returns undefined if no matching account
   */
  balance (accountName, atDate) {
    const account = this.account(accountName);
    if (typeof account !== 'undefined') {
      return account.balance(atDate);
    }
    return undefined;
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
   * If provided a string, will streamify it for you and pipe it to the CSV
   * parser. Adds any contained transactions
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
      } else if (!stringOrStream) {
        reject(new Error('No valid CSV provided: nothing to parse'));
      }

      parser.on('readable', () => {
        let record;
        while(record = parser.read()) {
          try {
            const trx = this._formatRecord(record);
            this.addTransaction(trx);
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
  addTransaction (record) {
    this.transactions.push(record);
    // Give each affected account a copy of the ledger transaction object
    this._findOrCreateAccount(record.payee)
      .addTransaction(Object.assign({}, record));
    this._findOrCreateAccount(record.payer)
      .addTransaction(Object.assign({}, record));
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
   * Retrieve the Account object associated with accountName or create
   * a new Account object if none exists for that key.
   *
   * @param {string} accountName
   * @returns {Account}
   */
  _findOrCreateAccount (accountName) {
    if (!Object.keys(this.accounts).includes(accountName)) {
      this.accounts[accountName] = new Account(accountName);
    }
    return this.accounts[accountName];
  }
}

module.exports = Ledger;
