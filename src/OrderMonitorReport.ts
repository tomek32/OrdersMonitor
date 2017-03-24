/**
 * Created by Tom on 2017-03-21.
 */
import Order from './Order';
import {MarketHours} from "./Order";


export interface reportResource {
  numOrders: number;
  numOrdersByChannel: {WEB: number, WBR: number, ATT: number, MBL: number, TMAX: number, TALK: number, TBL: number, UNKNOWN: number};
  numOrdersByRRCode: {RMPA: number, RMP1: number, RMP2: number, RMP3: number, RMP4: number, RM: number};
  numOrdersByStrategy: {SPL: number, OCO: number, OTA: number, FTO: number, MLO: number};
  numOrdersByOrderType: {MARKET: number, LIMIT: number, STOP_MARKET: number, STOP_LIMIT: number, TRAILING_STOP_MARKET: number, TRAILING_STOP_LIMIT: number};
  numOrdersByCustom: {ATT_RMP1: number};
  numOrdersReprioritized: number;
  longestWaitingSec: number;
  longestWaitingPlusApprovedSec: number;
  longestWaitingPlusApprovedOrder: Order;
  missedAwaytingOrders: Order[];
}


export interface OrderMonitorReportInterface {
  report: {[key: string]: any};
  includeMarketHours: MarketHours;
  missedWaitingOrderSec: number;

  getReport(): any;
  updateReportForPushOrder(order: Order): void;
  updateReportForPopOrder(order: Order): void;
}


export default class OrderMonitorReport implements OrderMonitorReportInterface {
  report: {[key: string]: reportResource};
  includeMarketHours: MarketHours;
  missedWaitingOrderSec: number;

  //////
  // Constructor
  constructor(includeMarketHours?: MarketHours, missedWaitingOrderSec?: number) {
    this.report = {};
    this.includeMarketHours = includeMarketHours;
    this.missedWaitingOrderSec = missedWaitingOrderSec;
  }

  //////
  // Print the current report
  getReport(): any {
    var formattedReport: {[key: string]: any} = this.report;

    this.updateOverallTotalsReport();

    for (const key of Object.keys(formattedReport)) {
      var d:Date = new Date(formattedReport[key].longestWaitingPlusApprovedSec);

      /**TODO make this paramaterized
      formattedReport[key].numOrdersByStrategy.OCO /= 2;
      formattedReport[key].numOrdersByStrategy.OTA /= 2;
      formattedReport[key].numOrdersByStrategy.FTO /= 3;
      formattedReport[key].numOrdersByStrategy.MLO /= 2;
      */

      // TODO: don't export this until we get locked status
      delete formattedReport[key].numOrdersReprioritized;
      delete formattedReport[key].longestWaitingSec;

      // Convert to mm:ss format
      delete formattedReport[key].longestWaitingPlusApprovedSec;
      formattedReport[key].longestWaitingPlusApproved = ('0' + d.getHours()).slice(-2) + 'h:' + ('0' + d.getMinutes()).slice(-2) + 'm:' + ('0' + d.getSeconds()).slice(-2) + 's';
    }

    return formattedReport;
  }


  //////
  // Update report based on order being popped. Orders entered outside market hours are ineligible
  updateReportForPopOrder(order: Order): void {
    if (order.getOrderMarketHoursType() == MarketHours.MARKETS_OPEN) {
      var date:string = order.getInitialDate();

      // Longest waited time between 9:30am and 4pm
      if (date in this.report) {
        var currLongestApproved = this.report[date].longestWaitingPlusApprovedSec;
        var newTimeToApprove:number = (new Date(order.finalTimestamp).getTime() - new Date(order.initialTimestamp).getTime()) / 1000;

        if (newTimeToApprove > currLongestApproved) {
            this.report[date].longestWaitingPlusApprovedSec = newTimeToApprove;
          this.report[date].longestWaitingPlusApprovedOrder = order;
        }

        if (newTimeToApprove >= this.missedWaitingOrderSec)
          this.report[date].missedAwaytingOrders.push(order);
      }
    }
  }


  //////
  // Update report based on new order
  updateReportForPushOrder(order: Order): void {
    if (this.includeMarketHours == MarketHours.ALL || this.includeMarketHours == order.getOrderMarketHoursType()) {
      var orderDate:string;

      orderDate = order.getInitialDate();

      // Initialize the report if new date is detected
      if (!(orderDate in this.report))
        this.initializeReport(orderDate);

      this.report[orderDate].numOrders++;

      switch (order.channel) {
        case 'CH.WEB':
          this.report[orderDate].numOrdersByChannel.WEB++;
          break;
        case 'CH.WBR':
          this.report[orderDate].numOrdersByChannel.WBR++;
          break;
        case 'CH.ATT':
          this.report[orderDate].numOrdersByChannel.ATT++;
          break;
        case 'CH.MBL':
          this.report[orderDate].numOrdersByChannel.MBL++;
          break;
        case 'CH.TMAX':
          this.report[orderDate].numOrdersByChannel.TMAX++;
          break;
        case 'CH.TALK':
          this.report[orderDate].numOrdersByChannel.TALK++;
          break;
        case 'CH.TBL':
          this.report[orderDate].numOrdersByChannel.TBL++;
          break;
        default:
          this.report[orderDate].numOrdersByChannel.UNKNOWN++;
      }

      switch (order.accountRRCode) {
        case 'RMPA':
          this.report[orderDate].numOrdersByRRCode.RMPA++;
          break;
        case 'RMP1':
          this.report[orderDate].numOrdersByRRCode.RMP1++;
          break;
        case 'RMP2':
          this.report[orderDate].numOrdersByRRCode.RMP2++;
          break;
        case 'RMP3':
          this.report[orderDate].numOrdersByRRCode.RMP3++;
          break;
        case 'RMP4':
          this.report[orderDate].numOrdersByRRCode.RMP4++;
          break;
        default:
          this.report[orderDate].numOrdersByRRCode.RM++;
          break;
      }

      switch (order.strategyType) {
        case 'SPL':
          this.report[orderDate].numOrdersByStrategy.SPL++;
          break;
        case 'OCO':
          this.report[orderDate].numOrdersByStrategy.OCO++;
          break;
        case 'OTA':
          this.report[orderDate].numOrdersByStrategy.OTA++;
          break;
        case 'FTO':
          this.report[orderDate].numOrdersByStrategy.FTO++;
          break;
        case 'MLO':
          this.report[orderDate].numOrdersByStrategy.MLO++;
          break;
      }

      switch (order.orderType) {
        case 'MARKET':
          this.report[orderDate].numOrdersByOrderType.MARKET++;
          break;
        case 'LIMIT':
          this.report[orderDate].numOrdersByOrderType.LIMIT++;
          break;
        case 'STOP_MARKET':
          this.report[orderDate].numOrdersByOrderType.STOP_MARKET++;
          break;
        case 'STOP_LIMIT':
          this.report[orderDate].numOrdersByOrderType.STOP_LIMIT++;
          break;
        case 'TRAILING_STOP_MARKET':
          this.report[orderDate].numOrdersByOrderType.TRAILING_STOP_MARKET++;
          break;
        case 'TRAILING_STOP_LIMIT':
          this.report[orderDate].numOrdersByOrderType.TRAILING_STOP_LIMIT++;
          break;
      }

      if (order.channel == "CH.ATT" && order.accountRRCode == "RMP1")
        this.report[orderDate].numOrdersByCustom.ATT_RMP1++;
    }
  }


  //////
  // key: order date or total
  protected initializeReport(key: string): void {
    this.report[key] = {
      numOrders: 0,
      numOrdersByChannel: {WEB: 0, WBR: 0, ATT: 0, MBL: 0, TMAX: 0, TALK: 0, TBL: 0, UNKNOWN: 0},
      numOrdersByRRCode: {RMPA: 0, RMP1: 0, RMP2: 0, RMP3: 0, RMP4: 0, RM: 0},
      numOrdersByStrategy: {SPL: 0, OCO: 0, OTA: 0, FTO: 0, MLO: 0},
      numOrdersByOrderType: {MARKET: 0, LIMIT: 0, STOP_MARKET: 0, STOP_LIMIT: 0, TRAILING_STOP_MARKET: 0, TRAILING_STOP_LIMIT: 0},
      numOrdersByCustom: {ATT_RMP1: 0},
      numOrdersReprioritized: 0,
      longestWaitingSec: 0,
      longestWaitingPlusApprovedSec: 0,
        longestWaitingPlusApprovedOrder: null,
      missedAwaytingOrders: []
    };
  }

  //////
  // Calculates the overall total report
  protected updateOverallTotalsReport(): void {
    //TODO: add check to prevent consumer to pass total into the object
    this.initializeReport('totals');

    for (const key of Object.keys(this.report)) {
      if (key != 'totals') {
        this.report['totals'].numOrders += this.report[key].numOrders;
        this.report['totals'].numOrdersByChannel.WEB += this.report[key].numOrdersByChannel.WEB;
        this.report['totals'].numOrdersByChannel.WBR += this.report[key].numOrdersByChannel.WBR;
        this.report['totals'].numOrdersByChannel.ATT += this.report[key].numOrdersByChannel.ATT;
        this.report['totals'].numOrdersByChannel.MBL += this.report[key].numOrdersByChannel.MBL;
        this.report['totals'].numOrdersByChannel.TMAX += this.report[key].numOrdersByChannel.TMAX;
        this.report['totals'].numOrdersByChannel.TALK += this.report[key].numOrdersByChannel.TALK;
        this.report['totals'].numOrdersByChannel.TBL += this.report[key].numOrdersByChannel.TBL;
        this.report['totals'].numOrdersByChannel.UNKNOWN += this.report[key].numOrdersByChannel.UNKNOWN;

        this.report['totals'].numOrdersByRRCode.RMPA += this.report[key].numOrdersByRRCode.RMPA;
        this.report['totals'].numOrdersByRRCode.RMP1 += this.report[key].numOrdersByRRCode.RMP1;
        this.report['totals'].numOrdersByRRCode.RMP2 += this.report[key].numOrdersByRRCode.RMP2;
        this.report['totals'].numOrdersByRRCode.RMP3 += this.report[key].numOrdersByRRCode.RMP3;
        this.report['totals'].numOrdersByRRCode.RMP4 += this.report[key].numOrdersByRRCode.RMP4;
        this.report['totals'].numOrdersByRRCode.RM += this.report[key].numOrdersByRRCode.RM;

        this.report['totals'].numOrdersByStrategy.SPL += this.report[key].numOrdersByStrategy.SPL;
        this.report['totals'].numOrdersByStrategy.OCO += this.report[key].numOrdersByStrategy.OCO;
        this.report['totals'].numOrdersByStrategy.OTA += this.report[key].numOrdersByStrategy.OTA;
        this.report['totals'].numOrdersByStrategy.FTO += this.report[key].numOrdersByStrategy.FTO;
        this.report['totals'].numOrdersByStrategy.MLO += this.report[key].numOrdersByStrategy.MLO;
        this.report['totals'].numOrdersByStrategy.SPL += this.report[key].numOrdersByStrategy.SPL;

        this.report['totals'].numOrdersByOrderType.MARKET += this.report[key].numOrdersByOrderType.MARKET;
        this.report['totals'].numOrdersByOrderType.LIMIT += this.report[key].numOrdersByOrderType.LIMIT;
        this.report['totals'].numOrdersByOrderType.STOP_MARKET += this.report[key].numOrdersByOrderType.STOP_MARKET;
        this.report['totals'].numOrdersByOrderType.STOP_LIMIT += this.report[key].numOrdersByOrderType.STOP_LIMIT;
        this.report['totals'].numOrdersByOrderType.TRAILING_STOP_MARKET += this.report[key].numOrdersByOrderType.TRAILING_STOP_MARKET;
        this.report['totals'].numOrdersByOrderType.TRAILING_STOP_LIMIT += this.report[key].numOrdersByOrderType.TRAILING_STOP_LIMIT;

        this.report['totals'].numOrdersByCustom.ATT_RMP1 += this.report[key].numOrdersByCustom.ATT_RMP1;
        this.report['totals'].numOrdersReprioritized += this.report[key].numOrdersReprioritized;

        if (this.report[key].longestWaitingSec > this.report['totals'].longestWaitingSec)
          this.report['totals'].longestWaitingSec = this.report[key].longestWaitingSec;

        if (this.report[key].longestWaitingPlusApprovedSec > this.report['totals'].longestWaitingPlusApprovedSec) {
          this.report['totals'].longestWaitingPlusApprovedSec = this.report[key].longestWaitingPlusApprovedSec;
        }

        for (var order of this.report[key].missedAwaytingOrders)
          this.report['totals'].missedAwaytingOrders.push(order);
        delete this.report[key].missedAwaytingOrders;

        delete  this.report['totals'].longestWaitingPlusApprovedOrder;
      }
    }
  }
}