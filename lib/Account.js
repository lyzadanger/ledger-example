const moment = require('moment');

/**
 * Represents an account within a set of Ledger records
 */
class Account {

  constructor (accountName) {
    this.accountName = accountName;
    this.transactions = [];
  }

  /**
   * Find this account's balance at atDate, granularity 1 day.
   * If no date provided, will return balance as of today.
   *
   * @param {(string | moment)} atDate Strings should be ISO8601 format
   * @return {number} balance
   *
   */
  balance (atDate) {
    let balance = 0;
    if (typeof atDate === 'undefined') {
      atDate = moment();
    } else if (!moment.isMoment(atDate)) {
      atDate   = moment(atDate, moment.ISO_8601);
      if (!atDate.isValid()) {
        throw new Error('invalid date format for `atDate`');
      }
    }
    this.transactions.forEach(trx => {
      if (trx.date.isBefore(atDate, 'day')) {
        balance += trx.amount;
      }
    });
    return balance;
  }

  /**
   * Add a new transaction to this account, as a credit
   * (i.e. another account is paying into this account)
   *
   * @param {Object} record transaction object
   * @see Account#createTransaction
   */
  credit (record) {
    this.transactions.push(record);
  }

  /**
   * Add a new transaction to this account, as a debit
   * (i.e. this account is paying into another account)
   *
   * @param {Object} record
   * @see Account#createTransaction
   */
  debit (record) {
    record.amount = -1 * record.amount;
    this.transactions.push(record);
  }

  /**
   * Add a new transaction to this account. This will either
   * credit or debit the account depending on the payee/payer values
   *
   * @param {Object} record - Object representing transaction data
   * @param {Object} record.date - moment.js date object
   * @param {string} record.payer
   * @param {string} record.payee
   * @param {Number} record.amount
   */
  addTransaction (record) {
    if (record.payer === this.accountName) {
      this.debit(record);
    } else if (record.payee === this.accountName) {
      this.credit(record);
    } else {
      throw new Error('Transaction is not associated with this account');
    }
  }
}

module.exports = Account;
