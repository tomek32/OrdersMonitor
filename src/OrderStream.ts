/**
 * Created by Tom on 2017-03-25.
 */
import {OrderExtendedTerms, OrderRevisionType} from "./Order";
import Order from './Order';

const fastCsv = require("fast-csv");

const inputOrdersFile = './resources/orders.csv';
const inputLockedFile = './resources/locked.csv';

export interface OrderStreamInterface {
  orders: {[key: string]: Order};
}



export default class OrderStream {
  orders: { [key: string]: Order };

  /**
   * @param callback function to call once all orders are loaded
   * @param includeLockedOrders set to false to not load locked revisions
   */
  constructor(callback: any, includeLockedOrders: boolean = true) {
    this.orders = {};

    this.loadWaitingOrders(() => {
      if (includeLockedOrders) {
        this.loadLockedOrders(() => {
          callback();
        });
      } else
        callback();
    });
  }

  /**
   * @param order
   */
  protected addLockedRevision(csvOrder: any): void {
    const newOrder: Order = OrderStream.createOrderFromCSV(csvOrder);
    const newOrderID: string = newOrder.getUniqueID();

    if ((newOrderID in this.orders) &&
        (this.orders[newOrderID].addRevision(OrderRevisionType.UNDER_REVIEW, newOrder.extendedTerms[OrderRevisionType.UNDER_REVIEW])))
      delete this.orders[newOrderID]; // TODO: temp, remove this delete
    else
      throw new Error('Cannot add revision ' + newOrderID + ' to order ' + this.orders[newOrderID]);
  }

  /**
   * @param csvOrder object loaded from csv file
   */
  protected createOrder(csvOrder: any): void {
    const newOrder = OrderStream.createOrderFromCSV(csvOrder);

    if (newOrder.getUniqueID() in this.orders)
      throw new Error('Duplicate order. Cannot create order: ' + newOrder.getUniqueID());

    this.orders[newOrder.getUniqueID()]= newOrder;
  }

  /**
   * @param order object loaded from csv file
   * @return {Order} object representation of order
   */
  static createOrderFromCSV(order: any): Order {
    var revision: OrderRevisionType;
    var extendedTerms: { [key: string]: OrderExtendedTerms } = {};

    switch (order['ORDER_ITEM_STAT_CD1']) {
      case 'WAITING':
        revision = OrderRevisionType.AWAITING_REVIEW;
        break;
      case 'LOCKED':
        revision = OrderRevisionType.UNDER_REVIEW;
        break;
    }

    extendedTerms[OrderRevisionType.CREATED] = {
      accountRRCode: undefined,
      actionType: undefined,
      channel: undefined,
      durationType: undefined,
      nextDayInd: undefined,
      orderType: undefined,
      status: undefined,
      strategyOrderType: undefined,
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
      strategyOrderType: order['ORDER_PRICE_PLAN_CD'],
      timestamp: order['EFFECTIVE_TS1']
    };

    extendedTerms[OrderRevisionType.POST_REVIEW] = {
      accountRRCode: undefined,
      actionType: undefined,
      channel: undefined,
      durationType: undefined,
      nextDayInd: undefined,
      orderType: undefined,
      status: order['ORDER_ITEM_STAT_CD2'],
      strategyOrderType: undefined,
      timestamp: order['EFFECTIVE_TS2'],
    };

    return new Order(order['ORDER_STRTGY_CD'], order['SECRTY_TYPE_CD'],
                     order['ORDER_NUM'], order['FTNOTE_TRAIL_2_TXT'], extendedTerms);
  }

  /**
   * @param callback function to call once async load completes
   */
  protected loadLockedOrders(callback: any) {
    fastCsv
      .fromPath(inputLockedFile, {headers: true})
      .on('data', csvOrder => {
        this.addLockedRevision(csvOrder);
      })
      .on('end', () => {
        callback();
      });
  }

  /**
   * @param callback function to call once async load completes
   */
  protected loadWaitingOrders(callback: any) {
    fastCsv
      .fromPath(inputOrdersFile, {headers: true})
      .on('data', csvOrder => {
        try {
          this.createOrder(csvOrder);
        } catch (err) {}
      })
      .on('end', () => {
        callback();
      });
  }
}