/**
 * Created by Tom on 2017-03-18.
 */
import Order from './Order';
import {MarketHours} from "./Order";
import {RevisionType} from "./Order";
import OrderMonitorReport from './OrderMonitorReport';

const FastPriorityQueue: any = require('fastpriorityqueue');

export interface OrderMonitorInterface {
  //lockedOrders: {[key: string]: any};
  orderQueue: any;
  report: OrderMonitorReport;

  //addLockedRevision(order: any): void;
  getReport(): any;
  pushOrder(order: Order): void;
  popOrder(): void;
}


export default class OrderMonitor implements OrderMonitorInterface {
  //lockedOrders: {[key: string]: any};
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
    //this.lockedOrders = {};
    this.orderQueue = new FastPriorityQueue();
    this.report = new OrderMonitorReport(includeMarketHours, orderExceptionMaxSecs);

    // TODO: this value isn't being used yet
    this.otherChannelMaxWaitSec = otherChannelMaxWaitSec;
  }

  /**
   * Adds revision of locked status and will try to sync with waiting status being pushed later

  addLockedRevision(order: any): void {
    var newOrder: any = new Order(order);
    var orderNumber: string = newOrder.orderNumber;

    this.lockedOrders[orderNumber] = newOrder;
  }*/

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
  pushOrder(order: Order): void {
    //var flag: boolean = this.findAndAssignLockedStatus(newOrder);
    this.orderQueue.add(order);
    this.report.recordPushOrder(order);
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

  /**
   * @param order

  protected findAndAssignLockedStatus(order: Order): boolean {
    if (!(order.orderNumber in this.lockedOrders))
      return false;

    var lockedTime: number = new Date(this.lockedOrders[order.orderNumber].waitingTimestamp).getTime() / 1000;
    var waitingTime: number = new Date(order.waitingTimestamp).getTime() / 1000;
    if (Math.abs(waitingTime - lockedTime) > 60*5)
      return false;

    order.setLockedTime(this.lockedOrders[order.orderNumber]);
    delete this.lockedOrders[order.orderNumber];
    return true;
  }*/
}