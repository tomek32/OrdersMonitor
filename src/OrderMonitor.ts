/**
 * Created by Tom on 2017-03-18.
 */
import Order from './Order';
import {MarketHours} from "./Order";
import OrderMonitorReport from './OrderMonitorReport';
const FastPriorityQueue: any = require('fastpriorityqueue');
//const heap: any = require('heap');
//import a from 'heap';


export interface OrderMonitorInterface {
  orderQueue: any;
  report: OrderMonitorReport;

  //TODO: fix compiler warnings on optional parameter
  //constructor(priorityWaitSecs?: number);
  getReport(): any;
  pushOrder(order: any): void;
  popOrder(): void;
}


//////
// OrderMonitor Class
export default class OrderMonitor implements OrderMonitorInterface {
  orderQueue: any;
  report: OrderMonitorReport;
  priorityWaitSecs: number;


  //////
  // Constructor
  constructor(includeMarketHours?: MarketHours, missedWaitingOrderSec?: number, priorityWaitSecs?: number, prioritizationAlgorith?: any) {
    // this.orderQueue = new Heap();
    this.orderQueue = new FastPriorityQueue(prioritizationAlgorith);
    this.report = new OrderMonitorReport(includeMarketHours, missedWaitingOrderSec);
    this.priorityWaitSecs = priorityWaitSecs;
  }

  //////
  // Print report
  getReport(): any {
    return this.report.getReport();
  }


  //////
  // Push order onto queue
  pushOrder(order: any): void {
    var newOrder : Order = new Order();

    newOrder.accountRRCode = order['ACCT_BOB_CD'];
    newOrder.orderNumber = order['ORDER_NUM'];
    newOrder.creationTimestamp = order['ORDER_ITEM_CREATION_TS'];
    newOrder.initialTimestamp = order['EFFECTIVE_TS1'];
    newOrder.initialStatus = order['ORDER_ITEM_STAT_CD1'];
    newOrder.finalTimestamp = order['EFFECTIVE_TS2'];
    newOrder.finalStatus = order['ORDER_ITEM_STAT_CD2'];
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
    this.report.updateReportForPushOrder(newOrder);
  }


  //////
  // Pops off the top order and logs to the report
  // Return true if an order was removed, false if otherwise queue is empty
  popOrder(): boolean {
    var order: Order;

    order = this.orderQueue.peek();
    if (order) {
        this.report.updateReportForPopOrder(order);
        this.orderQueue.poll();
        return true;
    }
    else
      return false;
  }
}