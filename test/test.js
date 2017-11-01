/* eslint-env node, mocha, chai */
/* eslint max-len: ["error", { "ignoreStrings": true }] */
const chai = require('chai');
chai.expect();
const expect = chai.expect;
const Ledger = require('../lib/Ledger.js');

const validCSVFile = `${__dirname}/data/valid.csv`;
const invalidCSVFile = `${__dirname}/data/invalid.csv`;
const simpleCSVFile = `${__dirname}/data/simple.csv`;
const badDateFile   = `${__dirname}/data/bad-date.csv`;

describe ('Ledger objects', () => {
  let ledger;
  before (() => {
    ledger = new Ledger();
  });
  describe ('Ledger#constructor', () => {
    it ('should have no transactions', () => {
      expect(ledger.transactions).to.be.an('Array').of.length(0);
    });
    it ('should have no accounts', () => {
      expect(ledger.accounts).to.be.an('object');
      expect(ledger.accounts).to.be.empty;
    });
  });

  describe ('Ledger#parse', () => {
    it ('should reject if neither filename opt nor string provided', () => {
      const ledger = new Ledger();
      return ledger.parse().catch(err => {
        expect(err).to.be.an('Error');
      });
    });
    it ('should parse valid CSV from a file', () => {
      const ledger = new Ledger();
      return ledger.parseFile(validCSVFile).then(() => {
        expect(ledger.transactions).to.be.an('Array');
        expect(ledger.transactions.length).to.be.at.least(2);
      });
    });
    it ('should reject on invalid CSV in a file', () => {
      const ledger = new Ledger();
      return ledger.parseFile(invalidCSVFile).catch(err => {
        expect(err).to.be.an('error');
      });
    });
    it ('should reject on invalid date format in input', () => {
      return ledger.parseFile(badDateFile).catch(err => {
        expect(err).to.be.an('error');
        expect(err.message).to.have.string('invalid date');
      });
    });
    it ('should parse valid CSV from a string', () => {
      const ledger = new Ledger();
      return ledger.parse(`2015-01-16,john,mary,125.00
        2015-01-17,john,supermarket,20.00`).then(led => {
          expect(led.transactions).to.have.length(2);
          expect(led.accounts).to.have.all.keys('john', 'mary', 'supermarket');
        });
    });
    it ('should reject on invalid CSV in a string', () => {
      const ledger = new Ledger();
      return ledger.parse('bleeeergh').catch(err => {
        expect(err).to.be.an('Error');
      });
    });
  });
  describe ('Ledger#account', () => {
    it ('should return existing account by account name', () => {
      const ledger = new Ledger();
      return ledger.parseFile(validCSVFile).then(led => {
        const mary = ledger.account('mary');
        expect(mary).to.contain.key('transactions');
        expect(mary.transactions.length).to.be.at.least(2);
      });
    });
  });
  describe ('Ledger#balance', () => {

  });
});
describe ('Account objects', () => {
  let ledger;
  before (() => {
    ledger = new Ledger();
    return ledger.parseFile(validCSVFile);
  });
  it ('should have its own copies of transaction records from Ledger', () => {
    const bigcorp = ledger.account('bigcorp');
    bigcorp.transactions[0].amount = 1.00;
    const bigcorpTransactions = ledger.transactions
      .filter(el => el.payer === 'bigcorp');
    expect(bigcorpTransactions[0].amount).to.equal(3200);
  });

  describe ('Account#balance', () => {
    let ledger;
    before (() => {
      ledger = new Ledger();
      return ledger.parseFile(simpleCSVFile);
    });
    it ('should debit transactions when accountName is payer', () => {
      const account = ledger.account('john');
      expect(account.balance()).to.equal(-4);
    });
    it ('should credit transactions when accountName is payee', () => {
      const account = ledger.account('mary');
      expect(account.balance()).to.equal(4);
    });
    it ('should accept a date (`endDate`)', () => {
      const account = ledger.account('mary');
      expect(account.balance('2017-10-26')).to.equal(1);
    });
    it ('should start with a 0 balance', () => {
      const account = ledger.account('mary');
      expect(account.balance('2001-10-26')).to.equal(0);
    });
    it ('should throw on a bad `atDate` parameter (invalid date)', () => {
      const account = ledger.account('mary');
      expect(() => account.balance('ding')).to.throw();
    });
  });

});
