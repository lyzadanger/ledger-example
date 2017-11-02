/* eslint-env node, mocha, chai */
/* eslint max-len: ["error", { "ignoreStrings": true }] */
const chai = require('chai');
chai.expect();
const expect = chai.expect;
const moment = require('moment');
const Ledger = require('../lib/Ledger.js');
const Account = require('../lib/Account.js');

const validCSVFile = `${__dirname}/data/valid.csv`;
const invalidCSVFile = `${__dirname}/data/invalid.csv`;
const simpleCSVFile = `${__dirname}/data/simple.csv`;
const badDateFile   = `${__dirname}/data/bad-date.csv`;
const badAmountFile   = `${__dirname}/data/bad-amount.csv`;

describe ('Ledger objects', () => {
  let ledger;
  before (() => {
    ledger = new Ledger();
  });
  describe ('Ledger~constructor', () => {
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
    it ('should reject on invalid amount in input', () => {
      return ledger.parseFile(badAmountFile).catch(err => {
        expect(err).to.be.an('error');
        expect(err.message).to.have.string('invalid amount');
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
    it ('should reject if no source provided', () => {
      const ledger = new Ledger();
      return ledger.parse().catch(err => {
        expect(err).to.be.an('Error');
        expect(err.message).to.have.string('nothing to parse');
      });
    });
  });
  describe ('Ledger#_findOrCreateAccount', () => {
    it ('should return existing account by account name', () => {
      const ledger = new Ledger();
      return ledger.parseFile(validCSVFile).then(led => {
        const mary = ledger._findOrCreateAccount('mary');
        expect(mary).to.contain.key('transactions');
        expect(mary.transactions.length).to.be.at.least(2);
      });
    });

    it ('should create a new, empty Account if none exists yet', () => {
      const ledger = new Ledger();
      const mary = ledger._findOrCreateAccount('mary');
      expect(mary).to.be.an('object');
      expect(mary).to.be.an.instanceOf(Account);
    });
  });

  describe('Ledger#account', () => {
    it ('should return an existing Account object', () => {
      const ledger = new Ledger();
      return ledger.parseFile(validCSVFile).then(led => {
        const mary = ledger.account('mary');
        expect(mary).to.contain.key('transactions');
        expect(mary.transactions.length).to.be.at.least(2);
      });
    });
    it ('should not create a new Account object if nonexistent', () => {
      const ledger = new Ledger();
      const mary = ledger.account('mary');
      expect(mary).to.be.an('undefined');
    });
  });

  describe ('Ledger#balance', () => {
    let ledger;
    before (() => {
      ledger = new Ledger();
      return ledger.parseFile(validCSVFile);
    });
    it ('should return a balance for an existing account', () => {
      expect(ledger.balance('mary')).to.be.a('number');
    });
    it ('should return undefined for nonexistent accounts', () => {
      expect(ledger.balance('garfield')).to.be.an('undefined');
      expect(ledger.balance('garfield', '2017-01-01')).to.be.an('undefined');
    });
    it ('should accept and pass through atDate argument', () => {
      expect(ledger.balance('mary', '2001-01-01')).to.equal(0);
      expect(ledger.balance('mary', '2017-11-01')).to.be.at.least(2000);
    });
  });
});
describe ('Account objects', () => {
  let ledger;
  before (() => {
    ledger = new Ledger();
    return ledger.parseFile(validCSVFile);
  });
  describe ('Account~constructor', () => {
    it ('should define object attributes', () => {
      const account = new Account();
      expect(account).to.be.an('object');
      expect(account).to.contain.key('accountName');
      expect(account).to.contain.key('transactions');
      expect(account.transactions.length).to.equal(0);
    });
  });

  describe ('Account#addTransaction', () => {
    it ('should debit records when this account is payer', () => {
      const account = new Account('gary');
      const fakeTrx = {
        date: moment('2017-01-01'),
        payer: 'gary',
        payee: 'phil',
        amount: 42.50
      };
      account.addTransaction(fakeTrx);
      expect(account.balance()).to.equal(-42.50);
    });
    it ('should credit records when this account is payee', () => {
      const account = new Account('gary');
      const fakeTrx = {
        date: moment('2017-01-01'),
        payer: 'phil',
        payee: 'gary',
        amount: 42.50
      };
      account.addTransaction(fakeTrx);
      expect(account.balance()).to.equal(42.50);
    });
    it ('should throw if trx is not for this account', () => {
      const account = new Account('gary');
      const fakeTrx = {
        date: moment('2017-01-01'),
        payer: 'frank',
        payee: 'bill',
        amount: 42.50
      };
      expect(() => account.addTransaction(fakeTrx)).to.throw;
    });
    it ('should have its own copies of transaction records from Ledger', () => {
      const bigcorp = ledger.account('bigcorp');
      bigcorp.transactions[0].amount = 1.00;
      const bigcorpTransactions = ledger.transactions
        .filter(el => el.payer === 'bigcorp');
      expect(bigcorpTransactions[0].amount).to.equal(3200);
    });
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
    it ('should not require atDate', () => {
      const account = ledger.account('mary');
      expect(account.balance()).to.be.a('number');
    });
  });

});
