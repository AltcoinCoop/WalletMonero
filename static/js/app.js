(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Account = Account;

var _tabs = require('./tabs');

var _copy = require('./copy');

var _qrcode = require('./qrcode');

var _exchange = require('./exchange');

var _validator = require('./validator');

var _loading = require('./loading');

var _tooltip = require('./tooltip');

var _backend = require('./backend');

var _localstorage = require('./localstorage');

var _transaction = require('./transaction');

/**
 * Created by altingfest on 06/10/17.
 */

function Account() {
  var backend = void 0,
      localstorage = APP.localstorage,
      tooltip = void 0,
      transaction = void 0,
      monero_price = 0,
      balance = 0,
      unlocked_balance = 0,
      base = 10000000000,
      walletName = void 0,
      blockchainheight = 0,
      wallet_address = '',
      keys = void 0;

  var j_current_balance = $('.current_balance');
  var j_current_usd = $('#current_usd');
  var j_wallet_address = $('.wallet-address');
  var import_btn = $('#import-transactions');
  var rescan_btn = $('#rescan');
  var height_input = $('#import-height');
  var table = $('#transactions-table');
  var import_progress = $('#import-progress');
  var clear_cache = $('#clear-cache');

  //send
  var send_btn = $('#try-send-transaction');
  var send_address = $('#send-address');
  var send_amount = $('#send-amount');
  var send_payment_id = $('#send-payment-id');

  //tootlip
  var tt_id = $('#tx-id');
  var tt_fee = $('#tx-fee');
  var tt_confirmations = $('#tx-confirmations');
  var tt_mixin = $('#tx-mixin');

  function onInit() {

    keys = localstorage.get('keys');
    transaction = new _transaction.Transaction();

    // walletName = localstorage.get('walletName');

    backend = new _backend.Backend();

    wallet_address = JSON.parse(localstorage.get('keys')).public_addr;

    // changelly.getCurrencies().then((data) => {
    //   console.log(data);
    //   updateCurrencyList(data.result);
    // });

    backend.get_monero_price().then(function (data) {
      monero_price = data[0].price_usd;
      updateView();
    });

    j_wallet_address.val(wallet_address);

    getTransactionsData();

    new _tabs.Tabs('.account', { 'wallet': 0, 'transactions': 1, 'send': 2, 'exchange': 3 });
    // new Copy('#copy-exchange-address','#exchange-address');
    new _copy.Copy('#copy-wallet-address', '#wallet-address');
    new _qrcode.QR('#qrcode', '#exchange-address');
    new _qrcode.ToggleQR('#toggle-qr', '#wallet-address');
    var exchange = new _exchange.Exchange(wallet_address);
    new _loading.Loading('#transaction-load', function () {
      console.log('transactions loaded!');
      showMockTransactions();
    });

    new _validator.Validator('#try-send-transaction', '#send-transaction');
    // new Validator('#to-exchange','.exchange-data', ()=>{
    //   exchange.go();
    // });

    tooltip = new _tooltip.Tooltip('[data-transaction-id]', 'data-transaction-id', getTransactionDetail, function (hash, data) {
      var txs = JSON.parse(localstorage.get('txs'));
      var tx = txs.find(function (el) {
        return el.txid === hash;
      });
      console.log(txs);
      var mixin = data.rctsig_prunable.MGs[0].ss.length - 1;
      var confirmations = blockchainheight - tx.height;
      var split_hash = hash.substr(0, 32) + '<br>' + hash.substr(32);

      tt_id.html(split_hash);
      tt_fee.text(tx.fee / 1000000000000 + ' XMR');
      tt_mixin.text(mixin);
      tt_confirmations.text(confirmations);
    });

    import_btn.on('click', function () {
      importWalletFromHeight();
    });

    send_btn.on('click', function () {
      makeTransaction();
    });

    var rescan_interval = setInterval(function () {
      rescanBlockchain();
    }, 10000);

    setInterval(function () {
      backend.get_height().then(function (data) {
        blockchainheight = data.result.count;
        console.log('curr blockchain height:', blockchainheight);
      });
    }, 45000);
    backend.get_height().then(function (data) {
      blockchainheight = data.result.count;
      console.log('curr blockchain height:', blockchainheight);
    });

    rescan_btn.on('click', rescanBlockchain);

    clear_cache.on('click', function () {
      localstorage.clear();
      window.location.href = '/';
    });

    updateView();
  }

  function getBalance() {

    var txs = JSON.parse(localstorage.get('txs'));
    console.log(txs);

    var _balance = txs.reduce(function (res, el) {
      switch (el.type) {
        case 'in':
          res += el.amount;
          break;
        case 'out':
          res -= el.amount + el.fee;
          break;
      }
      return res;
    }, 0);
    balance = Math.round(_balance / base) / 100;
    updateView();
    // backend.get_balance().then((data)=>{
    //   balance = Math.round(data.result.balance/base)/100;
    //   unlocked_balance = Math.round(data.result.unlocked_balance/base)/100;
    //   if(balance > 0 && unlocked_balance === 0){
    //     alert('All your balance locked! Wait ~15 minutes');
    //   }
    //   updateView();
    //   getTransactionsData(); //TODO: to debug, remove later
    // });
  }

  function importWalletFromHeight() {

    var height = height_input.val();
    height = height == '' ? 1 : parseInt(height);
    var keys = JSON.parse(localstorage.get('keys'));
    //mock keys for test: //TODO: remove on production
    keys.public_addr = '9w7UYUD35ZS82ZsiHus5HeJQCJhzJiMRZTLTsCYCGfUoahk5PJpfKpPMvsBjteE3EW3Xm63t4ibk1ihBdjYjZn6KAjH2oSt';
    keys.view.sec = 'c53e9456ca998abc13cfc9a4c868bbe142ef0298fcf6b569bdf7986b9d525305';
    keys.spend.sec = '0da41a4648265e69701418753b610566ae04f0bbee8b815e3e4b99a69a5bd80d';
    import_btn.text('Importing...');
    var progress = '';
    var update_interval = void 0;

    setTimeout(function () {
      var socket = io('http://localhost:3335/');

      update_interval = setInterval(function () {
        import_progress.text(progress);
      }, 1000);
      socket.on('progress', function (data) {
        // console.log(data);
        // import_progress.text(data.progress);
        progress = data.progress;
      });
      socket.on('imported', function (data) {
        clearInterval(update_interval);
        localstorage.set('walletStatus', 'imported');
        console.log('from imported event', data.walletName);
        // getTransactionsData();
        // import_btn.text('Imported!');
        // socket.close();
        import_progress.text('');
        getTransactionsData();
        import_btn.text('Imported!');

        socket.close();
      });
      // socket.on('disconnect',()=>{
      //   console.log('from disconnected event');
      //   getTransactionsData();
      //   import_btn.text('Imported!');
      //   socket.close();
      // });
    }, 2000);

    backend.import_from_height(keys.public_addr, keys.spend.sec, keys.view.sec, height).then(function (data) {
      walletName = data.data;
      localstorage.set('walletName', data.data);
      backend.updateWalletName(data.data);

      // getTransactionsData();
    }).catch(function (e) {
      console.log('Cannot import wallet!', e);
    });
  }

  function rescanBlockchain() {
    backend.rescan_blockchain().then(function (data) {
      console.log('on rescan', data);
      updateTransactionTable(data);
    });
  }

  function getTransactionsData() {
    backend.get_transfers().then(function (data) {
      console.log(data);
      return data;
    }).then(updateTransactionTable);
  }

  function updateTransactionTable(txs_data) {
    $('.tr-generated').remove();
    var rows = txsDataToTableRows(txs_data);
    table.append(rows);
    tooltip.reinit();
  }

  function txsDataToTableRows(data) {
    var all = [];
    var restore_height = 0;
    var _in = data.result.in ? data.result.in : [];
    var _out = data.result.out ? data.result.out : [];
    var _pool = data.result.pool ? data.result.pool : [];
    var _pending = data.result.pending ? data.result.pending : [];
    var _failed = data.result.failed ? data.result.failed : [];
    var _all = _in.concat(_out, _pool, _pending, _failed);

    //eval restore height:
    if (_out.length > 0) {
      console.log('restore h out: ', _out);
    } else if (_in.length > 0) {
      console.log('restore h in: ', _in);
    } else {
      restore_height = blockchainheight;ll;
    }
    var local = [];

    if (localstorage.get('walletStatus') === 'imported') {
      var _local = JSON.parse(localstorage.get('txs'));
      local = _local.filter(function (el) {
        return _all.findIndex(function (tx) {
          return transaction.compare(tx, el);
        }) === -1;
      });
    }

    all = local.concat(_all);
    localstorage.set('txs', JSON.stringify(all));
    var rows = all.sort(function (a, b) {
      return -a.timestamp + b.timestamp;
    }).map(function (tx) {
      return transaction.generateTableRow(tx, monero_price);
    });
    getBalance();
    return rows;
  }

  function getTransactionDetail(tx) {
    return backend.get_transactions_info([tx]);
    // .then((data)=>{
    //
    // let txs = data.txs_as_json.map(JSON.parse);
    // console.log(txs);
    // });
  }

  function makeTransaction() {
    send_btn.attr('disabled', 'disabled');
    send_btn.text('Sending...');
    var address = send_address.val();
    var amount = parseFloat(send_amount.val()) * 1000000000000;
    var payment_id = send_payment_id.val();
    backend.make_transaction(address, amount, payment_id).then(function (data) {
      console.log(data);
      if (data.error) {
        send_btn.text(backend.translateWalletError(data.error));
        return;
      }
      send_btn.text('Success!');
      var tx_hash = data.result.tx_hash;
      // getTransactionDetail(tx_hash);
    }, function (error) {
      console.log(error);
    });
  }

  function updateView() {
    j_current_balance.text(balance);
    j_current_usd.text(Math.round(monero_price * balance));
  }

  //mockTransactions
  function showMockTransactions() {
    $('tr.hidden').removeClass('hidden');
  }

  onInit();
}

},{"./backend":2,"./copy":4,"./exchange":6,"./loading":8,"./localstorage":9,"./qrcode":12,"./tabs":14,"./tooltip":15,"./transaction":16,"./validator":17}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Backend = Backend;
/**
 * Created by altingfest on 13/10/17.
 */

function Backend() {
  var prefix = '';

  // let address = keys.public_addr;
  // let view_key = keys.view.sec;
  // let spend_key = keys.spend.sec;

  this.get_monero_price = function () {
    return request('/api/get_monero_price', {});
  };

  this.login = function () {
    return request('/api/login', { 'address': address, 'view_key': view_key });
  };

  this.get_height = function () {
    return request('/api/get_height', {}, 'GET');
  };

  this.create_wallet = function (address, spend, view) {
    return request('/api/create_wallet', {
      'address': address,
      'spend': spend,
      'view': view
    });
  };

  this.import_from_height = function (address, spend, view) {
    var height = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

    return request('/api/import_wallet_from_height', {
      'address': address,
      'spend': spend,
      'view': view,
      'height': height
    });
  };

  this.get_balance = function () {
    return request('/api/get_balance', {
      'walletName': walletName
    });
  };

  this.get_transfers = function () {
    return request('/api/get_transfers', {
      'walletName': walletName
    });
  };

  this.get_transactions_info = function (transactions) {
    return request('/api/get_transactions_info', {
      'walletName': walletName,
      'transactions': transactions
    });
  };

  this.make_transaction = function (address, amount, payment_id) {
    return request('/api/make_transaction', {
      'walletName': walletName,
      'address': address,
      'amount': amount,
      'payment_id': payment_id
    });
  };

  this.rescan_blockchain = function () {
    return request('/api/rescan', {
      'walletName': walletName
    });
  };

  this.question = function (name, email, message) {
    return request('/api/rescan', {
      'name': name,
      'email': email,
      'message': message
    });
  };

  // this.updateWalletName = function(newName){
  //   walletName = newName;
  // }

  function request(url, params) {
    var method = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'POST';

    return new Promise(function (resolve, reject) {
      var jqxhr = $.ajax({
        url: prefix + url,
        data: JSON.stringify(params),
        dataType: 'json',
        method: method,
        contentType: 'application/json'
      });

      jqxhr.done(function (data) {
        console.log('ajax successes:!');
        resolve(data);
      });

      jqxhr.fail(function (error) {
        console.log('ajax error: ' + error);
        reject(error);
      });

      jqxhr.always(function () {
        console.log('ajax end');
      });
    });
  }
}

Backend.prototype.translateWalletError = function (error) {
  switch (error.code) {
    // case -2: return 'Wrong address';
    // case -4: return 'Not enough money';
    default:
      return error.message;
  }
};

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Changelly = Changelly;
/**
 * Created by altingfest on 18/10/17.
 */

function Changelly() {

  var prefix = '';

  // let socket = io('http://localhost:3336/');
  // socket.on('progress', function (data) {
  //   // console.log(data);
  //   import_progress.text(data.progress);
  // });

  this.getCurrencies = function () {
    return request('/changellyGetCurrencies', {}, 'GET');
  };

  this.getMinAmount = function (from) {
    return request('/changellyGetMinAmount', {
      'from': from
    });
  };
  this.getExchangeAmount = function (from, amount) {
    return request('/changellyGetExchangeAmount', {
      'from': from,
      'amount': amount
    });
  };
  this.generateAddress = function (from, address) {
    return request('/changellyGenerateAddress', {
      'from': from,
      'address': address
    });
  };
  this.getStatus = function (id) {
    return request('/changellyGetStatus', {
      'id': id
    });
  };

  function request(url, params) {
    var method = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'POST';

    return new Promise(function (resolve, reject) {
      var jqxhr = $.ajax({
        url: prefix + url,
        data: JSON.stringify(params),
        dataType: 'json',
        method: method,
        contentType: 'application/json'
      });

      jqxhr.done(function (data) {
        console.log('ajax successes:!');
        resolve(data);
      });

      jqxhr.fail(function (error) {
        console.log('ajax error: ' + error);
        reject(error);
      });

      jqxhr.always(function () {
        console.log('ajax end');
      });
    });
  }
}

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Copy = Copy;
/**
 * Created by altingfest on 05/10/17.
 */

function Copy(trigger, copyfrom) {
  var _trigger = void 0,
      target = void 0;
  function onInit() {
    _trigger = $(trigger);
    if (_trigger.length > 0) {
      _trigger.on('click', onClick);
    }
  }

  function onClick() {
    var value = $(copyfrom).val();
    copyToClipboard(value);
  }

  function copyToClipboard(string) {
    var textArea = document.createElement("textarea");
    textArea.style.opacity = '0';
    textArea.value = string;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      var copy = document.execCommand('copy');
    } catch (e) {
      alert(e.message);
    }
    textArea.remove();
  }

  this.copy = function (str) {
    copyToClipboard(str);
  };

  onInit();
}

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Created by altingfest on 18/10/17.
 */
var CURRENCIES = exports.CURRENCIES = { "btc": "Bitcoin", "btcusd": "US Dollar", "btceur": "Euro", "eth": "Ethereum", "etc": "Ethereum Classic", "exp": "Expanse", "xem": "XEM (NEM)", "lsk": "Lisk", "xmr": "Monero", "game": "GameCredits", "steem": "Steem", "golos": "Golos", "sbd": "Steem Dollar", "zec": "Zcash", "nlg": "Gulden", "strat": "Stratis", "ardr": "Ardor", "rep": "Augur", "lbc": "LBRY Credits", "maid": "MaidSafeCoin", "fct": "Factom", "ltc": "Litecoin", "bcn": "Bytecoin", "xrp": "Ripple", "doge": "Dogecoin", "amp": "Synereo", "nxt": "Nxt", "dash": "Dash", "dsh": "Dashcoin", "rads": "Radium", "xdn": "DigitalNote", "aeon": "AeonCoin", "nbt": "NuBits", "fcn": "FantomCoin", "qcn": "QuazarCoin", "nav": "NAV Coin", "pot": "PotCoin", "gnt": "Golem", "waves": "Waves", "usdt": "Tether USD", "swt": "Swarm City", "mln": "Melon", "dgd": "DigixDAO", "time": "Chronobank", "sngls": "SingularDTV", "xaur": "Xaurum", "pivx": "PIVX", "gbg": "Golos Gold", "trst": "Trustcoin", "edg": "Edgeless", "gbyte": "Byteball", "dar": "Darcrus", "wings": "Wings DAO", "rlc": "iEx.ec", "gno": "Gnosis", "dcr": "Decred", "gup": "Guppy", "sys": "Syscoin", "lun": "Lunyr", "str": "Stellar - XLM", "bat": "Basic Attention Token", "ant": "Aragon", "bnt": "Bancor Network Token", "snt": "Status Network Token", "cvc": "Civic", "eos": "EOS", "pay": "TenXPay", "qtum": "Qtum", "bcc": "Bitcoin Cash", "neo": "Neo", "omg": "OmiseGo", "mco": "Monaco", "mtl": "Metal", "1st": "FirstBlood", "adx": "AdEx", "zrx": "0x Protocol Token", "qtum-i": "Qtum Ignition", "dct": "Decent" };

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Exchange = Exchange;

var _changelly = require('./changelly');

var _currencies = require('./currencies');

var _copy = require('./copy');

function Exchange(wallet_address) {
  var btn = void 0,
      payment = void 0,
      tab = void 0,
      currency = void 0,
      amount = void 0,
      receive = void 0,
      timeout = void 0,
      vue_exchange = void 0;
  var changelly = new _changelly.Changelly();
  var copy = new _copy.Copy();

  function onInit() {
    // btn = $('#exchange-btn');
    // currency = $('#exchange-currency');

    if (true) {
      // tab = $('#exchange-tab');
      // payment = $('#exchange-payment');
      // btn.on('click',getData);
      // updateCurrencyList();

      vue_exchange = new Vue({
        el: '#exchange-tab',
        data: {
          currencies: [],
          currency: 'btc',
          CURRENCIES: _currencies.CURRENCIES,
          pay: 0,
          receiveval: 0,
          min_amount: 0,
          address: wallet_address,
          payment_address: '',
          qr_uri: null,
          timer: null,
          show_payment: false,
          payment_status: ''

        },
        created: function created() {
          var _this = this;

          changelly.getCurrencies().then(function (data) {
            _this.currencies = data.result;
            console.log(_this.currencies);
          });
        },
        watch: {
          pay: function pay(val) {
            this.getAppoxReceive();
          },
          currency: function currency(val) {
            this.getAppoxReceive();
          }
        },
        computed: {
          receive: function receive() {
            return '~' + this.receiveval.toFixed(3) + ' XMR';
          },
          validation: function validation() {
            return {
              pay: isNum(this.pay) && this.pay > this.min_amount
            };
          },
          isValid: function isValid() {
            var _this2 = this;

            return Object.keys(this.validation).every(function (key) {
              return _this2.validation[key];
            });
          }
        },
        methods: {
          getAppoxReceive: function getAppoxReceive() {
            var _this3 = this;

            clearInterval(this.timer);
            this.timer = setTimeout(function () {
              changelly.getExchangeAmount(_this3.currency, _this3.pay).then(function (data) {
                _this3.receiveval = parseFloat(data.result);
              }).catch(function (e) {
                console.log(e);
              });
              changelly.getMinAmount(_this3.currency).then(function (data) {
                _this3.min_amount = data.result;
              }).catch(function (e) {
                console.log(e);
              });
            }, 300);
          },
          toExchangePayment: function toExchangePayment() {
            var _this4 = this;

            if (this.isValid) {
              // console.log('valid!');
              changelly.generateAddress(this.currency, this.address).then(function (data) {
                console.log(data);
                _this4.payment_address = data.result.address;
                var qrious = new QRious({ value: data.result.address, size: 180, padding: 0 });
                _this4.qr_uri = qrious.toDataURL();
                _this4.payment_status = 'waiting ' + _this4.pay + ' ' + _this4.currency.toUpperCase();
                _this4.show_payment = true;
                _this4.startSocket();
              }).catch(function (err) {
                console.log(err);
              });
            }
          },
          copyPaymentAddress: function copyPaymentAddress() {
            copy.copy(this.payment_address);
          },
          startSocket: function startSocket() {
            var socket = io('http://localhost:3335/');
            socket.on('status', function (data) {
              console.log(data);
              this.payment_status = data.status;
              if (data.status === 'finished' || data.status === 'failed' || data.status === 'refunded') {
                socket.close();
              }
            });
          }
        }
      });
    }
  }

  this.go = function () {
    getData();
  };

  function showPaymentAddress() {
    // tab.addClass('hidden');
    // payment.addClass('active');
  }

  function getData() {
    showPaymentAddress();
  }

  onInit();
} /**
   * Created by altingfest on 05/10/17.
   */

},{"./changelly":3,"./copy":4,"./currencies":5}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.finishRegistration = finishRegistration;

var _localstorage = require('./localstorage');

var _backend = require('./backend');

/**
 * Created by altingfest on 11/10/17.
 */
function finishRegistration() {
  var localstorage = new _localstorage.LocalStorage(),
      slice_size = config.sliceSize;
  var backend = new _backend.Backend();
  var seed = localstorage.get('seed');
  var seed_slices = [];
  var rand_slice = void 0;
  var confirm = $('#passphrase-confirm');
  var tryLogin = $('#try-login');

  function onInit() {
    for (var i = 0; i < 6; i++) {
      seed_slices.push(seed.slice(slice_size * i, slice_size * (i + 1)));
    }
    rand_slice = Math.floor(Math.random() * 6);
    updateView();

    tryLogin.on('click', login);
  }

  function updateView() {
    // confirm.attr('placeholder','enter '+sliceName(rand_slice)+' word');
  }

  function login(e) {
    var _this = this;

    e.preventDefault();
    var val = confirm.val();
    if (val === seed) {
      confirm.removeClass('invalid');
      var keys = JSON.parse(localstorage.get('keys'));
      //mock keys for test: //TODO: remove on production
      keys.public_addr = '9w7UYUD35ZS82ZsiHus5HeJQCJhzJiMRZTLTsCYCGfUoahk5PJpfKpPMvsBjteE3EW3Xm63t4ibk1ihBdjYjZn6KAjH2oSt';
      keys.view.sec = 'c53e9456ca998abc13cfc9a4c868bbe142ef0298fcf6b569bdf7986b9d525305';
      keys.spend.sec = '0da41a4648265e69701418753b610566ae04f0bbee8b815e3e4b99a69a5bd80d';

      backend.create_wallet(keys.public_addr, keys.spend.sec, keys.view.sec).then(function (data) {
        // console.log(data);
        localstorage.set('walletName', data.data);
        localstorage.set('walletStatus', 'new');
        window.location.href = $(_this).attr('href');
      }).catch(function (error) {
        console.log(error);
      });
    } else {
      confirm.addClass('invalid');
    }
  }

  function sliceName(index) {
    switch (index) {
      case 0:
        return index + 1 + 'st';
      case 1:
        return index + 1 + 'nd';
      case 2:
        return index + 1 + 'rd';
      default:
        return index + 1 + 'th';
    }
  }

  onInit();
}

},{"./backend":2,"./localstorage":9}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Loading = Loading;
/**
 * Created by altingfest on 05/10/17.
 */

function Loading(selector, callback) {
  var loader = void 0,
      flag = false;

  function onInit() {
    loader = $(selector);
    if (loader.length > 0) {
      loader.on('click', onClick);
    }
  }

  function onClick() {
    if (!flag) {
      flag = true;
      loader.addClass('loading');
      loader.text('loading...');
      //mock
      var p = new Promise(function (res, rej) {
        setTimeout(function () {
          res(callback);
        }, 3000);
      });
      p.then(function (f) {
        loader.removeClass('loading');
        loader.text('load more');
        flag = false;
        f();
      });
    }
  }

  onInit();
}

},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LocalStorage = LocalStorage;
/**
 * Created by altingfest on 10/10/17.
 */

function LocalStorage() {
  var self = this;
  var localStorage = void 0;
  if (window.sessionStorage) {
    localStorage = window.sessionStorage;
  } else {
    alert('Your browser don\'t support sessionStorage - please update your browser to use our service!');
    return;
  }
  var appData = {};
  var list = ['accountAnchor', 'keys', 'seed', 'accountType', 'walletName', 'txs', 'walletStatus'];

  function onInit() {
    console.log('local storage init');
    getDataFromLocalStorage();
  }

  function getDataFromLocalStorage() {
    list.forEach(function (prop) {
      appData[prop] = localStorage.getItem(prop);
    });
  }

  function checkProp(prop) {
    if (list.indexOf(prop) !== -1) {
      return true;
    }
    return false;
  }

  self.set = function (prop_name, data) {
    if (checkProp(prop_name)) {
      localStorage.setItem(prop_name, data);
    } else {
      throw new Error('Unknown localstorage prop name');
    }
  };

  self.get = function (prop_name) {
    if (checkProp(prop_name)) {
      return localStorage.getItem(prop_name);
    } else {
      throw new Error('Unknown localstorage prop name');
    }
  };

  self.clear = function () {
    list.forEach(function (prop) {
      localStorage.removeItem(prop);
    });
  };

  onInit();
}

},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Login = Login;

var _localstorage = require('./localstorage');

var _backend = require('./backend');

/**
 * Created by altingfest on 12/10/17.
 */
function Login() {
  var backend = new _backend.Backend();
  // let localstorage = new LocalStorage();

  function onInit() {}

  var login_app = new Vue({
    el: '#login-app',

    data: {
      key: '',
      message: ''
    },

    computed: {
      prevalid: function prevalid() {

        var length = this.key.length;
        if (length === 0) return true;

        var mnemonic_size = this.key.trim().split(' ').length;
        console.log(length, mnemonic_size);
        return length === 32 || mnemonic_size === 25 || mnemonic_size === 13;
      }
    },

    methods: {
      tryLogin: function tryLogin(event) {
        var _this = this;

        console.log(event, this.key, this.prevalid);

        var seed = void 0,
            keys = void 0;

        switch (this.detectKeyType()) {
          case 'seed':
            seed = this.key;
            keys = this.parseSeed(seed);
            console.log(keys);
            break;
          case 'monero':
          case 'mymonero':
            seed = this.decodeMnemonic(this.key);
            keys = this.parseSeed(seed);
            console.log(keys);
            break;
          default:
            this.message = 'Unknown private key type';
        }
        if (!keys) return;

        //TODO: mock testnet login data
        keys.public_addr = '9w7UYUD35ZS82ZsiHus5HeJQCJhzJiMRZTLTsCYCGfUoahk5PJpfKpPMvsBjteE3EW3Xm63t4ibk1ihBdjYjZn6KAjH2oSt';
        keys.view.sec = 'c53e9456ca998abc13cfc9a4c868bbe142ef0298fcf6b569bdf7986b9d525305';
        keys.spend.sec = '0da41a4648265e69701418753b610566ae04f0bbee8b815e3e4b99a69a5bd80d';

        backend.login(keys.public_addr, keys.view.sec).then(function (data) {
          console.log(data);
          if (data.status === 'success') {
            window.location.href = '/account.html';
            APP.localstorage.set('keys', keys);
          } else {
            _this.message = 'Can\'t login';
          }
        }).catch(function (e) {
          console.log(e);
        });

        // backend.create_wallet(keys.public_addr, keys.spend.sec, keys.view.sec).then((data)=>{
        //   if(data.error){
        //     this.message = 'Cannot create wallet with address: '+keys.public_addr;
        //     return;
        //   }
        //   console.log(data);
        //   localstorage.set('seed', seed);
        //   localstorage.set('keys', JSON.stringify(keys));
        //   localstorage.set('walletName', data.data);
        //   let status = localstorage.get('walletStatus');
        //
        //   if(status !== 'imported'){
        //     localstorage.set('walletStatus', 'exist');
        //   }
        //
        //
        //   window.location.href = '/account.html';
        // }).catch((error)=>{
        //   console.log(error);
        // });

      },

      detectKeyType: function detectKeyType() {
        var mnemonic_size = this.key.trim().split(' ').length;
        if (this.key.length === 32) return 'seed';
        if (mnemonic_size === 25) return 'monero';
        if (mnemonic_size === 13) return 'mymonero';
        return false;
      },

      parseSeed: function parseSeed(seed) {
        var keys = void 0;
        try {
          keys = cnUtil.create_address(seed);
        } catch (e) {
          this.message = 'Invalid private key!';
          console.log('invalid seed!', e);
        }
        return keys;
      },

      decodeMnemonic: function decodeMnemonic(mnemonic) {
        var seed = void 0;

        try {
          seed = mn_decode(mnemonic);
        } catch (e) {
          console.log(e);
          try {
            seed = mn_decode(mnemonic, "electrum");
          } catch (ee) {
            console.log(ee);
            this.message = 'Cannot decode mnemonic';
            // throw [e,ee];
          }
        }
        return seed;
      }

    }
  });

  function detectLoginType(value) {
    var mnemonic = value.trim().split(' ');

    if (mnemonic.length > 1) {
      switch (mnemonic.length) {
        case 13:
          console.log('short mnemonic');
          break;
        case 24:
          console.log('long mnemonic');
          break;
        case 25:
          console.log('long mnemonic');
          break;
        default:
          throw new Error('unknown login type:' + value);
      }
    }
  }

  onInit();
}

},{"./backend":2,"./localstorage":9}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Prelink = Prelink;
/**
 * Created by altingfest on 10/10/17.
 */

function Prelink(selector, action) {
  var links = void 0;

  function onInit() {
    links = $(selector);
    if (links.length > 0) {
      links.on('click', onClick);
    }
  }

  function onClick(e) {
    e.preventDefault();
    var data = $(this).attr('data-prelink');
    var href = $(this).attr('href');
    action(data);
    window.location.href = href;
  }

  onInit();
}

},{}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QR = QR;
exports.ToggleQR = ToggleQR;
/**
 * Created by altingfest on 05/10/17.
 */

function QR(selector, input) {
  var qr = void 0,
      container = void 0;
  function onInit() {
    container = $(selector);
    if (container.length > 0) {
      qr = new QRious({ value: $(input).val(), size: 180, padding: 0 });
      container.attr('src', qr.toDataURL());
    }
  }
  onInit();
}

function ToggleQR(selector, from) {
  var qr = void 0,
      trigger = void 0,
      val = void 0,
      qrimage = void 0,
      state = 'text';
  function onInit() {
    trigger = $(selector);
    if (trigger.length > 0) {
      qrimage = $('#qrimage');
      qr = new QRious({ value: $(from).val(), size: 180, padding: 0 });
      qrimage.attr('src', qr.toDataURL());
      trigger.on('click', onClick);
    }
  }

  function onClick() {
    qrimage.toggleClass('visible');
    if (state === 'qr') {
      state = 'text';
      trigger.attr('src', 'img/svg/qr.svg');
    } else {
      trigger.attr('src', 'img/svg/eye.svg');
      state = 'qr';
    }
  }

  onInit();
}

},{}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Subscribe = Subscribe;
/**
 * Created by altingfest on 06/10/17.
 */

function Subscribe() {
  var form = void 0,
      trigger = void 0,
      close = void 0;

  function onInit() {
    trigger = $('#subscribe-trigger');
    if (trigger.length > 0) {
      form = $('#subscribe-block');
      close = $('.subscribe-close');
      trigger.on('click', onTriggerClick);
      close.on('click', onCloseClick);
    }
  }

  function onTriggerClick() {
    trigger.addClass('hidden');
    form.removeClass('hidden');
  }

  function onCloseClick() {
    form.addClass('hidden');
    trigger.removeClass('hidden');
  }

  onInit();
}

},{}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tabs = Tabs;
/**
 * Created by altingfest on 05/10/17.
 */
function Tabs(selector, hashstates) {
  var container = void 0,
      labels = void 0,
      tabs = void 0;
  var count = void 0,
      current = void 0,
      hash = void 0;
  var hash_states = hashstates ? Object.assign({}, hashstates) : null;
  function initCurrent(hash) {
    if (hash_states !== null) {
      for (var prop in hash_states) {
        if (prop === hash) {
          current = hash_states[prop];
        }
      }
    } else {
      current = 0;
    }
  }

  function init() {
    console.log('in tabs');
    hash = window.APP.localstorage.get('accountAnchor');
    if (!hash) {
      hash = 'wallet';
    }
    container = $(selector);

    if (container.length > 0) {
      labels = container.find('[data-tab-label-index]');
      tabs = container.find('[data-tab-index]');
      initCurrent(hash);
      count = labels.length;
      initListeners();
      update();
    }
  }

  function initListeners() {
    labels.on('click', onLabelClick);
  }

  function onLabelClick() {
    var prev = current;
    current = $(this).attr('data-tab-label-index');
    if (current !== prev) {
      update();
    }
  }

  function update() {
    labels.removeClass('active');
    labels.eq(current).addClass('active');
    tabs.removeClass('active');
    tabs.eq(current).addClass('active');
  }

  init();
}

},{}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tooltip = Tooltip;
/**
 * Created by altingfest on 06/10/17.
 */

function Tooltip(selector, attr, getData, callback) {
  //getData - return promise
  var data = void 0,
      elements = void 0,
      tooltip = void 0,
      close = void 0;

  function onInit() {
    elements = $(selector);
    if (elements.length > 0) {
      tooltip = $('#tooltip');
      close = tooltip.find('.tooltip__close');

      elements.on('click', onClickWithTimeout);
      close.on('click', hideTooltip);

      tooltip.on('click', function (e) {
        e.stopPropagation();
      });
    }
  }

  function onClickWithTimeout(e) {
    setTimeout(onClick.bind(this, e), 100);
  }

  function onClick(e) {

    var self = $(this);
    var id = self.attr(attr);
    var w = tooltip.width();
    var displaceX = $(window).width() - w - e.clientX;
    // console.log(displaceX);
    console.log(id);
    displaceX = displaceX > 0 ? 0 : displaceX - 20;

    getData(id).then(function (tx) {
      // console.log(tx);
      var details = JSON.parse(tx.txs_as_json[0]);
      callback(id, details);
      console.log(details);
      // let mixin = details.rctsig_prunable.MGs[0].ss.length - 1;
      // console.log(mixin);
      tooltip.css('top', e.pageY + 'px');
      tooltip.css('left', e.clientX + displaceX + 'px');
      tooltip.addClass('visible');
      setTimeout(function () {
        $('body').on('click', closeByAnyClickOutside);
      }, 500);
    });
  }

  function closeByAnyClickOutside(e) {
    console.log(e);
    if (e.target !== tooltip) {
      hideTooltip();
    }
  }

  function hideTooltip() {
    tooltip.removeClass('visible');
    $('body').off('click', closeByAnyClickOutside);
  }

  this.reinit = function () {
    onInit();
  };

  onInit();
}

},{}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Transaction = Transaction;
/**
 * Created by altingfest on 16/10/17.
 */

function Transaction() {

  function typeTranslate(type) {
    switch (type) {
      case 'in':
        return 'Incoming';
      case 'out':
        return 'Spent';
      case 'pending':
        return 'pending';
      case 'pool':
        return 'Pool';
      case 'failed':
        return 'Failed';
      default:
        throw new Error('Unknown transaction type: ' + type);
    }
  }

  function format(val) {
    return val < 10 ? '0' + val.toString() : val.toString();
  }

  function toTime(dt) {
    return [dt.getHours(), dt.getMinutes(), dt.getSeconds()].map(format).join(':');
  }

  function toDate(dt) {
    return [dt.getDate(), dt.getMonth() + 1, dt.getFullYear()].map(format).join('.');
  }

  this.generateTableRow = function (tx, price_usd) {

    var type = typeTranslate(tx.type);
    var dt = new Date(tx.timestamp * 1000);
    var date = toDate(dt);
    var time = toTime(dt);
    var amount = Math.round(tx.amount / 1000000000) / 1000;
    var usd = Math.round(amount * price_usd);
    var template = '\n      <td>' + type + '</td>\n      <td>\n        <div class="transactions-table__xmr bold">' + amount + ' XMR</div>\n        <div class="transactions-table__usd">' + usd + ' USD</div>\n      </td>\n      <td>' + tx.payment_id + '</td>\n      <td>' + date + '</td>\n      <td data-transaction-id="' + tx.txid + '">\n        <div class="transactions-table__time">' + time + '</div>\n        <div class="transactions-table__details">details</div>\n      </td>\n    ';
    var tr = document.createElement('tr');
    tr.innerHTML = template;
    tr.className = "tr-generated";
    return tr;
  };

  this.compare = function (tx1, tx2) {
    return tx1.txid === tx2.txid;
  };

  this.datetime = function (tx) {
    var dt = new Date(tx.timestamp * 1000);
    return { date: toDate(dt), time: toTime(dt) };
  };

  // this.findRestorHeight = function(txs){
  //   let out =  txs
  //     .filter((tx)=>{
  //       return tx.type === 'out';
  //     }).sort((tx1,tx2)=>{
  //       return tx1.timestamp - tx2.timestamp;
  //     });
  // };
}

},{}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Validator = Validator;
/**
 * Created by altingfest on 05/10/17.
 */

function Validator(trig, target, callback) {
  var container = void 0,
      elements = void 0,
      trigger = void 0;

  function onInit() {
    trigger = $(trig);
    if (trigger.length > 0) {
      container = $(target);
      elements = container.find('[data-vd-type]');
      trigger.on('click', onClick);
    }
  }

  function onClick(event) {
    var valid = true;
    elements.each(function (index, el) {
      var jEl = $(el);
      var type = jEl.attr('data-vd-type');
      var val = jEl.val();
      if (validate(val, type)) {
        jEl.removeClass('invalid');
      } else {
        valid = false;
        jEl.addClass('invalid');
      }
    });
    if (!valid) {
      event.preventDefault();
    } else {
      if (callback) {
        callback();
      }
    }
  }

  function validate(val, type) {
    switch (type) {
      case 'required':
        return val.length > 0;
        break;
      case 'number':
        var re_number = /^[+-]?\d+(\.\d+)?$/;
        return re_number.test(val);
      case 'email':
        var re_email = /.+\@.+\..+/;
        return re_email.test(val);
    }
  }

  onInit();
}

},{}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WalletGenerator = WalletGenerator;

var _localstorage = require('./localstorage');

function WalletGenerator() {
  var seed = cnUtil.rand_16(),
      slice_size = config.sliceSize;
  var seed_slices = [];
  var keys = cnUtil.create_address(seed);
  var localstorage = new _localstorage.LocalStorage();

  function onInit() {
    // console.log('wallet generator init', 'seed:' + seed);
    for (var i = 0; i < 6; i++) {
      seed_slices.push(seed.slice(slice_size * i, slice_size * (i + 1)));
    }
    // console.log(seed.length);
    // console.log(seed_slices);
    // console.log(seed == seed_slices.join(''));
    localstorage.set('keys', JSON.stringify(keys));
    localstorage.set('seed', seed);
    // console.log(localstorage.get('keys'));
    updateView();
  }

  function updateView() {
    var copy_input = $('#passphrase-data');
    copy_input.val(seed);
    var passphrase = $('.passphrase__item-content');
    passphrase.each(function (index, el) {
      $(el).text(seed_slices[index]);
    });
  }

  onInit();
} /**
   * Created by altingfest on 11/10/17.
   */

},{"./localstorage":9}],19:[function(require,module,exports){
'use strict';

var _account = require('./components/account');

var _validator = require('./components/validator');

var _subscribe = require('./components/subscribe');

var _localstorage = require('./components/localstorage');

var _prelink = require('./components/prelink');

var _copy = require('./components/copy');

var _walletGenerator = require('./components/wallet-generator');

var _finishRegistration = require('./components/finish-registration');

var _login = require('./components/login');

var _backend = require('./components/backend');

$(function () {
  window.APP = new App();
  console.log(APP);
  window.APP.init();
});

function App() {
  self = this;

  var state = 'default';
  self.localstorage = new _localstorage.LocalStorage();

  function toState(state) {
    switch (state) {
      case 'account':
        if (!self.localstorage.get('keys')) {
          window.location.href = '/';
          return;
        }
        initAccount();
        break;
      case 'reg1':
        initRegistration1();
        break;
      case 'reg2':
        initRegistration2();
        break;
      case 'login':
        initLogin();
        break;
      case 'main':
        initMain();
        break;
      case 'contacts':
        initContacts();
        break;
      default:
        break;

    }
  }

  function detectState() {
    var res = state;
    var t = $('#app-state');
    if (t.length === 1) {
      res = t.attr('data-app-state');
    }
    return res;
  }

  function initMain() {

    new _subscribe.Subscribe();
    new _validator.Validator('#try-subscribe', '#subscribe-block');

    var backend = new _backend.Backend();
    backend.get_monero_price().then(function (data) {
      console.log('get monero price from main', data);
      $('#xmrusd').text(round(data[0].price_usd, 2));
      $('#xmrbtc').text(round(data[0].price_btc, 2));
    }).catch(function (error) {
      console.log(error);
    });
    // new Prelink('.account-anchor', (data)=>{
    //   self.localstorage.set('accountAnchor',data);
    // });
    //
    // new Prelink('.account-type', (data)=>{
    //   self.localstorage.set('accountType',data);
    // });
  }

  function initContacts() {
    var backend = (0, _backend.Backend)();
    new Vue({
      el: '#contact-form',
      data: {
        name: '',
        email: '',
        message: '',
        status: 'Send'

      },
      computed: {
        isValid: function isValid() {
          return true;
        }
      },
      methods: {
        send: function send() {
          var self = this;
          backend.question().then(function (data) {
            if (data.message === 'success') {
              self.status = 'Success';
            } else {
              self.status = 'Error';
            }
          }).catch();
        }
      }

    });
  }

  function initLogin() {
    new _login.Login();
    // new Validator('#try-login','.login-form');
    $('.onscreenkeyboard').mlKeyboard({
      trigger: '#keyboard-trigger',
      active_shift: false,
      show_on_focus: false,
      hide_on_blur: false
    });
  }

  function initAccount() {
    new _account.Account();
  }
  function initExchange() {}

  function initRegistration1() {
    new _walletGenerator.WalletGenerator();
    new _copy.Copy('#passphrase-copy', '#passphrase-data');
  }
  function initRegistration2() {
    // new Validator('#try-login','.login-form');
    new _finishRegistration.finishRegistration();
    $('.onscreenkeyboard').mlKeyboard({
      trigger: '#keyboard-trigger',
      active_shift: false,
      show_on_focus: false,
      hide_on_blur: false
    });
  }

  function onInit() {
    state = detectState();
    toState(state);
  }

  this.init = function () {
    onInit();
  };
}

window.isNum = function (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

function round(x, d) {
  var m = Math.pow(10, d);
  return Math.round(x * m) / m;
}

},{"./components/account":1,"./components/backend":2,"./components/copy":4,"./components/finish-registration":7,"./components/localstorage":9,"./components/login":10,"./components/prelink":11,"./components/subscribe":13,"./components/validator":17,"./components/wallet-generator":18}]},{},[19])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvY29tcG9uZW50cy9hY2NvdW50LmpzIiwic3JjL2pzL2NvbXBvbmVudHMvYmFja2VuZC5qcyIsInNyYy9qcy9jb21wb25lbnRzL2NoYW5nZWxseS5qcyIsInNyYy9qcy9jb21wb25lbnRzL2NvcHkuanMiLCJzcmMvanMvY29tcG9uZW50cy9jdXJyZW5jaWVzLmpzIiwic3JjL2pzL2NvbXBvbmVudHMvZXhjaGFuZ2UuanMiLCJzcmMvanMvY29tcG9uZW50cy9maW5pc2gtcmVnaXN0cmF0aW9uLmpzIiwic3JjL2pzL2NvbXBvbmVudHMvbG9hZGluZy5qcyIsInNyYy9qcy9jb21wb25lbnRzL2xvY2Fsc3RvcmFnZS5qcyIsInNyYy9qcy9jb21wb25lbnRzL2xvZ2luLmpzIiwic3JjL2pzL2NvbXBvbmVudHMvcHJlbGluay5qcyIsInNyYy9qcy9jb21wb25lbnRzL3FyY29kZS5qcyIsInNyYy9qcy9jb21wb25lbnRzL3N1YnNjcmliZS5qcyIsInNyYy9qcy9jb21wb25lbnRzL3RhYnMuanMiLCJzcmMvanMvY29tcG9uZW50cy90b29sdGlwLmpzIiwic3JjL2pzL2NvbXBvbmVudHMvdHJhbnNhY3Rpb24uanMiLCJzcmMvanMvY29tcG9uZW50cy92YWxpZGF0b3IuanMiLCJzcmMvanMvY29tcG9uZW50cy93YWxsZXQtZ2VuZXJhdG9yLmpzIiwic3JjL2pzL2N1c3RvbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O1FDZ0JnQixPLEdBQUEsTzs7QUFaaEI7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBYkE7Ozs7QUFnQk8sU0FBUyxPQUFULEdBQWtCO0FBQ3ZCLE1BQUksZ0JBQUo7QUFBQSxNQUNJLGVBQWUsSUFBSSxZQUR2QjtBQUFBLE1BRUksZ0JBRko7QUFBQSxNQUdJLG9CQUhKO0FBQUEsTUFJSSxl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QUFDcEI7QUFDRCxHQUZEO0FBR0Q7O0FBRUQsT0FBTyxLQUFQLEdBQWUsVUFBUyxDQUFULEVBQVk7QUFDekIsU0FBTyxDQUFDLE1BQU0sV0FBVyxDQUFYLENBQU4sQ0FBRCxJQUF5QixTQUFTLENBQVQsQ0FBaEM7QUFDRCxDQUZEOztBQUlBLFNBQVMsS0FBVCxDQUFlLENBQWYsRUFBa0IsQ0FBbEIsRUFBb0I7QUFDbEIsTUFBSSxJQUFJLEtBQUssR0FBTCxDQUFTLEVBQVQsRUFBWSxDQUFaLENBQVI7QUFDQSxTQUFPLEtBQUssS0FBTCxDQUFXLElBQUUsQ0FBYixJQUFnQixDQUF2QjtBQUNEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ3JlYXRlZCBieSBhbHRpbmdmZXN0IG9uIDA2LzEwLzE3LlxuICovXG5cbmltcG9ydCB7VGFic30gZnJvbSAnLi90YWJzJztcbmltcG9ydCB7Q29weX0gZnJvbSAnLi9jb3B5JztcbmltcG9ydCB7UVIsIFRvZ2dsZVFSfSBmcm9tICcuL3FyY29kZSc7XG5pbXBvcnQge0V4Y2hhbmdlfSBmcm9tICcuL2V4Y2hhbmdlJztcbmltcG9ydCB7VmFsaWRhdG9yfSBmcm9tICcuL3ZhbGlkYXRvcic7XG5pbXBvcnQge0xvYWRpbmd9IGZyb20gJy4vbG9hZGluZyc7XG5pbXBvcnQge1Rvb2x0aXB9IGZyb20gJy4vdG9vbHRpcCc7XG5pbXBvcnQge0JhY2tlbmR9IGZyb20gJy4vYmFja2VuZCc7XG5pbXBvcnQge0xvY2FsU3RvcmFnZX0gZnJvbSAnLi9sb2NhbHN0b3JhZ2UnXG5pbXBvcnQge1RyYW5zYWN0aW9ufSBmcm9tICcuL3RyYW5zYWN0aW9uJztcblxuXG5leHBvcnQgZnVuY3Rpb24gQWNjb3VudCgpe1xuICBsZXQgYmFja2VuZCxcbiAgICAgIGxvY2Fsc3RvcmFnZSA9IEFQUC5sb2NhbHN0b3JhZ2UsXG4gICAgICB0b29sdGlwLFxuICAgICAgdHJhbnNhY3Rpb24sXG4gICAgICBtb25lcm9fcHJpY2UgPSAwLFxuICAgICAgYmFsYW5jZSA9IDAsXG4gICAgICB1bmxvY2tlZF9iYWxhbmNlID0gMCxcbiAgICAgIGJhc2UgPSAxMDAwMDAwMDAwMCxcbiAgICAgIHdhbGxldE5hbWUsXG4gICAgICBibG9ja2NoYWluaGVpZ2h0ID0gMCxcbiAgICAgIHdhbGxldF9hZGRyZXNzID0gJycsXG4gICAgICBrZXlzO1xuXG4gIGxldCBqX2N1cnJlbnRfYmFsYW5jZSA9ICQoJy5jdXJyZW50X2JhbGFuY2UnKTtcbiAgbGV0IGpfY3VycmVudF91c2QgPSAkKCcjY3VycmVudF91c2QnKTtcbiAgbGV0IGpfd2FsbGV0X2FkZHJlc3MgPSAkKCcud2FsbGV0LWFkZHJlc3MnKTtcbiAgbGV0IGltcG9ydF9idG4gPSAkKCcjaW1wb3J0LXRyYW5zYWN0aW9ucycpO1xuICBsZXQgcmVzY2FuX2J0biA9ICQoJyNyZXNjYW4nKTtcbiAgbGV0IGhlaWdodF9pbnB1dCA9ICQoJyNpbXBvcnQtaGVpZ2h0Jyk7XG4gIGxldCB0YWJsZSA9ICQoJyN0cmFuc2FjdGlvbnMtdGFibGUnKTtcbiAgbGV0IGltcG9ydF9wcm9ncmVzcyA9ICQoJyNpbXBvcnQtcHJvZ3Jlc3MnKTtcbiAgbGV0IGNsZWFyX2NhY2hlID0gJCgnI2NsZWFyLWNhY2hlJyk7XG5cblxuICAvL3NlbmRcbiAgbGV0IHNlbmRfYnRuID0gJCgnI3RyeS1zZW5kLXRyYW5zYWN0aW9uJyk7XG4gIGxldCBzZW5kX2FkZHJlc3MgPSAkKCcjc2VuZC1hZGRyZXNzJyk7XG4gIGxldCBzZW5kX2Ftb3VudCA9ICQoJyNzZW5kLWFtb3VudCcpO1xuICBsZXQgc2VuZF9wYXltZW50X2lkID0gJCgnI3NlbmQtcGF5bWVudC1pZCcpO1xuXG4gIC8vdG9vdGxpcFxuICBsZXQgdHRfaWQgPSAkKCcjdHgtaWQnKTtcbiAgbGV0IHR0X2ZlZSA9ICQoJyN0eC1mZWUnKTtcbiAgbGV0IHR0X2NvbmZpcm1hdGlvbnMgPSAkKCcjdHgtY29uZmlybWF0aW9ucycpO1xuICBsZXQgdHRfbWl4aW4gPSAkKCcjdHgtbWl4aW4nKTtcblxuICBmdW5jdGlvbiBvbkluaXQoKXtcblxuICAgIGtleXMgPSBsb2NhbHN0b3JhZ2UuZ2V0KCdrZXlzJyk7XG4gICAgdHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24oKTtcblxuICAgIC8vIHdhbGxldE5hbWUgPSBsb2NhbHN0b3JhZ2UuZ2V0KCd3YWxsZXROYW1lJyk7XG5cbiAgICBiYWNrZW5kID0gbmV3IEJhY2tlbmQoKTtcblxuICAgIHdhbGxldF9hZGRyZXNzID0gSlNPTi5wYXJzZShsb2NhbHN0b3JhZ2UuZ2V0KCdrZXlzJykpLnB1YmxpY19hZGRyO1xuXG5cbiAgICAvLyBjaGFuZ2VsbHkuZ2V0Q3VycmVuY2llcygpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgIC8vICAgdXBkYXRlQ3VycmVuY3lMaXN0KGRhdGEucmVzdWx0KTtcbiAgICAvLyB9KTtcblxuICAgIGJhY2tlbmQuZ2V0X21vbmVyb19wcmljZSgpLnRoZW4oKGRhdGEpPT57XG4gICAgICBtb25lcm9fcHJpY2UgPSBkYXRhWzBdLnByaWNlX3VzZDtcbiAgICAgIHVwZGF0ZVZpZXcoKTtcbiAgICB9KTtcblxuXG4gICAgal93YWxsZXRfYWRkcmVzcy52YWwod2FsbGV0X2FkZHJlc3MpO1xuXG4gICAgZ2V0VHJhbnNhY3Rpb25zRGF0YSgpO1xuXG5cbiAgICBuZXcgVGFicygnLmFjY291bnQnLCB7J3dhbGxldCc6IDAsICd0cmFuc2FjdGlvbnMnOiAxLCAnc2VuZCc6IDIsICdleGNoYW5nZSc6IDN9KTtcbiAgICAvLyBuZXcgQ29weSgnI2NvcHktZXhjaGFuZ2UtYWRkcmVzcycsJyNleGNoYW5nZS1hZGRyZXNzJyk7XG4gICAgbmV3IENvcHkoJyNjb3B5LXdhbGxldC1hZGRyZXNzJywnI3dhbGxldC1hZGRyZXNzJyk7XG4gICAgbmV3IFFSKCcjcXJjb2RlJywnI2V4Y2hhbmdlLWFkZHJlc3MnKTtcbiAgICBuZXcgVG9nZ2xlUVIoJyN0b2dnbGUtcXInLCcjd2FsbGV0LWFkZHJlc3MnKTtcbiAgICBsZXQgZXhjaGFuZ2UgPSBuZXcgRXhjaGFuZ2Uod2FsbGV0X2FkZHJlc3MpO1xuICAgIG5ldyBMb2FkaW5nKCcjdHJhbnNhY3Rpb24tbG9hZCcsICgpPT57XG4gICAgICBjb25zb2xlLmxvZygndHJhbnNhY3Rpb25zIGxvYWRlZCEnKTtcbiAgICAgIHNob3dNb2NrVHJhbnNhY3Rpb25zKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgVmFsaWRhdG9yKCcjdHJ5LXNlbmQtdHJhbnNhY3Rpb24nLCcjc2VuZC10cmFuc2FjdGlvbicpO1xuICAgIC8vIG5ldyBWYWxpZGF0b3IoJyN0by1leGNoYW5nZScsJy5leGNoYW5nZS1kYXRhJywgKCk9PntcbiAgICAvLyAgIGV4Y2hhbmdlLmdvKCk7XG4gICAgLy8gfSk7XG5cbiAgICB0b29sdGlwID0gbmV3IFRvb2x0aXAoJ1tkYXRhLXRyYW5zYWN0aW9uLWlkXScsICdkYXRhLXRyYW5zYWN0aW9uLWlkJywgZ2V0VHJhbnNhY3Rpb25EZXRhaWwsIChoYXNoLCBkYXRhKT0+e1xuICAgICAgbGV0IHR4cyA9IEpTT04ucGFyc2UobG9jYWxzdG9yYWdlLmdldCgndHhzJykpO1xuICAgICAgbGV0IHR4ID0gdHhzLmZpbmQoKGVsKT0+e1xuICAgICAgICByZXR1cm4gZWwudHhpZCA9PT0gaGFzaDtcbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2codHhzKTtcbiAgICAgIGxldCBtaXhpbiA9IGRhdGEucmN0c2lnX3BydW5hYmxlLk1Hc1swXS5zcy5sZW5ndGggLSAxO1xuICAgICAgbGV0IGNvbmZpcm1hdGlvbnMgPSBibG9ja2NoYWluaGVpZ2h0IC0gdHguaGVpZ2h0O1xuICAgICAgbGV0IHNwbGl0X2hhc2ggPSBoYXNoLnN1YnN0cigwLDMyKSArICc8YnI+JyArIGhhc2guc3Vic3RyKDMyKTtcblxuICAgICAgdHRfaWQuaHRtbChzcGxpdF9oYXNoKTtcbiAgICAgIHR0X2ZlZS50ZXh0KHR4LmZlZS8xMDAwMDAwMDAwMDAwICsgJyBYTVInKTtcbiAgICAgIHR0X21peGluLnRleHQobWl4aW4pO1xuICAgICAgdHRfY29uZmlybWF0aW9ucy50ZXh0KGNvbmZpcm1hdGlvbnMpO1xuICAgIH0pO1xuXG5cblxuICAgIGltcG9ydF9idG4ub24oJ2NsaWNrJywgKCk9PntcbiAgICAgIGltcG9ydFdhbGxldEZyb21IZWlnaHQoKTtcbiAgICB9KTtcblxuICAgIHNlbmRfYnRuLm9uKCdjbGljaycsKCk9PntcbiAgICAgIG1ha2VUcmFuc2FjdGlvbigpO1xuICAgIH0pO1xuXG4gICAgbGV0IHJlc2Nhbl9pbnRlcnZhbCA9IHNldEludGVydmFsKCgpPT57XG4gICAgICByZXNjYW5CbG9ja2NoYWluKCk7XG4gICAgfSwxMDAwMCk7XG5cbiAgICBzZXRJbnRlcnZhbCgoKT0+e1xuICAgICAgYmFja2VuZC5nZXRfaGVpZ2h0KCkudGhlbigoZGF0YSk9PntcbiAgICAgICAgYmxvY2tjaGFpbmhlaWdodCA9IGRhdGEucmVzdWx0LmNvdW50O1xuICAgICAgICBjb25zb2xlLmxvZygnY3VyciBibG9ja2NoYWluIGhlaWdodDonLCBibG9ja2NoYWluaGVpZ2h0KTtcbiAgICAgIH0pO1xuICAgIH0sNDUwMDApO1xuICAgIGJhY2tlbmQuZ2V0X2hlaWdodCgpLnRoZW4oKGRhdGEpPT57XG4gICAgICBibG9ja2NoYWluaGVpZ2h0ID0gZGF0YS5yZXN1bHQuY291bnQ7XG4gICAgICBjb25zb2xlLmxvZygnY3VyciBibG9ja2NoYWluIGhlaWdodDonLCBibG9ja2NoYWluaGVpZ2h0KTtcbiAgICB9KTtcblxuICAgIHJlc2Nhbl9idG4ub24oJ2NsaWNrJywgcmVzY2FuQmxvY2tjaGFpbik7XG5cblxuXG4gICAgY2xlYXJfY2FjaGUub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcbiAgICAgIGxvY2Fsc3RvcmFnZS5jbGVhcigpO1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnLyc7XG4gICAgfSk7XG5cbiAgICB1cGRhdGVWaWV3KCk7XG4gIH1cblxuXG5cbiAgZnVuY3Rpb24gZ2V0QmFsYW5jZSgpe1xuXG4gICAgbGV0IHR4cyA9IEpTT04ucGFyc2UobG9jYWxzdG9yYWdlLmdldCgndHhzJykpO1xuICAgIGNvbnNvbGUubG9nKHR4cyk7XG5cbiAgICBsZXQgX2JhbGFuY2UgPSB0eHMucmVkdWNlKChyZXMsZWwpPT57XG4gICAgICBzd2l0Y2goZWwudHlwZSl7XG4gICAgICAgIGNhc2UgJ2luJzpcbiAgICAgICAgICByZXMgKz0gZWwuYW1vdW50O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdvdXQnOlxuICAgICAgICAgIHJlcyAtPSAoZWwuYW1vdW50ICsgZWwuZmVlKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXM7XG4gICAgfSwwKTtcbiAgICBiYWxhbmNlID0gTWF0aC5yb3VuZChfYmFsYW5jZS9iYXNlKS8xMDA7XG4gICAgdXBkYXRlVmlldygpXG4gICAgLy8gYmFja2VuZC5nZXRfYmFsYW5jZSgpLnRoZW4oKGRhdGEpPT57XG4gICAgLy8gICBiYWxhbmNlID0gTWF0aC5yb3VuZChkYXRhLnJlc3VsdC5iYWxhbmNlL2Jhc2UpLzEwMDtcbiAgICAvLyAgIHVubG9ja2VkX2JhbGFuY2UgPSBNYXRoLnJvdW5kKGRhdGEucmVzdWx0LnVubG9ja2VkX2JhbGFuY2UvYmFzZSkvMTAwO1xuICAgIC8vICAgaWYoYmFsYW5jZSA+IDAgJiYgdW5sb2NrZWRfYmFsYW5jZSA9PT0gMCl7XG4gICAgLy8gICAgIGFsZXJ0KCdBbGwgeW91ciBiYWxhbmNlIGxvY2tlZCEgV2FpdCB+MTUgbWludXRlcycpO1xuICAgIC8vICAgfVxuICAgIC8vICAgdXBkYXRlVmlldygpO1xuICAgIC8vICAgZ2V0VHJhbnNhY3Rpb25zRGF0YSgpOyAvL1RPRE86IHRvIGRlYnVnLCByZW1vdmUgbGF0ZXJcbiAgICAvLyB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGltcG9ydFdhbGxldEZyb21IZWlnaHQoKXtcblxuICAgIGxldCBoZWlnaHQgPSBoZWlnaHRfaW5wdXQudmFsKCk7XG4gICAgaGVpZ2h0ID0gKGhlaWdodCA9PSAnJykgPyAxIDogcGFyc2VJbnQoaGVpZ2h0KTtcbiAgICBsZXQga2V5cyA9IEpTT04ucGFyc2UobG9jYWxzdG9yYWdlLmdldCgna2V5cycpKTtcbiAgICAvL21vY2sga2V5cyBmb3IgdGVzdDogLy9UT0RPOiByZW1vdmUgb24gcHJvZHVjdGlvblxuICAgIGtleXMucHVibGljX2FkZHIgPSAnOXc3VVlVRDM1WlM4MlpzaUh1czVIZUpRQ0poekppTVJaVExUc0NZQ0dmVW9haGs1UEpwZktwUE12c0JqdGVFM0VXM1htNjN0NGliazFpaEJkallqWm42S0FqSDJvU3QnO1xuICAgIGtleXMudmlldy5zZWMgPSAnYzUzZTk0NTZjYTk5OGFiYzEzY2ZjOWE0Yzg2OGJiZTE0MmVmMDI5OGZjZjZiNTY5YmRmNzk4NmI5ZDUyNTMwNSc7XG4gICAga2V5cy5zcGVuZC5zZWMgPSAnMGRhNDFhNDY0ODI2NWU2OTcwMTQxODc1M2I2MTA1NjZhZTA0ZjBiYmVlOGI4MTVlM2U0Yjk5YTY5YTViZDgwZCc7XG4gICAgaW1wb3J0X2J0bi50ZXh0KCdJbXBvcnRpbmcuLi4nKTtcbiAgICBsZXQgcHJvZ3Jlc3MgPSAnJztcbiAgICBsZXQgdXBkYXRlX2ludGVydmFsO1xuXG4gICAgc2V0VGltZW91dCgoKT0+e1xuICAgICAgbGV0IHNvY2tldCA9IGlvKCdodHRwOi8vbG9jYWxob3N0OjMzMzUvJyk7XG5cbiAgICAgIHVwZGF0ZV9pbnRlcnZhbCA9IHNldEludGVydmFsKCgpPT57XG4gICAgICAgIGltcG9ydF9wcm9ncmVzcy50ZXh0KHByb2dyZXNzKTtcbiAgICAgIH0sMTAwMCk7XG4gICAgICBzb2NrZXQub24oJ3Byb2dyZXNzJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIC8vIGltcG9ydF9wcm9ncmVzcy50ZXh0KGRhdGEucHJvZ3Jlc3MpO1xuICAgICAgICBwcm9ncmVzcyA9IGRhdGEucHJvZ3Jlc3M7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5vbignaW1wb3J0ZWQnLChkYXRhKT0+e1xuICAgICAgICBjbGVhckludGVydmFsKHVwZGF0ZV9pbnRlcnZhbCk7XG4gICAgICAgIGxvY2Fsc3RvcmFnZS5zZXQoJ3dhbGxldFN0YXR1cycsJ2ltcG9ydGVkJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmcm9tIGltcG9ydGVkIGV2ZW50JyxkYXRhLndhbGxldE5hbWUpO1xuICAgICAgICAvLyBnZXRUcmFuc2FjdGlvbnNEYXRhKCk7XG4gICAgICAgIC8vIGltcG9ydF9idG4udGV4dCgnSW1wb3J0ZWQhJyk7XG4gICAgICAgIC8vIHNvY2tldC5jbG9zZSgpO1xuICAgICAgICBpbXBvcnRfcHJvZ3Jlc3MudGV4dCgnJyk7XG4gICAgICAgIGdldFRyYW5zYWN0aW9uc0RhdGEoKTtcbiAgICAgICAgaW1wb3J0X2J0bi50ZXh0KCdJbXBvcnRlZCEnKTtcblxuICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgICAgLy8gc29ja2V0Lm9uKCdkaXNjb25uZWN0JywoKT0+e1xuICAgICAgLy8gICBjb25zb2xlLmxvZygnZnJvbSBkaXNjb25uZWN0ZWQgZXZlbnQnKTtcbiAgICAgIC8vICAgZ2V0VHJhbnNhY3Rpb25zRGF0YSgpO1xuICAgICAgLy8gICBpbXBvcnRfYnRuLnRleHQoJ0ltcG9ydGVkIScpO1xuICAgICAgLy8gICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgIC8vIH0pO1xuICAgIH0sMjAwMCk7XG5cbiAgICBiYWNrZW5kLmltcG9ydF9mcm9tX2hlaWdodChrZXlzLnB1YmxpY19hZGRyLCBrZXlzLnNwZW5kLnNlYywga2V5cy52aWV3LnNlYywgaGVpZ2h0KS50aGVuKChkYXRhKT0+e1xuICAgICAgd2FsbGV0TmFtZSA9IGRhdGEuZGF0YTtcbiAgICAgIGxvY2Fsc3RvcmFnZS5zZXQoJ3dhbGxldE5hbWUnLGRhdGEuZGF0YSk7XG4gICAgICBiYWNrZW5kLnVwZGF0ZVdhbGxldE5hbWUoZGF0YS5kYXRhKTtcblxuICAgICAgLy8gZ2V0VHJhbnNhY3Rpb25zRGF0YSgpO1xuICAgIH0pLmNhdGNoKChlKT0+e1xuICAgICAgY29uc29sZS5sb2coJ0Nhbm5vdCBpbXBvcnQgd2FsbGV0IScsZSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiByZXNjYW5CbG9ja2NoYWluKCl7XG4gICAgYmFja2VuZC5yZXNjYW5fYmxvY2tjaGFpbigpLnRoZW4oKGRhdGEpPT57XG4gICAgICBjb25zb2xlLmxvZygnb24gcmVzY2FuJywgZGF0YSk7XG4gICAgICB1cGRhdGVUcmFuc2FjdGlvblRhYmxlKGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHJhbnNhY3Rpb25zRGF0YSgpe1xuICAgIGJhY2tlbmQuZ2V0X3RyYW5zZmVycygpXG4gICAgICAudGhlbigoZGF0YSk9PntcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0pLnRoZW4odXBkYXRlVHJhbnNhY3Rpb25UYWJsZSk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVUcmFuc2FjdGlvblRhYmxlKHR4c19kYXRhKXtcbiAgICAkKCcudHItZ2VuZXJhdGVkJykucmVtb3ZlKCk7XG4gICAgbGV0IHJvd3MgPSB0eHNEYXRhVG9UYWJsZVJvd3ModHhzX2RhdGEpO1xuICAgIHRhYmxlLmFwcGVuZChyb3dzKTtcbiAgICB0b29sdGlwLnJlaW5pdCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHhzRGF0YVRvVGFibGVSb3dzKGRhdGEpe1xuICAgIGxldCBhbGwgPSBbXTtcbiAgICBsZXQgcmVzdG9yZV9oZWlnaHQgPSAwO1xuICAgIGxldCBfaW4gPSBkYXRhLnJlc3VsdC5pbiA/IGRhdGEucmVzdWx0LmluIDogW107XG4gICAgbGV0IF9vdXQgPSBkYXRhLnJlc3VsdC5vdXQgPyBkYXRhLnJlc3VsdC5vdXQgOiBbXTtcbiAgICBsZXQgX3Bvb2wgPSBkYXRhLnJlc3VsdC5wb29sID8gZGF0YS5yZXN1bHQucG9vbCA6IFtdO1xuICAgIGxldCBfcGVuZGluZyA9IGRhdGEucmVzdWx0LnBlbmRpbmcgPyBkYXRhLnJlc3VsdC5wZW5kaW5nIDogW107XG4gICAgbGV0IF9mYWlsZWQgPSBkYXRhLnJlc3VsdC5mYWlsZWQgPyBkYXRhLnJlc3VsdC5mYWlsZWQgOiBbXTtcbiAgICBsZXQgX2FsbCA9IF9pbi5jb25jYXQoX291dCwgX3Bvb2wsIF9wZW5kaW5nLCBfZmFpbGVkKTtcblxuICAgIC8vZXZhbCByZXN0b3JlIGhlaWdodDpcbiAgICBpZihfb3V0Lmxlbmd0aCA+IDApe1xuICAgICAgY29uc29sZS5sb2coJ3Jlc3RvcmUgaCBvdXQ6ICcsIF9vdXQpO1xuICAgIH0gZWxzZSBpZihfaW4ubGVuZ3RoID4gMCl7XG4gICAgICBjb25zb2xlLmxvZygncmVzdG9yZSBoIGluOiAnLCBfaW4pO1xuICAgIH0gZWxzZXtcbiAgICAgIHJlc3RvcmVfaGVpZ2h0ID0gYmxvY2tjaGFpbmhlaWdodDtsbFxuICAgIH1cbiAgICBsZXQgbG9jYWwgPSBbXTtcblxuICAgIGlmKGxvY2Fsc3RvcmFnZS5nZXQoJ3dhbGxldFN0YXR1cycpID09PSAnaW1wb3J0ZWQnKXtcbiAgICAgIGxldCBfbG9jYWwgPSBKU09OLnBhcnNlKGxvY2Fsc3RvcmFnZS5nZXQoJ3R4cycpKTtcbiAgICAgIGxvY2FsID1fbG9jYWwuZmlsdGVyKChlbCk9PntcbiAgICAgICAgcmV0dXJuIF9hbGwuZmluZEluZGV4KCh0eCk9PnRyYW5zYWN0aW9uLmNvbXBhcmUodHgsZWwpKSA9PT0gLTE7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBhbGwgPSBsb2NhbC5jb25jYXQoX2FsbCk7XG4gICAgbG9jYWxzdG9yYWdlLnNldCgndHhzJywgSlNPTi5zdHJpbmdpZnkoYWxsKSk7XG4gICAgbGV0IHJvd3MgPSBhbGwuc29ydCgoYSxiKT0+IC0gYS50aW1lc3RhbXAgKyBiLnRpbWVzdGFtcCkubWFwKCh0eCk9PnRyYW5zYWN0aW9uLmdlbmVyYXRlVGFibGVSb3codHgsbW9uZXJvX3ByaWNlKSk7XG4gICAgZ2V0QmFsYW5jZSgpO1xuICAgIHJldHVybiByb3dzO1xuICB9XG5cblxuICBmdW5jdGlvbiBnZXRUcmFuc2FjdGlvbkRldGFpbCh0eCl7XG4gICAgcmV0dXJuIGJhY2tlbmQuZ2V0X3RyYW5zYWN0aW9uc19pbmZvKFt0eF0pO1xuICAgICAgLy8gLnRoZW4oKGRhdGEpPT57XG4gICAgICAvL1xuICAgICAgLy8gbGV0IHR4cyA9IGRhdGEudHhzX2FzX2pzb24ubWFwKEpTT04ucGFyc2UpO1xuICAgICAgLy8gY29uc29sZS5sb2codHhzKTtcbiAgICAvLyB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VUcmFuc2FjdGlvbigpe1xuICAgIHNlbmRfYnRuLmF0dHIoJ2Rpc2FibGVkJywnZGlzYWJsZWQnKTtcbiAgICBzZW5kX2J0bi50ZXh0KCdTZW5kaW5nLi4uJyk7XG4gICAgbGV0IGFkZHJlc3MgPSBzZW5kX2FkZHJlc3MudmFsKCk7XG4gICAgbGV0IGFtb3VudCA9IHBhcnNlRmxvYXQoc2VuZF9hbW91bnQudmFsKCkpKjEwMDAwMDAwMDAwMDA7XG4gICAgbGV0IHBheW1lbnRfaWQgPSBzZW5kX3BheW1lbnRfaWQudmFsKCk7XG4gICAgYmFja2VuZC5tYWtlX3RyYW5zYWN0aW9uKGFkZHJlc3MsYW1vdW50LHBheW1lbnRfaWQpLnRoZW4oKGRhdGEpPT57XG4gICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgIGlmKGRhdGEuZXJyb3Ipe1xuICAgICAgICBzZW5kX2J0bi50ZXh0KGJhY2tlbmQudHJhbnNsYXRlV2FsbGV0RXJyb3IoZGF0YS5lcnJvcikpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZW5kX2J0bi50ZXh0KCdTdWNjZXNzIScpO1xuICAgICAgbGV0IHR4X2hhc2ggPSBkYXRhLnJlc3VsdC50eF9oYXNoO1xuICAgICAgLy8gZ2V0VHJhbnNhY3Rpb25EZXRhaWwodHhfaGFzaCk7XG4gICAgfSwoZXJyb3IpPT57XG4gICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgfSk7XG4gIH1cblxuXG5cbiAgZnVuY3Rpb24gdXBkYXRlVmlldygpe1xuICAgIGpfY3VycmVudF9iYWxhbmNlLnRleHQoYmFsYW5jZSk7XG4gICAgal9jdXJyZW50X3VzZC50ZXh0KCBNYXRoLnJvdW5kKG1vbmVyb19wcmljZSpiYWxhbmNlKSk7XG4gIH1cblxuICAvL21vY2tUcmFuc2FjdGlvbnNcbiAgZnVuY3Rpb24gc2hvd01vY2tUcmFuc2FjdGlvbnMoKXtcbiAgICAkKCd0ci5oaWRkZW4nKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gIH1cblxuICBvbkluaXQoKTtcblxufSIsIi8qKlxuICogQ3JlYXRlZCBieSBhbHRpbmdmZXN0IG9uIDEzLzEwLzE3LlxuICovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIEJhY2tlbmQoKXtcbiAgbGV0IHByZWZpeCA9ICcnO1xuXG4gIC8vIGxldCBhZGRyZXNzID0ga2V5cy5wdWJsaWNfYWRkcjtcbiAgLy8gbGV0IHZpZXdfa2V5ID0ga2V5cy52aWV3LnNlYztcbiAgLy8gbGV0IHNwZW5kX2tleSA9IGtleXMuc3BlbmQuc2VjO1xuXG4gIHRoaXMuZ2V0X21vbmVyb19wcmljZSA9IGZ1bmN0aW9uICgpe1xuICAgIHJldHVybiByZXF1ZXN0KCcvYXBpL2dldF9tb25lcm9fcHJpY2UnLCB7fSk7XG4gIH07XG5cblxuICB0aGlzLmxvZ2luID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gcmVxdWVzdCgnL2FwaS9sb2dpbicseydhZGRyZXNzJzogYWRkcmVzcywgJ3ZpZXdfa2V5Jzogdmlld19rZXl9KTtcbiAgfVxuXG4gIHRoaXMuZ2V0X2hlaWdodCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHJlcXVlc3QoJy9hcGkvZ2V0X2hlaWdodCcse30sICdHRVQnKTtcbiAgfVxuXG4gIHRoaXMuY3JlYXRlX3dhbGxldCA9IGZ1bmN0aW9uIChhZGRyZXNzLCBzcGVuZCwgdmlldyl7XG4gICAgcmV0dXJuIHJlcXVlc3QoJy9hcGkvY3JlYXRlX3dhbGxldCcse1xuICAgICAgJ2FkZHJlc3MnOiBhZGRyZXNzLFxuICAgICAgJ3NwZW5kJzogc3BlbmQsXG4gICAgICAndmlldyc6IHZpZXdcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLmltcG9ydF9mcm9tX2hlaWdodCA9IGZ1bmN0aW9uKGFkZHJlc3MsIHNwZW5kLCB2aWV3LCBoZWlnaHQgPSAwKXtcbiAgICByZXR1cm4gcmVxdWVzdCgnL2FwaS9pbXBvcnRfd2FsbGV0X2Zyb21faGVpZ2h0Jyx7XG4gICAgICAnYWRkcmVzcyc6IGFkZHJlc3MsXG4gICAgICAnc3BlbmQnOiBzcGVuZCxcbiAgICAgICd2aWV3JzogdmlldyxcbiAgICAgICdoZWlnaHQnOiBoZWlnaHRcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLmdldF9iYWxhbmNlID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gcmVxdWVzdCgnL2FwaS9nZXRfYmFsYW5jZScse1xuICAgICAgJ3dhbGxldE5hbWUnOiB3YWxsZXROYW1lXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5nZXRfdHJhbnNmZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHJlcXVlc3QoJy9hcGkvZ2V0X3RyYW5zZmVycycsIHtcbiAgICAgICd3YWxsZXROYW1lJzogd2FsbGV0TmFtZVxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuZ2V0X3RyYW5zYWN0aW9uc19pbmZvID0gZnVuY3Rpb24odHJhbnNhY3Rpb25zKXtcbiAgICByZXR1cm4gcmVxdWVzdCgnL2FwaS9nZXRfdHJhbnNhY3Rpb25zX2luZm8nLCB7XG4gICAgICAnd2FsbGV0TmFtZSc6IHdhbGxldE5hbWUsXG4gICAgICAndHJhbnNhY3Rpb25zJzogdHJhbnNhY3Rpb25zXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5tYWtlX3RyYW5zYWN0aW9uID0gZnVuY3Rpb24oYWRkcmVzcywgYW1vdW50LCBwYXltZW50X2lkKXtcbiAgICByZXR1cm4gcmVxdWVzdCgnL2FwaS9tYWtlX3RyYW5zYWN0aW9uJywge1xuICAgICAgJ3dhbGxldE5hbWUnOiB3YWxsZXROYW1lLFxuICAgICAgJ2FkZHJlc3MnOiBhZGRyZXNzLFxuICAgICAgJ2Ftb3VudCc6IGFtb3VudCxcbiAgICAgICdwYXltZW50X2lkJzogcGF5bWVudF9pZFxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMucmVzY2FuX2Jsb2NrY2hhaW4gPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiByZXF1ZXN0KCcvYXBpL3Jlc2NhbicsIHtcbiAgICAgICd3YWxsZXROYW1lJzogd2FsbGV0TmFtZVxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMucXVlc3Rpb24gPSBmdW5jdGlvbihuYW1lLCBlbWFpbCwgbWVzc2FnZSl7XG4gICAgcmV0dXJuIHJlcXVlc3QoJy9hcGkvcmVzY2FuJywge1xuICAgICAgJ25hbWUnIDogbmFtZSxcbiAgICAgICdlbWFpbCc6IGVtYWlsLFxuICAgICAgJ21lc3NhZ2UnOiBtZXNzYWdlXG4gICAgfSk7XG4gIH1cblxuXG5cblxuICAvLyB0aGlzLnVwZGF0ZVdhbGxldE5hbWUgPSBmdW5jdGlvbihuZXdOYW1lKXtcbiAgLy8gICB3YWxsZXROYW1lID0gbmV3TmFtZTtcbiAgLy8gfVxuXG4gIGZ1bmN0aW9uIHJlcXVlc3QodXJsLCBwYXJhbXMsIG1ldGhvZCA9ICdQT1NUJyl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+e1xuICAgICAgbGV0IGpxeGhyID0gJC5hamF4KHtcbiAgICAgICAgdXJsOiBwcmVmaXgrdXJsLFxuICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShwYXJhbXMpLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgfSk7XG5cbiAgICAgIGpxeGhyLmRvbmUoKGRhdGEpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKCdhamF4IHN1Y2Nlc3NlczohJyk7XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KTtcblxuICAgICAganF4aHIuZmFpbCgoZXJyb3IpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKCdhamF4IGVycm9yOiAnK2Vycm9yKTtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICBqcXhoci5hbHdheXMoKCk9PntcbiAgICAgICAgY29uc29sZS5sb2coJ2FqYXggZW5kJyk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbn1cblxuQmFja2VuZC5wcm90b3R5cGUudHJhbnNsYXRlV2FsbGV0RXJyb3IgPSBmdW5jdGlvbihlcnJvcil7XG4gIHN3aXRjaChlcnJvci5jb2RlKXtcbiAgICAvLyBjYXNlIC0yOiByZXR1cm4gJ1dyb25nIGFkZHJlc3MnO1xuICAgIC8vIGNhc2UgLTQ6IHJldHVybiAnTm90IGVub3VnaCBtb25leSc7XG4gICAgZGVmYXVsdDogcmV0dXJuIGVycm9yLm1lc3NhZ2U7XG4gIH1cbn07IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMTgvMTAvMTcuXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIENoYW5nZWxseSgpe1xuXG4gIGxldCBwcmVmaXggPSAnJztcblxuICAvLyBsZXQgc29ja2V0ID0gaW8oJ2h0dHA6Ly9sb2NhbGhvc3Q6MzMzNi8nKTtcbiAgLy8gc29ja2V0Lm9uKCdwcm9ncmVzcycsIGZ1bmN0aW9uIChkYXRhKSB7XG4gIC8vICAgLy8gY29uc29sZS5sb2coZGF0YSk7XG4gIC8vICAgaW1wb3J0X3Byb2dyZXNzLnRleHQoZGF0YS5wcm9ncmVzcyk7XG4gIC8vIH0pO1xuXG4gIHRoaXMuZ2V0Q3VycmVuY2llcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHJlcXVlc3QoJy9jaGFuZ2VsbHlHZXRDdXJyZW5jaWVzJywge30sICdHRVQnKTtcbiAgfTtcblxuICB0aGlzLmdldE1pbkFtb3VudCA9IGZ1bmN0aW9uKGZyb20pe1xuICAgIHJldHVybiByZXF1ZXN0KCcvY2hhbmdlbGx5R2V0TWluQW1vdW50Jywge1xuICAgICAgJ2Zyb20nOiBmcm9tXG4gICAgfSk7XG4gIH07XG4gIHRoaXMuZ2V0RXhjaGFuZ2VBbW91bnQgPSBmdW5jdGlvbihmcm9tLCBhbW91bnQpe1xuICAgIHJldHVybiByZXF1ZXN0KCcvY2hhbmdlbGx5R2V0RXhjaGFuZ2VBbW91bnQnLCB7XG4gICAgICAnZnJvbSc6IGZyb20sXG4gICAgICAnYW1vdW50JzogYW1vdW50XG4gICAgfSk7XG4gIH07XG4gIHRoaXMuZ2VuZXJhdGVBZGRyZXNzID0gZnVuY3Rpb24oZnJvbSwgYWRkcmVzcyl7XG4gICAgcmV0dXJuIHJlcXVlc3QoJy9jaGFuZ2VsbHlHZW5lcmF0ZUFkZHJlc3MnLCB7XG4gICAgICAnZnJvbSc6IGZyb20sXG4gICAgICAnYWRkcmVzcyc6IGFkZHJlc3NcbiAgICB9KTtcbiAgfTtcbiAgdGhpcy5nZXRTdGF0dXMgPSBmdW5jdGlvbihpZCl7XG4gICAgcmV0dXJuIHJlcXVlc3QoJy9jaGFuZ2VsbHlHZXRTdGF0dXMnLCB7XG4gICAgICAnaWQnOiBpZFxuICAgIH0pO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHJlcXVlc3QodXJsLCBwYXJhbXMsIG1ldGhvZCA9ICdQT1NUJyl7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+e1xuICAgICAgbGV0IGpxeGhyID0gJC5hamF4KHtcbiAgICAgICAgdXJsOiBwcmVmaXgrdXJsLFxuICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShwYXJhbXMpLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgfSk7XG5cbiAgICAgIGpxeGhyLmRvbmUoKGRhdGEpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKCdhamF4IHN1Y2Nlc3NlczohJyk7XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KTtcblxuICAgICAganF4aHIuZmFpbCgoZXJyb3IpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKCdhamF4IGVycm9yOiAnK2Vycm9yKTtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICBqcXhoci5hbHdheXMoKCk9PntcbiAgICAgICAgY29uc29sZS5sb2coJ2FqYXggZW5kJyk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYWx0aW5nZmVzdCBvbiAwNS8xMC8xNy5cbiAqL1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBDb3B5KHRyaWdnZXIsIGNvcHlmcm9tKXtcbiAgbGV0IF90cmlnZ2VyLCB0YXJnZXQ7XG4gIGZ1bmN0aW9uIG9uSW5pdCgpe1xuICAgIF90cmlnZ2VyID0gJCh0cmlnZ2VyKTtcbiAgICBpZihfdHJpZ2dlci5sZW5ndGggPiAwKXtcbiAgICAgIF90cmlnZ2VyLm9uKCdjbGljaycsIG9uQ2xpY2spO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2xpY2soKXtcbiAgICBsZXQgdmFsdWUgPSAkKGNvcHlmcm9tKS52YWwoKTtcbiAgICBjb3B5VG9DbGlwYm9hcmQodmFsdWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29weVRvQ2xpcGJvYXJkKHN0cmluZyl7XG4gICAgbGV0IHRleHRBcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xuICAgIHRleHRBcmVhLnN0eWxlLm9wYWNpdHkgPSAnMCc7XG4gICAgdGV4dEFyZWEudmFsdWUgPSBzdHJpbmc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgdGV4dEFyZWEuc2VsZWN0KCk7XG4gICAgdHJ5e1xuICAgICAgdmFyIGNvcHkgPSBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICBhbGVydChlLm1lc3NhZ2UpO1xuICAgIH1cbiAgICB0ZXh0QXJlYS5yZW1vdmUoKTtcbiAgfVxuXG4gIHRoaXMuY29weSA9IGZ1bmN0aW9uKHN0cil7XG4gICAgY29weVRvQ2xpcGJvYXJkKHN0cik7XG4gIH07XG5cbiAgb25Jbml0KCk7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMTgvMTAvMTcuXG4gKi9cbmV4cG9ydCBjb25zdCBDVVJSRU5DSUVTID0ge1wiYnRjXCI6XCJCaXRjb2luXCIsXCJidGN1c2RcIjpcIlVTIERvbGxhclwiLFwiYnRjZXVyXCI6XCJFdXJvXCIsXCJldGhcIjpcIkV0aGVyZXVtXCIsXCJldGNcIjpcIkV0aGVyZXVtIENsYXNzaWNcIixcImV4cFwiOlwiRXhwYW5zZVwiLFwieGVtXCI6XCJYRU0gKE5FTSlcIixcImxza1wiOlwiTGlza1wiLFwieG1yXCI6XCJNb25lcm9cIixcImdhbWVcIjpcIkdhbWVDcmVkaXRzXCIsXCJzdGVlbVwiOlwiU3RlZW1cIixcImdvbG9zXCI6XCJHb2xvc1wiLFwic2JkXCI6XCJTdGVlbSBEb2xsYXJcIixcInplY1wiOlwiWmNhc2hcIixcIm5sZ1wiOlwiR3VsZGVuXCIsXCJzdHJhdFwiOlwiU3RyYXRpc1wiLFwiYXJkclwiOlwiQXJkb3JcIixcInJlcFwiOlwiQXVndXJcIixcImxiY1wiOlwiTEJSWSBDcmVkaXRzXCIsXCJtYWlkXCI6XCJNYWlkU2FmZUNvaW5cIixcImZjdFwiOlwiRmFjdG9tXCIsXCJsdGNcIjpcIkxpdGVjb2luXCIsXCJiY25cIjpcIkJ5dGVjb2luXCIsXCJ4cnBcIjpcIlJpcHBsZVwiLFwiZG9nZVwiOlwiRG9nZWNvaW5cIixcImFtcFwiOlwiU3luZXJlb1wiLFwibnh0XCI6XCJOeHRcIixcImRhc2hcIjpcIkRhc2hcIixcImRzaFwiOlwiRGFzaGNvaW5cIixcInJhZHNcIjpcIlJhZGl1bVwiLFwieGRuXCI6XCJEaWdpdGFsTm90ZVwiLFwiYWVvblwiOlwiQWVvbkNvaW5cIixcIm5idFwiOlwiTnVCaXRzXCIsXCJmY25cIjpcIkZhbnRvbUNvaW5cIixcInFjblwiOlwiUXVhemFyQ29pblwiLFwibmF2XCI6XCJOQVYgQ29pblwiLFwicG90XCI6XCJQb3RDb2luXCIsXCJnbnRcIjpcIkdvbGVtXCIsXCJ3YXZlc1wiOlwiV2F2ZXNcIixcInVzZHRcIjpcIlRldGhlciBVU0RcIixcInN3dFwiOlwiU3dhcm0gQ2l0eVwiLFwibWxuXCI6XCJNZWxvblwiLFwiZGdkXCI6XCJEaWdpeERBT1wiLFwidGltZVwiOlwiQ2hyb25vYmFua1wiLFwic25nbHNcIjpcIlNpbmd1bGFyRFRWXCIsXCJ4YXVyXCI6XCJYYXVydW1cIixcInBpdnhcIjpcIlBJVlhcIixcImdiZ1wiOlwiR29sb3MgR29sZFwiLFwidHJzdFwiOlwiVHJ1c3Rjb2luXCIsXCJlZGdcIjpcIkVkZ2VsZXNzXCIsXCJnYnl0ZVwiOlwiQnl0ZWJhbGxcIixcImRhclwiOlwiRGFyY3J1c1wiLFwid2luZ3NcIjpcIldpbmdzIERBT1wiLFwicmxjXCI6XCJpRXguZWNcIixcImdub1wiOlwiR25vc2lzXCIsXCJkY3JcIjpcIkRlY3JlZFwiLFwiZ3VwXCI6XCJHdXBweVwiLFwic3lzXCI6XCJTeXNjb2luXCIsXCJsdW5cIjpcIkx1bnlyXCIsXCJzdHJcIjpcIlN0ZWxsYXIgLSBYTE1cIixcImJhdFwiOlwiQmFzaWMgQXR0ZW50aW9uIFRva2VuXCIsXCJhbnRcIjpcIkFyYWdvblwiLFwiYm50XCI6XCJCYW5jb3IgTmV0d29yayBUb2tlblwiLFwic250XCI6XCJTdGF0dXMgTmV0d29yayBUb2tlblwiLFwiY3ZjXCI6XCJDaXZpY1wiLFwiZW9zXCI6XCJFT1NcIixcInBheVwiOlwiVGVuWFBheVwiLFwicXR1bVwiOlwiUXR1bVwiLFwiYmNjXCI6XCJCaXRjb2luIENhc2hcIixcIm5lb1wiOlwiTmVvXCIsXCJvbWdcIjpcIk9taXNlR29cIixcIm1jb1wiOlwiTW9uYWNvXCIsXCJtdGxcIjpcIk1ldGFsXCIsXCIxc3RcIjpcIkZpcnN0Qmxvb2RcIixcImFkeFwiOlwiQWRFeFwiLFwienJ4XCI6XCIweCBQcm90b2NvbCBUb2tlblwiLFwicXR1bS1pXCI6XCJRdHVtIElnbml0aW9uXCIsXCJkY3RcIjpcIkRlY2VudFwifTsiLCIvKipcbiAqIENyZWF0ZWQgYnkgYWx0aW5nZmVzdCBvbiAwNS8xMC8xNy5cbiAqL1xuaW1wb3J0IHtDaGFuZ2VsbHl9IGZyb20gJy4vY2hhbmdlbGx5JztcbmltcG9ydCB7Q1VSUkVOQ0lFU30gZnJvbSAnLi9jdXJyZW5jaWVzJztcblxuaW1wb3J0IHtDb3B5fSBmcm9tICcuL2NvcHknO1xuXG5leHBvcnQgZnVuY3Rpb24gRXhjaGFuZ2Uod2FsbGV0X2FkZHJlc3Mpe1xuICBsZXQgYnRuLCBwYXltZW50LCB0YWIsIGN1cnJlbmN5LCBhbW91bnQsIHJlY2VpdmUsIHRpbWVvdXQsIHZ1ZV9leGNoYW5nZTtcbiAgbGV0IGNoYW5nZWxseSA9IG5ldyBDaGFuZ2VsbHkoKTtcbiAgbGV0IGNvcHkgPSBuZXcgQ29weSgpO1xuXG4gIGZ1bmN0aW9uIG9uSW5pdCgpIHtcbiAgICAvLyBidG4gPSAkKCcjZXhjaGFuZ2UtYnRuJyk7XG4gICAgLy8gY3VycmVuY3kgPSAkKCcjZXhjaGFuZ2UtY3VycmVuY3knKTtcblxuICAgIGlmKHRydWUpe1xuICAgICAgLy8gdGFiID0gJCgnI2V4Y2hhbmdlLXRhYicpO1xuICAgICAgLy8gcGF5bWVudCA9ICQoJyNleGNoYW5nZS1wYXltZW50Jyk7XG4gICAgICAvLyBidG4ub24oJ2NsaWNrJyxnZXREYXRhKTtcbiAgICAgIC8vIHVwZGF0ZUN1cnJlbmN5TGlzdCgpO1xuXG4gICAgICB2dWVfZXhjaGFuZ2UgPSBuZXcgVnVlKHtcbiAgICAgICAgZWw6ICcjZXhjaGFuZ2UtdGFiJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGN1cnJlbmNpZXM6IFtdLFxuICAgICAgICAgIGN1cnJlbmN5OiAnYnRjJyxcbiAgICAgICAgICBDVVJSRU5DSUVTOiBDVVJSRU5DSUVTLFxuICAgICAgICAgIHBheTogMCxcbiAgICAgICAgICByZWNlaXZldmFsOiAwLFxuICAgICAgICAgIG1pbl9hbW91bnQ6IDAsXG4gICAgICAgICAgYWRkcmVzczogd2FsbGV0X2FkZHJlc3MsXG4gICAgICAgICAgcGF5bWVudF9hZGRyZXNzOiAnJyxcbiAgICAgICAgICBxcl91cmk6IG51bGwsXG4gICAgICAgICAgdGltZXI6IG51bGwsXG4gICAgICAgICAgc2hvd19wYXltZW50OiBmYWxzZSxcbiAgICAgICAgICBwYXltZW50X3N0YXR1czogJycsXG5cbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlZDogZnVuY3Rpb24oKXtcbiAgICAgICAgICBjaGFuZ2VsbHkuZ2V0Q3VycmVuY2llcygpLnRoZW4oKGRhdGEpPT57XG4gICAgICAgICAgICB0aGlzLmN1cnJlbmNpZXMgPSBkYXRhLnJlc3VsdDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuY3VycmVuY2llcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHdhdGNoOntcbiAgICAgICAgICBwYXk6IGZ1bmN0aW9uKHZhbCl7XG4gICAgICAgICAgICB0aGlzLmdldEFwcG94UmVjZWl2ZSgpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY3VycmVuY3k6IGZ1bmN0aW9uKHZhbCl7XG4gICAgICAgICAgICB0aGlzLmdldEFwcG94UmVjZWl2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY29tcHV0ZWQ6IHtcbiAgICAgICAgICByZWNlaXZlOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuICd+Jyt0aGlzLnJlY2VpdmV2YWwudG9GaXhlZCgzKSsnIFhNUic7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2YWxpZGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBwYXk6IChpc051bSh0aGlzLnBheSkgJiYgdGhpcy5wYXkgPiB0aGlzLm1pbl9hbW91bnQpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaXNWYWxpZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMudmFsaWRhdGlvbikuZXZlcnkoKGtleSkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWxpZGF0aW9uW2tleV1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBtZXRob2RzOntcbiAgICAgICAgICBnZXRBcHBveFJlY2VpdmU6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgY2hhbmdlbGx5LmdldEV4Y2hhbmdlQW1vdW50KHRoaXMuY3VycmVuY3ksIHRoaXMucGF5KS50aGVuKChkYXRhKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMucmVjZWl2ZXZhbCA9IHBhcnNlRmxvYXQoZGF0YS5yZXN1bHQpO1xuICAgICAgICAgICAgICB9KS5jYXRjaCgoZSk9PntcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGNoYW5nZWxseS5nZXRNaW5BbW91bnQodGhpcy5jdXJyZW5jeSlcbiAgICAgICAgICAgICAgICAudGhlbigoZGF0YSk9PntcbiAgICAgICAgICAgICAgICAgIHRoaXMubWluX2Ftb3VudCA9IGRhdGEucmVzdWx0O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKChlKT0+e1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0sMzAwKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRvRXhjaGFuZ2VQYXltZW50OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYodGhpcy5pc1ZhbGlkKXtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3ZhbGlkIScpO1xuICAgICAgICAgICAgICBjaGFuZ2VsbHkuZ2VuZXJhdGVBZGRyZXNzKHRoaXMuY3VycmVuY3ksdGhpcy5hZGRyZXNzKVxuICAgICAgICAgICAgICAgIC50aGVuKChkYXRhKT0+e1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICB0aGlzLnBheW1lbnRfYWRkcmVzcyA9IGRhdGEucmVzdWx0LmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgICBsZXQgcXJpb3VzID0gbmV3IFFSaW91cyh7dmFsdWU6IGRhdGEucmVzdWx0LmFkZHJlc3MsIHNpemU6IDE4MCwgcGFkZGluZzogMH0pO1xuICAgICAgICAgICAgICAgICAgdGhpcy5xcl91cmkgPSBxcmlvdXMudG9EYXRhVVJMKCk7XG4gICAgICAgICAgICAgICAgICB0aGlzLnBheW1lbnRfc3RhdHVzID0gYHdhaXRpbmcgJHt0aGlzLnBheX0gJHt0aGlzLmN1cnJlbmN5LnRvVXBwZXJDYXNlKCl9YDtcbiAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd19wYXltZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRTb2NrZXQoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKT0+eyBjb25zb2xlLmxvZyhlcnIpOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvcHlQYXltZW50QWRkcmVzczogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNvcHkuY29weSh0aGlzLnBheW1lbnRfYWRkcmVzcyk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGFydFNvY2tldDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGxldCBzb2NrZXQgPSBpbygnaHR0cDovL2xvY2FsaG9zdDozMzM1LycpO1xuICAgICAgICAgICAgc29ja2V0Lm9uKCdzdGF0dXMnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgdGhpcy5wYXltZW50X3N0YXR1cyA9IGRhdGEuc3RhdHVzO1xuICAgICAgICAgICAgICBpZihkYXRhLnN0YXR1cyA9PT0gJ2ZpbmlzaGVkJyB8fCBkYXRhLnN0YXR1cyA9PT0gJ2ZhaWxlZCcgfHwgZGF0YS5zdGF0dXMgPT09ICdyZWZ1bmRlZCcpe1xuICAgICAgICAgICAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG5cbiAgdGhpcy5nbyA9IGZ1bmN0aW9uKCl7XG4gICAgZ2V0RGF0YSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd1BheW1lbnRBZGRyZXNzKCl7XG4gICAgLy8gdGFiLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAvLyBwYXltZW50LmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERhdGEoKXtcbiAgICBzaG93UGF5bWVudEFkZHJlc3MoKTtcbiAgfVxuXG4gIG9uSW5pdCgpO1xufSIsIi8qKlxuICogQ3JlYXRlZCBieSBhbHRpbmdmZXN0IG9uIDExLzEwLzE3LlxuICovXG5pbXBvcnQge0xvY2FsU3RvcmFnZX0gZnJvbSAnLi9sb2NhbHN0b3JhZ2UnO1xuaW1wb3J0IHtCYWNrZW5kfSBmcm9tICAnLi9iYWNrZW5kJztcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmlzaFJlZ2lzdHJhdGlvbigpe1xuICBsZXQgbG9jYWxzdG9yYWdlID0gbmV3IExvY2FsU3RvcmFnZSgpLCBzbGljZV9zaXplID0gY29uZmlnLnNsaWNlU2l6ZTtcbiAgbGV0IGJhY2tlbmQgPSBuZXcgQmFja2VuZCgpO1xuICBsZXQgc2VlZCA9IGxvY2Fsc3RvcmFnZS5nZXQoJ3NlZWQnKTtcbiAgbGV0IHNlZWRfc2xpY2VzID0gW107XG4gIGxldCByYW5kX3NsaWNlO1xuICBsZXQgY29uZmlybSA9ICQoJyNwYXNzcGhyYXNlLWNvbmZpcm0nKTtcbiAgbGV0IHRyeUxvZ2luID0gJCgnI3RyeS1sb2dpbicpO1xuXG4gIGZ1bmN0aW9uIG9uSW5pdCgpe1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCA2OyBpKyspe1xuICAgICAgc2VlZF9zbGljZXMucHVzaChzZWVkLnNsaWNlKHNsaWNlX3NpemUqaSxzbGljZV9zaXplKihpKzEpKSk7XG4gICAgfVxuICAgIHJhbmRfc2xpY2UgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqNik7XG4gICAgdXBkYXRlVmlldygpO1xuXG4gICAgdHJ5TG9naW4ub24oJ2NsaWNrJywgbG9naW4pO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlVmlldygpe1xuICAgIC8vIGNvbmZpcm0uYXR0cigncGxhY2Vob2xkZXInLCdlbnRlciAnK3NsaWNlTmFtZShyYW5kX3NsaWNlKSsnIHdvcmQnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvZ2luKGUpe1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBsZXQgdmFsID0gY29uZmlybS52YWwoKTtcbiAgICBpZih2YWwgPT09IHNlZWQpe1xuICAgICAgY29uZmlybS5yZW1vdmVDbGFzcygnaW52YWxpZCcpO1xuICAgICAgbGV0IGtleXMgPSBKU09OLnBhcnNlKGxvY2Fsc3RvcmFnZS5nZXQoJ2tleXMnKSk7XG4gICAgICAvL21vY2sga2V5cyBmb3IgdGVzdDogLy9UT0RPOiByZW1vdmUgb24gcHJvZHVjdGlvblxuICAgICAga2V5cy5wdWJsaWNfYWRkciA9ICc5dzdVWVVEMzVaUzgyWnNpSHVzNUhlSlFDSmh6SmlNUlpUTFRzQ1lDR2ZVb2FoazVQSnBmS3BQTXZzQmp0ZUUzRVczWG02M3Q0aWJrMWloQmRqWWpabjZLQWpIMm9TdCc7XG4gICAgICBrZXlzLnZpZXcuc2VjID0gJ2M1M2U5NDU2Y2E5OThhYmMxM2NmYzlhNGM4NjhiYmUxNDJlZjAyOThmY2Y2YjU2OWJkZjc5ODZiOWQ1MjUzMDUnO1xuICAgICAga2V5cy5zcGVuZC5zZWMgPSAnMGRhNDFhNDY0ODI2NWU2OTcwMTQxODc1M2I2MTA1NjZhZTA0ZjBiYmVlOGI4MTVlM2U0Yjk5YTY5YTViZDgwZCc7XG5cbiAgICAgIGJhY2tlbmQuY3JlYXRlX3dhbGxldChrZXlzLnB1YmxpY19hZGRyLCBrZXlzLnNwZW5kLnNlYywga2V5cy52aWV3LnNlYykudGhlbigoZGF0YSk9PntcbiAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgIGxvY2Fsc3RvcmFnZS5zZXQoJ3dhbGxldE5hbWUnLCBkYXRhLmRhdGEpO1xuICAgICAgICBsb2NhbHN0b3JhZ2Uuc2V0KCd3YWxsZXRTdGF0dXMnLCduZXcnKTtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAkKHRoaXMpLmF0dHIoJ2hyZWYnKTtcbiAgICAgIH0pLmNhdGNoKChlcnJvcik9PntcbiAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgfSk7XG5cbiAgICB9IGVsc2V7XG4gICAgICBjb25maXJtLmFkZENsYXNzKCdpbnZhbGlkJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2xpY2VOYW1lKGluZGV4KXtcbiAgICBzd2l0Y2goaW5kZXgpe1xuICAgICAgY2FzZSAwOlxuICAgICAgICByZXR1cm4gKGluZGV4KzEpKydzdCc7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJldHVybiAoaW5kZXgrMSkrJ25kJztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIChpbmRleCsxKSsncmQnO1xuICAgICAgZGVmYXVsdDogcmV0dXJuIChpbmRleCsxKSsndGgnO1xuICAgIH1cbiAgfVxuXG4gIG9uSW5pdCgpO1xuXG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMDUvMTAvMTcuXG4gKi9cblxuXG5leHBvcnQgZnVuY3Rpb24gTG9hZGluZyhzZWxlY3RvciwgY2FsbGJhY2spe1xuICBsZXQgbG9hZGVyLCBmbGFnID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gb25Jbml0KCl7XG4gICAgbG9hZGVyID0gJChzZWxlY3Rvcik7XG4gICAgaWYobG9hZGVyLmxlbmd0aCA+IDApe1xuICAgICAgbG9hZGVyLm9uKCdjbGljaycsIG9uQ2xpY2spO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2xpY2soKXtcbiAgICBpZighZmxhZyl7XG4gICAgICBmbGFnID0gdHJ1ZTtcbiAgICAgIGxvYWRlci5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgbG9hZGVyLnRleHQoJ2xvYWRpbmcuLi4nKTtcbiAgICAgIC8vbW9ja1xuICAgICAgbGV0IHAgPSBuZXcgUHJvbWlzZSgocmVzLHJlaikgPT57XG4gICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICByZXMoY2FsbGJhY2spO1xuICAgICAgICB9LCAzMDAwKVxuICAgICAgfSk7XG4gICAgICBwLnRoZW4oKGYpPT57XG4gICAgICAgIGxvYWRlci5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBsb2FkZXIudGV4dCgnbG9hZCBtb3JlJyk7XG4gICAgICAgIGZsYWcgPSBmYWxzZTtcbiAgICAgICAgZigpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgb25Jbml0KCk7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMTAvMTAvMTcuXG4gKi9cblxuXG5leHBvcnQgZnVuY3Rpb24gTG9jYWxTdG9yYWdlKCl7XG4gIGxldCBzZWxmID0gdGhpcztcbiAgbGV0IGxvY2FsU3RvcmFnZTtcbiAgaWYod2luZG93LnNlc3Npb25TdG9yYWdlKSB7XG4gICAgbG9jYWxTdG9yYWdlID0gd2luZG93LnNlc3Npb25TdG9yYWdlO1xuICB9IGVsc2V7XG4gICAgYWxlcnQoJ1lvdXIgYnJvd3NlciBkb25cXCd0IHN1cHBvcnQgc2Vzc2lvblN0b3JhZ2UgLSBwbGVhc2UgdXBkYXRlIHlvdXIgYnJvd3NlciB0byB1c2Ugb3VyIHNlcnZpY2UhJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxldCBhcHBEYXRhID0ge307XG4gIGxldCBsaXN0ID0gWydhY2NvdW50QW5jaG9yJywgJ2tleXMnLCAnc2VlZCcsICdhY2NvdW50VHlwZScsICd3YWxsZXROYW1lJywgJ3R4cycsICd3YWxsZXRTdGF0dXMnXTtcblxuICBmdW5jdGlvbiBvbkluaXQoKXtcbiAgICBjb25zb2xlLmxvZygnbG9jYWwgc3RvcmFnZSBpbml0Jyk7XG4gICAgZ2V0RGF0YUZyb21Mb2NhbFN0b3JhZ2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERhdGFGcm9tTG9jYWxTdG9yYWdlKCl7XG4gICAgbGlzdC5mb3JFYWNoKChwcm9wKT0+e1xuICAgICAgYXBwRGF0YVtwcm9wXSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHByb3ApO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tQcm9wKHByb3Ape1xuICAgIGlmKGxpc3QuaW5kZXhPZihwcm9wKSAhPT0gLTEpe1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHNlbGYuc2V0ID0gZnVuY3Rpb24gKHByb3BfbmFtZSxkYXRhKXtcbiAgICBpZihjaGVja1Byb3AocHJvcF9uYW1lKSl7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShwcm9wX25hbWUsZGF0YSk7XG4gICAgfSBlbHNle1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxvY2Fsc3RvcmFnZSBwcm9wIG5hbWUnKTtcbiAgICB9XG4gIH1cblxuICBzZWxmLmdldCA9IGZ1bmN0aW9uIChwcm9wX25hbWUpe1xuICAgIGlmKGNoZWNrUHJvcChwcm9wX25hbWUpKXtcbiAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShwcm9wX25hbWUpO1xuICAgIH0gZWxzZXtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBsb2NhbHN0b3JhZ2UgcHJvcCBuYW1lJyk7XG4gICAgfVxuICB9XG5cbiAgc2VsZi5jbGVhciA9IGZ1bmN0aW9uICgpe1xuICAgIGxpc3QuZm9yRWFjaCgocHJvcCk9PntcbiAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHByb3ApO1xuICAgIH0pO1xuICB9XG5cbiAgb25Jbml0KCk7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMTIvMTAvMTcuXG4gKi9cbmltcG9ydCB7TG9jYWxTdG9yYWdlfSBmcm9tICcuL2xvY2Fsc3RvcmFnZSc7XG5pbXBvcnQge0JhY2tlbmR9IGZyb20gICcuL2JhY2tlbmQnO1xuXG5leHBvcnQgZnVuY3Rpb24gTG9naW4oKXtcbiAgbGV0IGJhY2tlbmQgPSBuZXcgQmFja2VuZCgpO1xuICAvLyBsZXQgbG9jYWxzdG9yYWdlID0gbmV3IExvY2FsU3RvcmFnZSgpO1xuXG4gIGZ1bmN0aW9uIG9uSW5pdCgpe1xuXG4gIH1cblxuICBsZXQgbG9naW5fYXBwID0gbmV3IFZ1ZSh7XG4gICAgZWw6ICcjbG9naW4tYXBwJyxcblxuICAgIGRhdGE6IHtcbiAgICAgIGtleTogJycsXG4gICAgICBtZXNzYWdlOiAnJ1xuICAgIH0sXG5cbiAgICBjb21wdXRlZDp7XG4gICAgICBwcmV2YWxpZDogZnVuY3Rpb24oKXtcblxuICAgICAgICBsZXQgbGVuZ3RoID0gdGhpcy5rZXkubGVuZ3RoO1xuICAgICAgICBpZihsZW5ndGggPT09IDApIHJldHVybiB0cnVlO1xuXG4gICAgICAgIGxldCBtbmVtb25pY19zaXplID0gdGhpcy5rZXkudHJpbSgpLnNwbGl0KCcgJykubGVuZ3RoO1xuICAgICAgICBjb25zb2xlLmxvZyhsZW5ndGgsIG1uZW1vbmljX3NpemUpO1xuICAgICAgICByZXR1cm4gKGxlbmd0aCA9PT0gMzIgfHwgbW5lbW9uaWNfc2l6ZSA9PT0gMjUgfHwgbW5lbW9uaWNfc2l6ZSA9PT0gMTMpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBtZXRob2RzOiB7XG4gICAgICB0cnlMb2dpbjogZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBjb25zb2xlLmxvZyhldmVudCwgdGhpcy5rZXksIHRoaXMucHJldmFsaWQpO1xuXG4gICAgICAgIGxldCBzZWVkLCBrZXlzO1xuXG4gICAgICAgIHN3aXRjaCh0aGlzLmRldGVjdEtleVR5cGUoKSl7XG4gICAgICAgICAgY2FzZSAnc2VlZCc6XG4gICAgICAgICAgICBzZWVkID0gdGhpcy5rZXk7XG4gICAgICAgICAgICBrZXlzID0gdGhpcy5wYXJzZVNlZWQoc2VlZCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhrZXlzKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ21vbmVybyc6XG4gICAgICAgICAgY2FzZSAnbXltb25lcm8nOlxuICAgICAgICAgICAgc2VlZCA9IHRoaXMuZGVjb2RlTW5lbW9uaWModGhpcy5rZXkpO1xuICAgICAgICAgICAga2V5cyA9IHRoaXMucGFyc2VTZWVkKHNlZWQpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coa2V5cyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OiB0aGlzLm1lc3NhZ2UgPSAnVW5rbm93biBwcml2YXRlIGtleSB0eXBlJztcbiAgICAgICAgfVxuICAgICAgICBpZigha2V5cykgcmV0dXJuO1xuXG4gICAgICAgIC8vVE9ETzogbW9jayB0ZXN0bmV0IGxvZ2luIGRhdGFcbiAgICAgICAga2V5cy5wdWJsaWNfYWRkciA9ICc5dzdVWVVEMzVaUzgyWnNpSHVzNUhlSlFDSmh6SmlNUlpUTFRzQ1lDR2ZVb2FoazVQSnBmS3BQTXZzQmp0ZUUzRVczWG02M3Q0aWJrMWloQmRqWWpabjZLQWpIMm9TdCc7XG4gICAgICAgIGtleXMudmlldy5zZWMgPSAnYzUzZTk0NTZjYTk5OGFiYzEzY2ZjOWE0Yzg2OGJiZTE0MmVmMDI5OGZjZjZiNTY5YmRmNzk4NmI5ZDUyNTMwNSc7XG4gICAgICAgIGtleXMuc3BlbmQuc2VjID0gJzBkYTQxYTQ2NDgyNjVlNjk3MDE0MTg3NTNiNjEwNTY2YWUwNGYwYmJlZThiODE1ZTNlNGI5OWE2OWE1YmQ4MGQnO1xuXG4gICAgICAgIGJhY2tlbmRcbiAgICAgICAgICAubG9naW4oa2V5cy5wdWJsaWNfYWRkciwga2V5cy52aWV3LnNlYylcbiAgICAgICAgICAudGhlbigoZGF0YSk9PntcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgaWYoZGF0YS5zdGF0dXMgPT09ICdzdWNjZXNzJyl7XG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJy9hY2NvdW50Lmh0bWwnO1xuICAgICAgICAgICAgICBBUFAubG9jYWxzdG9yYWdlLnNldCgna2V5cycsIGtleXMpO1xuICAgICAgICAgICAgfSBlbHNle1xuICAgICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSAnQ2FuXFwndCBsb2dpbic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goKGUpPT57XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBiYWNrZW5kLmNyZWF0ZV93YWxsZXQoa2V5cy5wdWJsaWNfYWRkciwga2V5cy5zcGVuZC5zZWMsIGtleXMudmlldy5zZWMpLnRoZW4oKGRhdGEpPT57XG4gICAgICAgIC8vICAgaWYoZGF0YS5lcnJvcil7XG4gICAgICAgIC8vICAgICB0aGlzLm1lc3NhZ2UgPSAnQ2Fubm90IGNyZWF0ZSB3YWxsZXQgd2l0aCBhZGRyZXNzOiAnK2tleXMucHVibGljX2FkZHI7XG4gICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAvLyAgIGxvY2Fsc3RvcmFnZS5zZXQoJ3NlZWQnLCBzZWVkKTtcbiAgICAgICAgLy8gICBsb2NhbHN0b3JhZ2Uuc2V0KCdrZXlzJywgSlNPTi5zdHJpbmdpZnkoa2V5cykpO1xuICAgICAgICAvLyAgIGxvY2Fsc3RvcmFnZS5zZXQoJ3dhbGxldE5hbWUnLCBkYXRhLmRhdGEpO1xuICAgICAgICAvLyAgIGxldCBzdGF0dXMgPSBsb2NhbHN0b3JhZ2UuZ2V0KCd3YWxsZXRTdGF0dXMnKTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICBpZihzdGF0dXMgIT09ICdpbXBvcnRlZCcpe1xuICAgICAgICAvLyAgICAgbG9jYWxzdG9yYWdlLnNldCgnd2FsbGV0U3RhdHVzJywgJ2V4aXN0Jyk7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvL1xuICAgICAgICAvL1xuICAgICAgICAvLyAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJy9hY2NvdW50Lmh0bWwnO1xuICAgICAgICAvLyB9KS5jYXRjaCgoZXJyb3IpPT57XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAvLyB9KTtcblxuXG4gICAgICB9LFxuXG4gICAgICBkZXRlY3RLZXlUeXBlOiBmdW5jdGlvbigpe1xuICAgICAgICBsZXQgbW5lbW9uaWNfc2l6ZSA9IHRoaXMua2V5LnRyaW0oKS5zcGxpdCgnICcpLmxlbmd0aDtcbiAgICAgICAgaWYodGhpcy5rZXkubGVuZ3RoID09PSAzMikgcmV0dXJuICdzZWVkJztcbiAgICAgICAgaWYobW5lbW9uaWNfc2l6ZSA9PT0gMjUpIHJldHVybiAnbW9uZXJvJztcbiAgICAgICAgaWYobW5lbW9uaWNfc2l6ZSA9PT0gMTMpIHJldHVybiAnbXltb25lcm8nO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuXG4gICAgICBwYXJzZVNlZWQ6IGZ1bmN0aW9uKHNlZWQpe1xuICAgICAgICBsZXQga2V5cztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBrZXlzID0gY25VdGlsLmNyZWF0ZV9hZGRyZXNzKHNlZWQpO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgIHRoaXMubWVzc2FnZSA9ICdJbnZhbGlkIHByaXZhdGUga2V5ISc7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2ludmFsaWQgc2VlZCEnLGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfSxcblxuICAgICAgZGVjb2RlTW5lbW9uaWM6IGZ1bmN0aW9uKG1uZW1vbmljKXtcbiAgICAgICAgbGV0IHNlZWQ7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgIHNlZWQgPSBtbl9kZWNvZGUobW5lbW9uaWMpO1xuICAgICAgICB9Y2F0Y2goZSl7XG4gICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VlZCA9IG1uX2RlY29kZShtbmVtb25pYywgXCJlbGVjdHJ1bVwiKTtcbiAgICAgICAgICB9IGNhdGNoKGVlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVlKTtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9ICdDYW5ub3QgZGVjb2RlIG1uZW1vbmljJztcbiAgICAgICAgICAgIC8vIHRocm93IFtlLGVlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgICB9XG5cbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGRldGVjdExvZ2luVHlwZSh2YWx1ZSkge1xuICAgIGxldCBtbmVtb25pYyA9IHZhbHVlLnRyaW0oKS5zcGxpdCgnICcpO1xuXG4gICAgaWYobW5lbW9uaWMubGVuZ3RoID4gMSl7XG4gICAgICBzd2l0Y2gobW5lbW9uaWMubGVuZ3RoKXtcbiAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICBjb25zb2xlLmxvZygnc2hvcnQgbW5lbW9uaWMnKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyNDpcbiAgICAgICAgICBjb25zb2xlLmxvZygnbG9uZyBtbmVtb25pYycpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI1OlxuICAgICAgICAgIGNvbnNvbGUubG9nKCdsb25nIG1uZW1vbmljJyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcigndW5rbm93biBsb2dpbiB0eXBlOicgKyB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgb25Jbml0KCk7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMTAvMTAvMTcuXG4gKi9cblxuXG5leHBvcnQgZnVuY3Rpb24gUHJlbGluayhzZWxlY3RvciwgYWN0aW9uKXtcbiAgbGV0IGxpbmtzO1xuXG4gIGZ1bmN0aW9uIG9uSW5pdCgpe1xuICAgIGxpbmtzID0gJChzZWxlY3Rvcik7XG4gICAgaWYobGlua3MubGVuZ3RoID4gMCl7XG4gICAgICBsaW5rcy5vbignY2xpY2snLCBvbkNsaWNrKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvbkNsaWNrKGUpe1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBsZXQgZGF0YSA9ICQodGhpcykuYXR0cignZGF0YS1wcmVsaW5rJyk7XG4gICAgbGV0IGhyZWYgPSAkKHRoaXMpLmF0dHIoJ2hyZWYnKTtcbiAgICBhY3Rpb24oZGF0YSk7XG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBocmVmO1xuICB9XG5cbiAgb25Jbml0KCk7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMDUvMTAvMTcuXG4gKi9cblxuXG5leHBvcnQgZnVuY3Rpb24gUVIoc2VsZWN0b3IsIGlucHV0KXtcbiAgbGV0IHFyLCBjb250YWluZXI7XG4gIGZ1bmN0aW9uIG9uSW5pdCgpe1xuICAgIGNvbnRhaW5lciA9ICQoc2VsZWN0b3IpO1xuICAgIGlmKGNvbnRhaW5lci5sZW5ndGggPiAwKXtcbiAgICAgIHFyID0gbmV3IFFSaW91cyh7dmFsdWU6ICQoaW5wdXQpLnZhbCgpLCBzaXplOiAxODAsIHBhZGRpbmc6IDB9KTtcbiAgICAgIGNvbnRhaW5lci5hdHRyKCdzcmMnLCBxci50b0RhdGFVUkwoKSk7XG4gICAgfVxuICB9XG4gIG9uSW5pdCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gVG9nZ2xlUVIoc2VsZWN0b3IsIGZyb20pe1xuICBsZXQgcXIsIHRyaWdnZXIsIHZhbCwgcXJpbWFnZSwgc3RhdGUgPSAndGV4dCc7XG4gIGZ1bmN0aW9uIG9uSW5pdCgpe1xuICAgIHRyaWdnZXIgPSAkKHNlbGVjdG9yKTtcbiAgICBpZih0cmlnZ2VyLmxlbmd0aCA+IDApe1xuICAgICAgcXJpbWFnZSA9ICQoJyNxcmltYWdlJyk7XG4gICAgICBxciA9IG5ldyBRUmlvdXMoe3ZhbHVlOiAkKGZyb20pLnZhbCgpLCBzaXplOiAxODAsIHBhZGRpbmc6IDB9KTtcbiAgICAgIHFyaW1hZ2UuYXR0cignc3JjJywgcXIudG9EYXRhVVJMKCkpO1xuICAgICAgdHJpZ2dlci5vbignY2xpY2snLCBvbkNsaWNrKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvbkNsaWNrKCl7XG4gICAgcXJpbWFnZS50b2dnbGVDbGFzcygndmlzaWJsZScpO1xuICAgIGlmKHN0YXRlID09PSAncXInKXtcbiAgICAgIHN0YXRlID0gJ3RleHQnO1xuICAgICAgdHJpZ2dlci5hdHRyKCdzcmMnLCdpbWcvc3ZnL3FyLnN2ZycpO1xuICAgIH0gZWxzZXtcbiAgICAgIHRyaWdnZXIuYXR0cignc3JjJywnaW1nL3N2Zy9leWUuc3ZnJyk7XG4gICAgICBzdGF0ZSA9ICdxcic7XG4gICAgfVxuICB9XG5cbiAgb25Jbml0KCk7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMDYvMTAvMTcuXG4gKi9cblxuXG5leHBvcnQgZnVuY3Rpb24gU3Vic2NyaWJlKCl7XG4gIGxldCBmb3JtLCB0cmlnZ2VyLCBjbG9zZTtcblxuICBmdW5jdGlvbiBvbkluaXQoKXtcbiAgICB0cmlnZ2VyID0gJCgnI3N1YnNjcmliZS10cmlnZ2VyJyk7XG4gICAgaWYodHJpZ2dlci5sZW5ndGggPiAwKXtcbiAgICAgIGZvcm0gPSAkKCcjc3Vic2NyaWJlLWJsb2NrJyk7XG4gICAgICBjbG9zZSA9ICQoJy5zdWJzY3JpYmUtY2xvc2UnKTtcbiAgICAgIHRyaWdnZXIub24oJ2NsaWNrJywgb25UcmlnZ2VyQ2xpY2spO1xuICAgICAgY2xvc2Uub24oJ2NsaWNrJywgb25DbG9zZUNsaWNrKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvblRyaWdnZXJDbGljaygpe1xuICAgIHRyaWdnZXIuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgIGZvcm0ucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25DbG9zZUNsaWNrKCl7XG4gICAgZm9ybS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgdHJpZ2dlci5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gIH1cblxuICBvbkluaXQoKTtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYWx0aW5nZmVzdCBvbiAwNS8xMC8xNy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFRhYnMoc2VsZWN0b3IsIGhhc2hzdGF0ZXMpe1xuICBsZXQgY29udGFpbmVyLCBsYWJlbHMsIHRhYnM7XG4gIGxldCBjb3VudCwgY3VycmVudCwgaGFzaDtcbiAgbGV0IGhhc2hfc3RhdGVzID0gIGhhc2hzdGF0ZXM/IE9iamVjdC5hc3NpZ24oe30saGFzaHN0YXRlcykgOiBudWxsO1xuICBmdW5jdGlvbiBpbml0Q3VycmVudChoYXNoKXtcbiAgICBpZihoYXNoX3N0YXRlcyAhPT0gbnVsbCl7XG4gICAgICBmb3IobGV0IHByb3AgaW4gaGFzaF9zdGF0ZXMpe1xuICAgICAgICBpZihwcm9wID09PSBoYXNoKXtcbiAgICAgICAgICBjdXJyZW50ID0gaGFzaF9zdGF0ZXNbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2V7XG4gICAgICBjdXJyZW50ID0gMDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbml0KCl7XG4gICAgY29uc29sZS5sb2coJ2luIHRhYnMnKTtcbiAgICBoYXNoID0gd2luZG93LkFQUC5sb2NhbHN0b3JhZ2UuZ2V0KCdhY2NvdW50QW5jaG9yJyk7XG4gICAgaWYoIWhhc2gpe1xuICAgICAgaGFzaCA9ICd3YWxsZXQnO1xuICAgIH1cbiAgICBjb250YWluZXIgID0gJChzZWxlY3Rvcik7XG5cbiAgICBpZihjb250YWluZXIubGVuZ3RoID4gMCl7XG4gICAgICBsYWJlbHMgPSBjb250YWluZXIuZmluZCgnW2RhdGEtdGFiLWxhYmVsLWluZGV4XScpO1xuICAgICAgdGFicyA9IGNvbnRhaW5lci5maW5kKCdbZGF0YS10YWItaW5kZXhdJyk7XG4gICAgICBpbml0Q3VycmVudChoYXNoKTtcbiAgICAgIGNvdW50ID0gbGFiZWxzLmxlbmd0aDtcbiAgICAgIGluaXRMaXN0ZW5lcnMoKTtcbiAgICAgIHVwZGF0ZSgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXRMaXN0ZW5lcnMoKXtcbiAgICBsYWJlbHMub24oJ2NsaWNrJywgb25MYWJlbENsaWNrKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uTGFiZWxDbGljaygpe1xuICAgIGxldCBwcmV2ID0gY3VycmVudDtcbiAgICBjdXJyZW50ID0gJCh0aGlzKS5hdHRyKCdkYXRhLXRhYi1sYWJlbC1pbmRleCcpO1xuICAgIGlmKGN1cnJlbnQgIT09IHByZXYpe1xuICAgICAgdXBkYXRlKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKCl7XG4gICAgbGFiZWxzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICBsYWJlbHMuZXEoY3VycmVudCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIHRhYnMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIHRhYnMuZXEoY3VycmVudCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICB9XG5cblxuICBpbml0KCk7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMDYvMTAvMTcuXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIFRvb2x0aXAoc2VsZWN0b3IsIGF0dHIsIGdldERhdGEsIGNhbGxiYWNrKXsgLy9nZXREYXRhIC0gcmV0dXJuIHByb21pc2VcbiAgbGV0IGRhdGEsIGVsZW1lbnRzLCB0b29sdGlwLCBjbG9zZTtcblxuICBmdW5jdGlvbiBvbkluaXQoKXtcbiAgICBlbGVtZW50cyA9ICQoc2VsZWN0b3IpO1xuICAgIGlmKGVsZW1lbnRzLmxlbmd0aCA+IDApe1xuICAgICAgdG9vbHRpcCA9ICQoJyN0b29sdGlwJyk7XG4gICAgICBjbG9zZSA9IHRvb2x0aXAuZmluZCgnLnRvb2x0aXBfX2Nsb3NlJyk7XG5cbiAgICAgIGVsZW1lbnRzLm9uKCdjbGljaycsIG9uQ2xpY2tXaXRoVGltZW91dCk7XG4gICAgICBjbG9zZS5vbignY2xpY2snLCBoaWRlVG9vbHRpcCk7XG5cbiAgICAgIHRvb2x0aXAub24oJ2NsaWNrJywoZSk9PntcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2xpY2tXaXRoVGltZW91dChlKXtcbiAgICBzZXRUaW1lb3V0KG9uQ2xpY2suYmluZCh0aGlzLGUpLDEwMCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNsaWNrKGUpIHtcblxuICAgIGxldCBzZWxmID0gJCh0aGlzKTtcbiAgICBsZXQgaWQgPSBzZWxmLmF0dHIoYXR0cik7XG4gICAgbGV0IHcgPSB0b29sdGlwLndpZHRoKCk7XG4gICAgbGV0IGRpc3BsYWNlWCA9ICQod2luZG93KS53aWR0aCgpIC0gdyAtIGUuY2xpZW50WDtcbiAgICAvLyBjb25zb2xlLmxvZyhkaXNwbGFjZVgpO1xuICAgIGNvbnNvbGUubG9nKGlkKTtcbiAgICBkaXNwbGFjZVggPSBkaXNwbGFjZVggPiAwID8gMCA6IGRpc3BsYWNlWCAtIDIwO1xuXG4gICAgZ2V0RGF0YShpZCkudGhlbigodHgpPT57XG4gICAgICAvLyBjb25zb2xlLmxvZyh0eCk7XG4gICAgICBsZXQgZGV0YWlscyA9IEpTT04ucGFyc2UodHgudHhzX2FzX2pzb25bMF0pO1xuICAgICAgY2FsbGJhY2soaWQsIGRldGFpbHMpO1xuICAgICAgY29uc29sZS5sb2coZGV0YWlscyk7XG4gICAgICAvLyBsZXQgbWl4aW4gPSBkZXRhaWxzLnJjdHNpZ19wcnVuYWJsZS5NR3NbMF0uc3MubGVuZ3RoIC0gMTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKG1peGluKTtcbiAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLGUucGFnZVkrJ3B4Jyk7XG4gICAgICB0b29sdGlwLmNzcygnbGVmdCcsKGUuY2xpZW50WCArIGRpc3BsYWNlWCkrJ3B4Jyk7XG4gICAgICB0b29sdGlwLmFkZENsYXNzKCd2aXNpYmxlJyk7XG4gICAgICBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2snLCBjbG9zZUJ5QW55Q2xpY2tPdXRzaWRlKTtcbiAgICAgIH0sNTAwKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsb3NlQnlBbnlDbGlja091dHNpZGUoZSkge1xuICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIGlmIChlLnRhcmdldCAhPT0gdG9vbHRpcCkge1xuICAgICAgaGlkZVRvb2x0aXAoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlVG9vbHRpcCgpe1xuICAgIHRvb2x0aXAucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAkKCdib2R5Jykub2ZmKCdjbGljaycsIGNsb3NlQnlBbnlDbGlja091dHNpZGUpO1xuICB9XG5cbiAgdGhpcy5yZWluaXQgPSBmdW5jdGlvbigpe1xuICAgIG9uSW5pdCgpO1xuICB9XG5cbiAgb25Jbml0KCk7XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMTYvMTAvMTcuXG4gKi9cblxuXG5leHBvcnQgZnVuY3Rpb24gVHJhbnNhY3Rpb24oKXtcblxuICBmdW5jdGlvbiB0eXBlVHJhbnNsYXRlKHR5cGUpe1xuICAgIHN3aXRjaCh0eXBlKXtcbiAgICAgIGNhc2UgJ2luJzogcmV0dXJuICdJbmNvbWluZyc7XG4gICAgICBjYXNlICdvdXQnOiByZXR1cm4gJ1NwZW50JztcbiAgICAgIGNhc2UgJ3BlbmRpbmcnOiByZXR1cm4gJ3BlbmRpbmcnO1xuICAgICAgY2FzZSAncG9vbCc6IHJldHVybiAnUG9vbCc7XG4gICAgICBjYXNlICdmYWlsZWQnOiByZXR1cm4gJ0ZhaWxlZCc7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gdHJhbnNhY3Rpb24gdHlwZTogJyt0eXBlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXQodmFsKXtcbiAgICByZXR1cm4gdmFsIDwgMTA/ICcwJyt2YWwudG9TdHJpbmcoKSA6IHZhbC50b1N0cmluZygpO1xuICB9XG5cbiAgZnVuY3Rpb24gdG9UaW1lKGR0KXtcbiAgICByZXR1cm4gW2R0LmdldEhvdXJzKCksIGR0LmdldE1pbnV0ZXMoKSwgZHQuZ2V0U2Vjb25kcygpXS5tYXAoZm9ybWF0KS5qb2luKCc6Jyk7XG4gIH1cblxuICBmdW5jdGlvbiB0b0RhdGUoZHQpe1xuICAgIHJldHVybiBbZHQuZ2V0RGF0ZSgpLCBkdC5nZXRNb250aCgpKzEsIGR0LmdldEZ1bGxZZWFyKCldLm1hcChmb3JtYXQpLmpvaW4oJy4nKTtcbiAgfVxuXG4gIHRoaXMuZ2VuZXJhdGVUYWJsZVJvdyA9IGZ1bmN0aW9uKHR4LCBwcmljZV91c2Qpe1xuXG4gICAgbGV0IHR5cGUgPSB0eXBlVHJhbnNsYXRlKHR4LnR5cGUpO1xuICAgIGxldCBkdCA9IG5ldyBEYXRlKHR4LnRpbWVzdGFtcCoxMDAwKTtcbiAgICBsZXQgZGF0ZSA9IHRvRGF0ZShkdCk7XG4gICAgbGV0IHRpbWUgPSB0b1RpbWUoZHQpO1xuICAgIGxldCBhbW91bnQgPSBNYXRoLnJvdW5kKHR4LmFtb3VudC8xMDAwMDAwMDAwKS8xMDAwO1xuICAgIGxldCB1c2QgPSBNYXRoLnJvdW5kKGFtb3VudCpwcmljZV91c2QpO1xuICAgIGxldCB0ZW1wbGF0ZSA9IGBcbiAgICAgIDx0ZD4ke3R5cGV9PC90ZD5cbiAgICAgIDx0ZD5cbiAgICAgICAgPGRpdiBjbGFzcz1cInRyYW5zYWN0aW9ucy10YWJsZV9feG1yIGJvbGRcIj4ke2Ftb3VudH0gWE1SPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJ0cmFuc2FjdGlvbnMtdGFibGVfX3VzZFwiPiR7dXNkfSBVU0Q8L2Rpdj5cbiAgICAgIDwvdGQ+XG4gICAgICA8dGQ+JHt0eC5wYXltZW50X2lkfTwvdGQ+XG4gICAgICA8dGQ+JHtkYXRlfTwvdGQ+XG4gICAgICA8dGQgZGF0YS10cmFuc2FjdGlvbi1pZD1cIiR7dHgudHhpZH1cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInRyYW5zYWN0aW9ucy10YWJsZV9fdGltZVwiPiR7dGltZX08L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInRyYW5zYWN0aW9ucy10YWJsZV9fZGV0YWlsc1wiPmRldGFpbHM8L2Rpdj5cbiAgICAgIDwvdGQ+XG4gICAgYDtcbiAgICBsZXQgdHIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgIHRyLmlubmVySFRNTCA9IHRlbXBsYXRlO1xuICAgIHRyLmNsYXNzTmFtZSA9IFwidHItZ2VuZXJhdGVkXCI7XG4gICAgcmV0dXJuIHRyO1xuICB9XG5cbiAgdGhpcy5jb21wYXJlID0gZnVuY3Rpb24odHgxLCB0eDIpe1xuICAgIHJldHVybiB0eDEudHhpZCA9PT0gdHgyLnR4aWQ7XG4gIH07XG5cbiAgdGhpcy5kYXRldGltZSA9IGZ1bmN0aW9uKHR4KXtcbiAgICBsZXQgZHQgPSBuZXcgRGF0ZSh0eC50aW1lc3RhbXAqMTAwMCk7XG4gICAgcmV0dXJuIHtkYXRlOiB0b0RhdGUoZHQpLCB0aW1lOiB0b1RpbWUoZHQpfTtcbiAgfTtcblxuICAvLyB0aGlzLmZpbmRSZXN0b3JIZWlnaHQgPSBmdW5jdGlvbih0eHMpe1xuICAvLyAgIGxldCBvdXQgPSAgdHhzXG4gIC8vICAgICAuZmlsdGVyKCh0eCk9PntcbiAgLy8gICAgICAgcmV0dXJuIHR4LnR5cGUgPT09ICdvdXQnO1xuICAvLyAgICAgfSkuc29ydCgodHgxLHR4Mik9PntcbiAgLy8gICAgICAgcmV0dXJuIHR4MS50aW1lc3RhbXAgLSB0eDIudGltZXN0YW1wO1xuICAvLyAgICAgfSk7XG4gIC8vIH07XG59IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGFsdGluZ2Zlc3Qgb24gMDUvMTAvMTcuXG4gKi9cblxuXG5leHBvcnQgZnVuY3Rpb24gVmFsaWRhdG9yKHRyaWcsIHRhcmdldCwgY2FsbGJhY2spe1xuICBsZXQgY29udGFpbmVyLCBlbGVtZW50cywgdHJpZ2dlcjtcblxuICBmdW5jdGlvbiBvbkluaXQoKXtcbiAgICB0cmlnZ2VyID0gJCh0cmlnKTtcbiAgICBpZih0cmlnZ2VyLmxlbmd0aCA+IDApe1xuICAgICAgY29udGFpbmVyID0gJCh0YXJnZXQpO1xuICAgICAgZWxlbWVudHMgPSBjb250YWluZXIuZmluZCgnW2RhdGEtdmQtdHlwZV0nKTtcbiAgICAgIHRyaWdnZXIub24oJ2NsaWNrJywgb25DbGljayk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25DbGljayhldmVudCl7XG4gICAgbGV0IHZhbGlkID0gdHJ1ZTtcbiAgICBlbGVtZW50cy5lYWNoKChpbmRleCxlbCk9PntcbiAgICAgIGxldCBqRWwgPSAkKGVsKTtcbiAgICAgIGxldCB0eXBlID0gakVsLmF0dHIoJ2RhdGEtdmQtdHlwZScpO1xuICAgICAgbGV0IHZhbCA9IGpFbC52YWwoKTtcbiAgICAgIGlmKHZhbGlkYXRlKHZhbCx0eXBlKSl7XG4gICAgICAgIGpFbC5yZW1vdmVDbGFzcygnaW52YWxpZCcpO1xuICAgICAgfSBlbHNle1xuICAgICAgICB2YWxpZCA9IGZhbHNlO1xuICAgICAgICBqRWwuYWRkQ2xhc3MoJ2ludmFsaWQnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZighdmFsaWQpe1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9IGVsc2V7XG4gICAgICBpZihjYWxsYmFjayl7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGUodmFsLCB0eXBlKXtcbiAgICBzd2l0Y2godHlwZSl7XG4gICAgICBjYXNlICdyZXF1aXJlZCc6XG4gICAgICAgIHJldHVybiB2YWwubGVuZ3RoID4gMDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICBsZXQgcmVfbnVtYmVyID0gL15bKy1dP1xcZCsoXFwuXFxkKyk/JC87XG4gICAgICAgIHJldHVybiByZV9udW1iZXIudGVzdCh2YWwpO1xuICAgICAgY2FzZSAnZW1haWwnOlxuICAgICAgICBsZXQgcmVfZW1haWwgPSAvLitcXEAuK1xcLi4rLztcbiAgICAgICAgcmV0dXJuIHJlX2VtYWlsLnRlc3QodmFsKTtcbiAgICB9XG4gIH1cblxuICBvbkluaXQoKTtcbn0iLCIvKipcbiAqIENyZWF0ZWQgYnkgYWx0aW5nZmVzdCBvbiAxMS8xMC8xNy5cbiAqL1xuaW1wb3J0IHtMb2NhbFN0b3JhZ2V9IGZyb20gJy4vbG9jYWxzdG9yYWdlJztcblxuZXhwb3J0IGZ1bmN0aW9uIFdhbGxldEdlbmVyYXRvcigpe1xuICBsZXQgc2VlZCA9IGNuVXRpbC5yYW5kXzE2KCksIHNsaWNlX3NpemUgPSBjb25maWcuc2xpY2VTaXplO1xuICBsZXQgc2VlZF9zbGljZXMgPSBbXTtcbiAgbGV0IGtleXMgPSBjblV0aWwuY3JlYXRlX2FkZHJlc3Moc2VlZCk7XG4gIGxldCBsb2NhbHN0b3JhZ2UgPSBuZXcgTG9jYWxTdG9yYWdlKCk7XG5cbiAgZnVuY3Rpb24gb25Jbml0KCl7XG4gICAgLy8gY29uc29sZS5sb2coJ3dhbGxldCBnZW5lcmF0b3IgaW5pdCcsICdzZWVkOicgKyBzZWVkKTtcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgNjsgaSsrKXtcbiAgICAgIHNlZWRfc2xpY2VzLnB1c2goc2VlZC5zbGljZShzbGljZV9zaXplKmksc2xpY2Vfc2l6ZSooaSsxKSkpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhzZWVkLmxlbmd0aCk7XG4gICAgLy8gY29uc29sZS5sb2coc2VlZF9zbGljZXMpO1xuICAgIC8vIGNvbnNvbGUubG9nKHNlZWQgPT0gc2VlZF9zbGljZXMuam9pbignJykpO1xuICAgIGxvY2Fsc3RvcmFnZS5zZXQoJ2tleXMnLCBKU09OLnN0cmluZ2lmeShrZXlzKSk7XG4gICAgbG9jYWxzdG9yYWdlLnNldCgnc2VlZCcsIHNlZWQpO1xuICAgIC8vIGNvbnNvbGUubG9nKGxvY2Fsc3RvcmFnZS5nZXQoJ2tleXMnKSk7XG4gICAgdXBkYXRlVmlldygpO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlVmlldygpe1xuICAgIGxldCBjb3B5X2lucHV0ID0gJCgnI3Bhc3NwaHJhc2UtZGF0YScpO1xuICAgIGNvcHlfaW5wdXQudmFsKHNlZWQpO1xuICAgIGxldCBwYXNzcGhyYXNlID0gJCgnLnBhc3NwaHJhc2VfX2l0ZW0tY29udGVudCcpO1xuICAgIHBhc3NwaHJhc2UuZWFjaCgoaW5kZXgsIGVsKT0+e1xuICAgICAgJChlbCkudGV4dChzZWVkX3NsaWNlc1tpbmRleF0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25Jbml0KCk7XG59IiwiaW1wb3J0IHtBY2NvdW50fSBmcm9tICcuL2NvbXBvbmVudHMvYWNjb3VudCc7XG5pbXBvcnQge1ZhbGlkYXRvcn0gZnJvbSAnLi9jb21wb25lbnRzL3ZhbGlkYXRvcic7XG5pbXBvcnQge1N1YnNjcmliZX0gZnJvbSAnLi9jb21wb25lbnRzL3N1YnNjcmliZSc7XG5pbXBvcnQge0xvY2FsU3RvcmFnZX0gZnJvbSAnLi9jb21wb25lbnRzL2xvY2Fsc3RvcmFnZSc7XG5pbXBvcnQge1ByZWxpbmt9IGZyb20gJy4vY29tcG9uZW50cy9wcmVsaW5rJztcbmltcG9ydCB7Q29weX0gZnJvbSAnLi9jb21wb25lbnRzL2NvcHknO1xuaW1wb3J0IHtXYWxsZXRHZW5lcmF0b3J9IGZyb20gJy4vY29tcG9uZW50cy93YWxsZXQtZ2VuZXJhdG9yJztcbmltcG9ydCB7ZmluaXNoUmVnaXN0cmF0aW9ufSBmcm9tICcuL2NvbXBvbmVudHMvZmluaXNoLXJlZ2lzdHJhdGlvbic7XG5pbXBvcnQge0xvZ2lufSBmcm9tICcuL2NvbXBvbmVudHMvbG9naW4nO1xuaW1wb3J0IHtCYWNrZW5kfSBmcm9tICcuL2NvbXBvbmVudHMvYmFja2VuZCc7XG5cbiQoZnVuY3Rpb24oKSB7XG4gIHdpbmRvdy5BUFAgPSBuZXcgQXBwKCk7XG4gIGNvbnNvbGUubG9nKEFQUCk7XG4gIHdpbmRvdy5BUFAuaW5pdCgpO1xufSk7XG5cbmZ1bmN0aW9uIEFwcCgpe1xuICBzZWxmID0gdGhpcztcblxuICBsZXQgc3RhdGUgPSAnZGVmYXVsdCc7XG4gIHNlbGYubG9jYWxzdG9yYWdlID0gbmV3IExvY2FsU3RvcmFnZSgpO1xuXG4gIGZ1bmN0aW9uIHRvU3RhdGUoc3RhdGUpe1xuICAgIHN3aXRjaChzdGF0ZSl7XG4gICAgICBjYXNlICdhY2NvdW50JzpcbiAgICAgICAgaWYoIXNlbGYubG9jYWxzdG9yYWdlLmdldCgna2V5cycpKXtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvJztcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaW5pdEFjY291bnQoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyZWcxJzpcbiAgICAgICAgaW5pdFJlZ2lzdHJhdGlvbjEoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyZWcyJzpcbiAgICAgICAgaW5pdFJlZ2lzdHJhdGlvbjIoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdsb2dpbic6XG4gICAgICAgIGluaXRMb2dpbigpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21haW4nOlxuICAgICAgICBpbml0TWFpbigpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvbnRhY3RzJzpcbiAgICAgICAgaW5pdENvbnRhY3RzKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDogYnJlYWs7XG5cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkZXRlY3RTdGF0ZSgpe1xuICAgIGxldCByZXMgPSBzdGF0ZTtcbiAgICBsZXQgdCA9ICQoJyNhcHAtc3RhdGUnKTtcbiAgICBpZih0Lmxlbmd0aCA9PT0gMSl7XG4gICAgICByZXMgPSB0LmF0dHIoJ2RhdGEtYXBwLXN0YXRlJyk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBmdW5jdGlvbiBpbml0TWFpbigpe1xuXG4gICAgbmV3IFN1YnNjcmliZSgpO1xuICAgIG5ldyBWYWxpZGF0b3IoJyN0cnktc3Vic2NyaWJlJywnI3N1YnNjcmliZS1ibG9jaycpO1xuXG4gICAgbGV0IGJhY2tlbmQgPSBuZXcgQmFja2VuZCgpO1xuICAgIGJhY2tlbmQuZ2V0X21vbmVyb19wcmljZSgpXG4gICAgICAudGhlbigoZGF0YSk9PntcbiAgICAgICAgY29uc29sZS5sb2coJ2dldCBtb25lcm8gcHJpY2UgZnJvbSBtYWluJywgZGF0YSk7XG4gICAgICAgICQoJyN4bXJ1c2QnKS50ZXh0KHJvdW5kKGRhdGFbMF0ucHJpY2VfdXNkLDIpKTtcbiAgICAgICAgJCgnI3htcmJ0YycpLnRleHQocm91bmQoZGF0YVswXS5wcmljZV9idGMsMikpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpPT57XG4gICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgIH0pO1xuICAgIC8vIG5ldyBQcmVsaW5rKCcuYWNjb3VudC1hbmNob3InLCAoZGF0YSk9PntcbiAgICAvLyAgIHNlbGYubG9jYWxzdG9yYWdlLnNldCgnYWNjb3VudEFuY2hvcicsZGF0YSk7XG4gICAgLy8gfSk7XG4gICAgLy9cbiAgICAvLyBuZXcgUHJlbGluaygnLmFjY291bnQtdHlwZScsIChkYXRhKT0+e1xuICAgIC8vICAgc2VsZi5sb2NhbHN0b3JhZ2Uuc2V0KCdhY2NvdW50VHlwZScsZGF0YSk7XG4gICAgLy8gfSk7XG4gIH1cblxuICBmdW5jdGlvbiBpbml0Q29udGFjdHMoKXtcbiAgICBsZXQgYmFja2VuZCA9IEJhY2tlbmQoKTtcbiAgICBuZXcgVnVlKHtcbiAgICAgIGVsOiAnI2NvbnRhY3QtZm9ybScsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIG5hbWU6ICcnLFxuICAgICAgICBlbWFpbDogJycsXG4gICAgICAgIG1lc3NhZ2U6ICcnLFxuICAgICAgICBzdGF0dXM6ICdTZW5kJyxcblxuICAgICAgfSxcbiAgICAgIGNvbXB1dGVkOiB7XG4gICAgICAgIGlzVmFsaWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBtZXRob2RzOntcbiAgICAgICAgc2VuZDogZnVuY3Rpb24oKXtcbiAgICAgICAgICBsZXQgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgYmFja2VuZC5xdWVzdGlvbigpXG4gICAgICAgICAgICAudGhlbigoZGF0YSk9PntcbiAgICAgICAgICAgICAgaWYoZGF0YS5tZXNzYWdlID09PSAnc3VjY2Vzcycpe1xuICAgICAgICAgICAgICAgIHNlbGYuc3RhdHVzID0gJ1N1Y2Nlc3MnO1xuICAgICAgICAgICAgICB9IGVsc2V7XG4gICAgICAgICAgICAgICAgc2VsZi5zdGF0dXMgPSAnRXJyb3InO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5pdExvZ2luKCl7XG4gICAgbmV3IExvZ2luKCk7XG4gICAgLy8gbmV3IFZhbGlkYXRvcignI3RyeS1sb2dpbicsJy5sb2dpbi1mb3JtJyk7XG4gICAgJCgnLm9uc2NyZWVua2V5Ym9hcmQnKS5tbEtleWJvYXJkKHtcbiAgICAgIHRyaWdnZXI6ICcja2V5Ym9hcmQtdHJpZ2dlcicsXG4gICAgICBhY3RpdmVfc2hpZnQ6IGZhbHNlLFxuICAgICAgc2hvd19vbl9mb2N1czogZmFsc2UsXG4gICAgICBoaWRlX29uX2JsdXI6IGZhbHNlXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBpbml0QWNjb3VudCgpe1xuICAgIG5ldyBBY2NvdW50KCk7XG4gIH1cbiAgZnVuY3Rpb24gaW5pdEV4Y2hhbmdlKCl7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXRSZWdpc3RyYXRpb24xKCl7XG4gICAgbmV3IFdhbGxldEdlbmVyYXRvcigpO1xuICAgIG5ldyBDb3B5KCcjcGFzc3BocmFzZS1jb3B5JywnI3Bhc3NwaHJhc2UtZGF0YScpO1xuXG4gIH1cbiAgZnVuY3Rpb24gaW5pdFJlZ2lzdHJhdGlvbjIoKXtcbiAgICAvLyBuZXcgVmFsaWRhdG9yKCcjdHJ5LWxvZ2luJywnLmxvZ2luLWZvcm0nKTtcbiAgICBuZXcgZmluaXNoUmVnaXN0cmF0aW9uKCk7XG4gICAgJCgnLm9uc2NyZWVua2V5Ym9hcmQnKS5tbEtleWJvYXJkKHtcbiAgICAgIHRyaWdnZXI6ICcja2V5Ym9hcmQtdHJpZ2dlcicsXG4gICAgICBhY3RpdmVfc2hpZnQ6IGZhbHNlLFxuICAgICAgc2hvd19vbl9mb2N1czogZmFsc2UsXG4gICAgICBoaWRlX29uX2JsdXI6IGZhbHNlXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkluaXQoKXtcbiAgICBzdGF0ZSA9IGRldGVjdFN0YXRlKCk7XG4gICAgdG9TdGF0ZShzdGF0ZSk7XG4gIH1cblxuICB0aGlzLmluaXQgPSBmdW5jdGlvbigpe1xuICAgIG9uSW5pdCgpO1xuICB9XG59XG5cbndpbmRvdy5pc051bSA9IGZ1bmN0aW9uKG4pIHtcbiAgcmV0dXJuICFpc05hTihwYXJzZUZsb2F0KG4pKSAmJiBpc0Zpbml0ZShuKTtcbn1cblxuZnVuY3Rpb24gcm91bmQoeCwgZCl7XG4gIGxldCBtID0gTWF0aC5wb3coMTAsZCk7XG4gIHJldHVybiBNYXRoLnJvdW5kKHgqbSkvbTtcbn0iXX0=

//# sourceMappingURL=app.js.map
