/**
 * Created by Tom on 2017-03-18.
 */
import {MarketHours} from "./Order";
import Order from './Order';
import OrderMonitorReport from './OrderMonitorReport';

const FastPriorityQueue: any = require('fastpriorityqueue');

export interface OrderMonitorInterface {
  lockedOrders: any[];
  orderQueue: any;
  report: OrderMonitorReport;

  addLockedOrderRevision(): void;
  getReport(): any;
  matchOrderToLockedRevision(order: Order): boolean;
  pushOrder(order: any): void;
  popOrder(): void;
}


export default class OrderMonitor implements OrderMonitorInterface {
  lockedOrders: any[];
  otherChannelMaxWaitSec: number;
  orderQueue: any;
  report: OrderMonitorReport;


  /**
   *
   * @param includeMarketHours - default is to include all. set to restrict which orders are included
   * @param orderExceptionMaxSecs
   * @param otherChannelMaxWaitSec
   */
  constructor(otherChannelMaxWaitSec: number = 30, includeMarketHours?: MarketHours, orderExceptionMaxSecs?: number) {
    this.lockedOrders = [];
    this.orderQueue = new FastPriorityQueue();
    this.report = new OrderMonitorReport(includeMarketHours, orderExceptionMaxSecs);

    // TODO: this value isn't being used yet
    this.otherChannelMaxWaitSec = otherChannelMaxWaitSec;
  }

  /**
   * Adds revision of locked status and will try to sync with waiting status being pushed later
   */
  addLockedOrderRevision(order: any): void {
    var newOrder: any = new Order(order);
    var orderNumber: string = newOrder.orderNumber;

    this.lockedOrders.push({orderNumber: newOrder});
  }

  /**
   * @returns {any} current report
   */
  getReport(): any {
    return this.report.getReport();
  }

  /**
   *
   * @param order
   */
  matchOrderToLockedRevision(order: Order): boolean {
    if (!(order.orderNumber in this.lockedOrders)) {
      console.log('a');
      return false;
    }

    order.setLockedTime(this.lockedOrders[order.orderNumber]);
    return true;
  }

  /**
   * Pushes order onto queue
   * @param order
   */
  pushOrder(order: any): void {
    var newOrder : Order = new Order(order);
    this.matchOrderToLockedRevision(newOrder);

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