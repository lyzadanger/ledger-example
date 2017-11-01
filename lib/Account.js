/**
 * A module for handling transactions and balance calculations for a
 * single account
 * @module lib/account
 */
const moment = require('moment');

class Account {
  /**
   * @constructor
   */
  constructor (accountName) {
    this.accountName = accountName;
    this.transactions = [];
  }

  /**
   * Find this account's balance at atDate, granularity 1 day.
   * If no date provided, will return balance as of today.
   *
   * @param {(string | Moment)} atDate Strings should be ISO8601 format
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
   */
  credit (record) {
    this.transactions.push(record);
  }

  /**
   * Add a new transaction to this account, as a debit
   * (i.e. this account is paying into another account)
   *
   * @param {Object} record
   */
  debit (record) {
    record.amount = -1 * record.amount;
    this.transactions.push(record);
  }

  /**
   * Add a new transaction to this account. This will either
   * credit or debit the account depending on the payee/payer values
   *
   * @param {Object} record
   */
  transaction (record) {
    if (record.payer === this.accountName) {
      this.debit(record);
    } else {
      this.credit(record);
    }
  }
}

module.exports = Account;
