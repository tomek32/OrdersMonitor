/**
 * Created by Tom on 2017-03-18.
 */
import {MarketHours} from "./Order";
import Order from './Order';
import OrderMonitorReport from './OrderMonitorReport';

const FastPriorityQueue: any = require('fastpriorityqueue');

export interface OrderMonitorInterface {
  orderQueue: any;
  report: OrderMonitorReport;

  getReport(): any;
  pushOrder(order: any): void;
  popOrder(): void;
}


export default class OrderMonitor implements OrderMonitorInterface {
  orderQueue: any;
  report: OrderMonitorReport;
  otherChannelMaxWaitSec: number;

  /**
   *
   * @param includeMarketHours - default is to include all. set to restrict which orders are included
   * @param orderExceptionMaxSecs
   * @param priorityWaitSecs
   */
  constructor(otherChannelMaxWaitSec: number = 30, includeMarketHours?: MarketHours, orderExceptionMaxSecs?: number) {
    this.orderQueue = new FastPriorityQueue();
    this.report = new OrderMonitorReport(includeMarketHours, orderExceptionMaxSecs);

    // TODO: this value isn't being used yet
    this.otherChannelMaxWaitSec = otherChannelMaxWaitSec;
  }

  /**
   * @returns {any} current report
   */
  getReport(): any {
    return this.report.getReport();
  }

  /**
   * Pushes order onto queue
   * @param order
   */
  pushOrder(order: any): void {
    var newOrder : Order = new Order();

    newOrder.accountRRCode = order['ACCT_BOB_CD'];
    newOrder.orderNumber = order['ORDER_NUM'];
    newOrder.creationTimestamp = order['ORDER_ITEM_CREATION_TS'];
    newOrder.waitingTimestamp = order['EFFECTIVE_TS1'];
    newOrder.waitingStatus = order['ORDER_ITEM_STAT_CD1'];
    newOrder.nextStatusTimestamp = order['EFFECTIVE_TS2'];
    newOrder.nextStatus = order['ORDER_ITEM_STAT_CD2'];
    newOrder.strategyType = order['ORDER_STRTGY_CD'];
    newOrder.strategyPrice = order['ORDER_PRICE_PLAN_CD'];
    newOrder.securityType = order['SECRTY_TYPE_CD'];
    newOrder.actionType = order['ACTION_TYPE_CD'];
    newOrder.orderType = order['ORDER_TYPE_CD'];
    newOrder.durationType = order['DURATN_TYPE_CD'];
    newOrder.nextDayInd = order['NEXT_DAY_ORDER_IND'];

    var channel: string = order['FTNOTE_TRAIL_2_TXT'];
    var i: number = channel.indexOf('CH.');
    newOrder.channel = channel.substring(i, channel.indexOf('/', i));

    this.orderQueue.add(newOrder);
    this.report.recordPushOrder(newOrder);
  }

  /**
   * Pops the top order of the queue
   * @returns {boolean} true if an order was removed, false if otherwise queue is empty
   */
  popOrder(): boolean {
    var order: Order;

    order = this.orderQueue.peek();
    if (order) {
        this.report.recordPopOrder(order);
        this.orderQueue.poll();
        return true;
    }
    else
      return false;
  }
}