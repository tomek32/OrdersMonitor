/**
 * Created by Tom on 2017-03-21.
 */
import Order from './Order';
import {OrderMarketHours, OrderRevisionType} from './Order';


export interface reportResource {
  numOrders: number;
  numOrdersByChannel: {WEB: number, WBR: number, ATT: number, MBL: number, TMAX: number, TALK: number, TBL: number, UNKNOWN: number};
  numOrdersByRRCode: {RMPA: number, RMP1: number, RMP2: number, RMP3: number, RMP4: number, RM: number};
  numOrdersByStrategy: {SPL: number, OCO: number, OTA: number, FTO: number, MLO: number};
  numOrdersByOrderType: {MARKET: number, LIMIT: number, STOP_MARKET: number, STOP_LIMIT: number, TRAILING_STOP_MARKET: number, TRAILING_STOP_LIMIT: number};
  numOrdersByCustom: {ATT_RMP1: number};

  longestWaitingSec: number;
  longestWaitingPlusApprovedSec: number;
  longestWaitingPlusApprovedOrder: Order;

  numOrderPastMaxSecs: number;
  numOrphasedLockedOrders: number;
  orderExceptions: {maxSecs: Order[], orphanedLocked: Order[]};
}

export interface OrderMonitorReportInterface {
  report: {[key: string]: reportResource};
  includeMarketHours: OrderMarketHours;
  orderExceptionMaxSecs: number;

  getReport(): any;
  recordPushOrder(order: Order, flag: boolean): void;
  recordPopOrder(order: Order): void;
}



export default class OrderMonitorReport implements OrderMonitorReportInterface {
  report: {[key: string]: reportResource};
  includeMarketHours: OrderMarketHours;
  orderExceptionMaxSecs: number;

  /**
   * @param includeMarketHours default is 30 sec. set max amount of time before switching to regular FIFO
   * @param orderExceptionMaxSecs default is 10 min. set how long an order can be in WAITING status before it's recorded as an exception for investigation
   */
  constructor(includeMarketHours: OrderMarketHours = OrderMarketHours.ALL,
              orderExceptionMaxSecs: number = 60*10) {
    this.report = {};
    this.includeMarketHours = includeMarketHours;
    this.orderExceptionMaxSecs = orderExceptionMaxSecs;
  }

  /**
   * @returns {{[p: string]: any}} the report
   */
  getReport(): {[p: string]: any} {
    var formattedReport: {[key: string]: any} = this.report;

    this.updateOverallTotalsReport();

    Object.keys(formattedReport).forEach(key => {
      var d:Date = new Date(formattedReport[key].longestWaitingPlusApprovedSec);

      /**
       // TODO: refactor to make this paramaterized
       formattedReport[key].numOrdersByStrategy.OCO /= 2;
       formattedReport[key].numOrdersByStrategy.OTA /= 2;
       formattedReport[key].numOrdersByStrategy.FTO /= 3;
       formattedReport[key].numOrdersByStrategy.MLO /= 2;
       */

      // TODO: don't return this until we get locked status
      formattedReport[key].longestWaitingSec = undefined;

      // Convert to mm:ss format
      formattedReport[key].longestWaitingPlusApprovedSec = undefined;
      formattedReport[key].longestWaitingPlusApproved = ('0' + d.getHours()).slice(-2) + 'h:'
                                                      + ('0' + d.getMinutes()).slice(-2) + 'm:'
                                                      + ('0' + d.getSeconds()).slice(-2) + 's';
    });

    return formattedReport;
  }

  /**
   * Add pop event onto report. Orders in WAITING status outside regular market hours are ineligible
   * @param order
   */
  recordPopOrder(order: Order): void {
    if (order.getOrderMarketHoursType() != OrderMarketHours.MARKETS_OPEN)
      return;

    var date: string = order.getRevisionDate(OrderRevisionType.AWAITING_REVIEW);

    // Longest waited time between 9:30am and 4pm
    if (date in this.report) {
      var currLongestApproved = this.report[date].longestWaitingPlusApprovedSec;
      var newTimeToApprove:number = order.getRevisionTimeDiff(OrderRevisionType.AWAITING_REVIEW, OrderRevisionType.POST_REVIEW);

      if (newTimeToApprove > currLongestApproved) {
        this.report[date].longestWaitingPlusApprovedSec = newTimeToApprove;
        this.report[date].longestWaitingPlusApprovedOrder = order;
      }

      this.recordOrderExceptions(order);
    }
  }

  /**
   * Add push event ont report
   * @param order
   */
  recordPushOrder(order: Order): void {
    if (this.includeMarketHours != OrderMarketHours.ALL && this.includeMarketHours != order.getOrderMarketHoursType())
      return;

    var orderDate:string = order.getRevisionDate(OrderRevisionType.AWAITING_REVIEW);

    // Initialize the report if new date is detected
    if (!(orderDate in this.report))
      this.initializeReport(orderDate);

    this.report[orderDate].numOrders++;

    switch (order.getRevision(OrderRevisionType.AWAITING_REVIEW).channel) {
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

    switch (order.getRevision(OrderRevisionType.AWAITING_REVIEW).accountRRCode) {
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

    switch (order.getRevision(OrderRevisionType.AWAITING_REVIEW).orderType) {
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

    if (order.getRevision(OrderRevisionType.AWAITING_REVIEW).channel == "CH.ATT" &&
        order.getRevision(OrderRevisionType.AWAITING_REVIEW).accountRRCode == "RMP1")
      this.report[orderDate].numOrdersByCustom.ATT_RMP1++;
  }


  /**
   * Initialzie a report object
   * @param key - string to indicate if report is for date (i.e. 03.17.2017) or  'totals'
   */
  protected initializeReport(key: string): void {
    this.report[key] = {
      numOrders: 0,
      numOrdersByChannel: {WEB: 0, WBR: 0, ATT: 0, MBL: 0, TMAX: 0, TALK: 0, TBL: 0, UNKNOWN: 0},
      numOrdersByRRCode: {RMPA: 0, RMP1: 0, RMP2: 0, RMP3: 0, RMP4: 0, RM: 0},
      numOrdersByStrategy: {SPL: 0, OCO: 0, OTA: 0, FTO: 0, MLO: 0},
      numOrdersByOrderType: {MARKET: 0, LIMIT: 0, STOP_MARKET: 0, STOP_LIMIT: 0, TRAILING_STOP_MARKET: 0, TRAILING_STOP_LIMIT: 0},
      numOrdersByCustom: {ATT_RMP1: 0},

      longestWaitingSec: 0,
      longestWaitingPlusApprovedSec: 0,
      longestWaitingPlusApprovedOrder: null,

      numOrderPastMaxSecs: (key == 'totals') ? 0 : undefined,
      numOrphasedLockedOrders: (key == 'totals') ? 0 : undefined,
      orderExceptions: {maxSecs: [], orphanedLocked: []}
    };
  }

  /**
   * Record orders if time difference between the Waiting and Next Status (i.e. Open) is > order exception max seconds
   */
  protected recordOrderExceptions(order: Order): void {
    // If status is Killed, it just means the order too a long time to review, we can disregard until we know the locked time
    if (order.getRevision(OrderRevisionType.POST_REVIEW).status == 'KILLED')
        return;

    if (order.getRevisionTimeDiff(OrderRevisionType.AWAITING_REVIEW, OrderRevisionType.POST_REVIEW) > this.orderExceptionMaxSecs) {
      this.report[order.getRevisionDate(OrderRevisionType.AWAITING_REVIEW)].orderExceptions.maxSecs.push(order);
    }
  }

  /**
   * Calculates the overall total report
   */
  protected updateOverallTotalsReport(): void {
    // TODO: add check to prevent consumer to pass total into the object
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

        if (this.report[key].longestWaitingSec > this.report['totals'].longestWaitingSec)
          this.report['totals'].longestWaitingSec = this.report[key].longestWaitingSec;

        if (this.report[key].longestWaitingPlusApprovedSec > this.report['totals'].longestWaitingPlusApprovedSec) {
          this.report['totals'].longestWaitingPlusApprovedSec = this.report[key].longestWaitingPlusApprovedSec;
        }

        // Move max sec exceptions to totals
        this.report[key].orderExceptions.maxSecs.forEach(order => {
          this.report['totals'].orderExceptions.maxSecs.push(order);
        });
        this.report['totals'].numOrderPastMaxSecs += this.report[key].orderExceptions.maxSecs.length;
        this.report[key].orderExceptions.maxSecs = undefined;

        // Move missing locked revisions to totals
        this.report[key].orderExceptions.orphanedLocked.forEach(order => {
          this.report['totals'].orderExceptions.orphanedLocked.push(order);
        });
        this.report['totals'].numOrphasedLockedOrders += this.report[key].orderExceptions.orphanedLocked.length;
        this.report[key].orderExceptions.orphanedLocked = undefined;

        this.report['totals'].longestWaitingPlusApprovedOrder = undefined;
      }
    }
  }
}