/**
 * Module for parsing transaction records and managing associated accounts
 * @module lib/ledger
 */
const fs       = require('fs');
const Readable = require('stream').Readable;
const parse    = require('csv-parse');
const moment   = require('moment');
const Account  = require('./Account');

class Ledger {
  /**
   * Represents a Ledger containing transactions and Accounts associated
   * with transactions
   * @constructor
   */
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
  account (accountName) {
    if (!Object.keys(this.accounts).includes(accountName)) {
      this.accounts[accountName] = new Account(accountName);
    }
    return this.accounts[accountName];
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
            record.date   = moment(record.date, moment.ISO_8601);
            if (!record.date.isValid()) {
              reject(new Error(`invalid date format in input: ${record.date}`));
            }
            // TODO error check
            record.amount = parseFloat(record.amount);
            this.transaction(record);
          } catch (err) {
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
   * @param {Object} record Object representing transaction record
   */
  transaction (record) {
    this.transactions.push(record);
    this.account(record.payee).transaction(Object.assign({}, record));
    this.account(record.payer).transaction(Object.assign({}, record));
  }
}

module.exports = Ledger;
