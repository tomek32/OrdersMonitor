/**
 * Created by Tom on 2017-03-18.
 */
import Order from './Order';
import {OrderMarketHours, OrderRevisionType} from "./Order";
import OrderMonitorReport from './OrderMonitorReport';

const FastPriorityQueue: any = require('fastpriorityqueue');

export interface OrderMonitorInterface {
  orderQueue: any;
  report: OrderMonitorReport;

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
  constructor(otherChannelMaxWaitSec: number = 30, includeMarketHours?: OrderMarketHours) {
    this.orderQueue = new FastPriorityQueue();
    this.report = new OrderMonitorReport(includeMarketHours);

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
   * Pushes order onto queue
   * @param order
   */
  pushOrder(order: Order): void {
    //var flag: boolean = this.findAndAssignLockedStatus(newOrder);
    this.orderQueue.add(order);
    this.report.recordPushOrder(order);
  }
}