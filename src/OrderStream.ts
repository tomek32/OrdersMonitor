/**
 * Created by Tom on 2017-03-25.
 */
import {OrderExtendedTerms, RevisionType} from "./Order";
import Order from './Order';

const fastCsv = require("fast-csv");

const inputOrdersFile = './resources/orders.csv';
const inputLockedFile = './resources/locked.csv';

export interface OrderStreamInterface {
  orders: {[key: string]: Order};
}


export default class OrderStream {
  orders: { [key: string]: Order };

  constructor(callback: any) {
    this.orders = {};
    this.loadWaitingOrders(callback);
  }

  /**
   * Run simulation with pushing all waiting orders and then popping them
   */
  protected loadWaitingOrders(callback: any) {
    fastCsv
            .fromPath(inputOrdersFile, {headers: true})
            .on('data', order => {
              this.createOrder(order);
            })
            .on('end', () => {
              this.loadLockedOrders(callback);
            });
  }

  /**
   * Loads locked orders to pass
   */
  protected loadLockedOrders(callback: any) {
    fastCsv
      .fromPath(inputLockedFile, {headers: true})
      .on('data', order => {
        this.addLockedRevision(order);
      })
      .on('end', () => {
        callback();
      });
  }

  protected createOrder(order: any): void {
    var newOrder = this.createOrderFromCSV(order);
    this.orders[newOrder.getUniqueID()]= newOrder;
  }

  protected addLockedRevision(order: any): void {
    var newOrder: Order = this.createOrderFromCSV(order);
    var orderID: string = newOrder.getUniqueID();

    if ((orderID in this.orders) && (this.orders[orderID].addRevision(RevisionType.UNDER_REVIEW, newOrder.extendedTerms[RevisionType.UNDER_REVIEW])))
      delete this.orders[orderID];
    else
      console.log(newOrder);
  }

  protected createOrderFromCSV(order: any): Order {
    var revision: RevisionType;
    var extendedTerms: { [key: string]: OrderExtendedTerms } = {};

    switch (order['ORDER_ITEM_STAT_CD1']) {
      case 'WAITING':
        revision = RevisionType.AWAITING_REVIEW;
        break;
      case 'LOCKED':
        revision = RevisionType.UNDER_REVIEW;
        break;
    }

    extendedTerms[RevisionType.CREATED] = {
      accountRRCode: undefined,
      actionType: undefined,
      channel: undefined,
      durationType: undefined,
      nextDayInd: undefined,
      orderType: undefined,
      status: undefined,
      strategyPrice: undefined,
      timestamp: order['ORDER_ITEM_CREATION_TS']
    };

    extendedTerms[revision] = {
      accountRRCode: order['ACCT_BOB_CD'],
      actionType: order['ACTION_TYPE_CD'],
      channel: undefined,
      durationType: order['DURATN_TYPE_CD'],
      nextDayInd: order['NEXT_DAY_ORDER_IND'],
      orderType: order['ORDER_TYPE_CD'],
      status: order['ORDER_ITEM_STAT_CD1'],
      strategyPrice: order['ORDER_PRICE_PLAN_CD'],
      timestamp: order['EFFECTIVE_TS1']
    };

    extendedTerms[RevisionType.POST_REVIEW] = {
      accountRRCode: undefined,
      actionType: undefined,
      channel: undefined,
      durationType: undefined,
      nextDayInd: undefined,
      orderType: undefined,
      status: order['ORDER_ITEM_STAT_CD2'],
      strategyPrice: undefined,
      timestamp: order['EFFECTIVE_TS2'],
    };

    return new Order(order['ORDER_STRTGY_CD'], order['SECRTY_TYPE_CD'], order['ORDER_NUM'],
                     order['FTNOTE_TRAIL_2_TXT'], extendedTerms);
  }
}