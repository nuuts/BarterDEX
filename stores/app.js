import { observable, action } from 'mobx';
import { ipcRenderer } from 'electron';
import LoaderStore from './LoaderStore';
import NotifierStore from './NotifierStore';
import PortfolioStore from './PortfolioStore'
import OrderbookStore from './OrderbookStore'
import MarketStore from './MarketStore'
import TradeStore from './TradeStore'
import GrowlerStore from './GrowlerStore'
import { appVersion } from '../config/config';

const shepherdIPC = (data) => { ipcRenderer.send('shepherd-command', data) }

export default class AppStore {

  @observable userpass = false;
  @observable coins = false;
  @observable mypubkey = false;

    constructor() {
        const self = this;
        this.notifier = new NotifierStore();
        this.loader = new LoaderStore();
        this.orderbook = new OrderbookStore();
        this.market = new MarketStore();
        this.growler = new GrowlerStore();

        this.appVersion = `version ${appVersion}`;

        this.portfolio = new PortfolioStore({
            defaultFiat: { type: 'usd', symbol: '$' },
            defaultCrypto: 'BTC',
            orderbookStore: this.orderbook,
            marketStore: this.market
        });

        this.trade = new TradeStore({
            portfolioStore: this.portfolio
        });


        /* set userpass */
        ipcRenderer.on('updateUserInfo', (e, { userpass }) => {
            if (typeof (Storage) !== 'undefined') {
                // Code for localStorage/sessionStorage.
                localStorage.setItem('userpass', userpass);
            }

            self.userpass = userpass;
            // start autorefresh of portfolio
            ipcRenderer.send('refresh')
            self.autorefresh = setInterval(() => ipcRenderer.send('refresh'), 6000)
        });

        ipcRenderer.on('resetUserInfo', () => {
            self.coins = '';
            self.userpass = '';
            self.mypubkey = '';
        })

        ipcRenderer.on('willClose', () => {
            this.logout();
            ipcRenderer.send('readyToQuit');
        })

        // if (typeof (Storage) !== 'undefined') {
        //     // Code for localStorage/sessionStorage.
        //     const userpass = localStorage.getItem('userpass');
        //     if (userpass) {
        //         self.userpass = userpass;
        //     }
        // }
    }

  @action login = ({ passphrase, userpass }) => {
      // send login passphrase
      shepherdIPC({ command: 'login', passphrase, userpass });
  }

  @action logout = () => {
      const self = this;
      if (typeof (Storage) !== 'undefined') {
          // Code for localStorage/sessionStorage.
          localStorage.removeItem('userpass');
      }

      // send login passphrase
      clearInterval(self.autorefresh);
      self.orderbook.killListener();
      self.portfolio.leave();
      shepherdIPC({ command: 'logout' });
  }

}
