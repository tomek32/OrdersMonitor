/**
 * Created by Tom on 2017-03-21.
 */
import Order from './Order';
import {OrderMarketHours, OrderRevisionType} from './Order';

const ReportOrigNumOfStrategyOrders: boolean = true;

export interface reportResource {
  numOrders: number;
  numOrdersByChannel: {WEB: number, WBR: number, ATT: number, MBL: number, TMAX: number, TALK: number, TBL: number, UNKNOWN: number};
  numOrdersByRRCode: {RMPA: number, RMP1: number, RMP2: number, RMP3: number, RMP4: number, RM: number};
  numOrdersByStrategy: {SPL: number, OCO: number, OTA: number, FTO: number, MLO: number};
  numOrdersByOrderType: {MARKET: number, LIMIT: number, STOP_MARKET: number, STOP_LIMIT: number, TRAILING_STOP_MARKET: number, TRAILING_STOP_LIMIT: number};
  numOrdersByCustom: {ATT_RMP1: number};

  longestInAwaitingReviewOrder: {waitingSec: number, order: Order};
  longestAwaitingPlusUnderReviewOrder: {waitingSec: number, order: Order};
}

export interface OrderMonitorReportInterface {
  report: {[key: string]: reportResource};
  reportProperties: {
    adjustForStrategyOrders: boolean,
    includeMarketHours: OrderMarketHours,
  };

  getReport(): any;
  recordPushOrder(order: Order, flag: boolean): void;
  recordPopOrder(order: Order): void;
}


export default class OrderMonitorReport implements OrderMonitorReportInterface {
  report: { [key: string]: reportResource };
  reportProperties: {
    adjustForStrategyOrders: boolean,
    includeMarketHours: OrderMarketHours,
  };

  /**
   * @param includeMarketHours default is 30 sec. set max amount of time before switching to regular FIFO
   * @param reportOrigNumOfStrategyOrders
   */
  constructor(includeMarketHours: OrderMarketHours = OrderMarketHours.ALL,
              reportOrigNumOfStrategyOrders: boolean = ReportOrigNumOfStrategyOrders) {
    this.report = {};
    this.reportProperties = {
      adjustForStrategyOrders: reportOrigNumOfStrategyOrders,
      includeMarketHours: includeMarketHours,
    };
  }

  /**
   * @returns {{[p: string]: any}} the report
   */
  getReport(): {[p: string]: any} {
    const formattedReport: {[key: string]: any} = this.report;

    this.updateOverallTotalsReport();

    Object.keys(formattedReport).forEach(reportKey => {
      // TODO: not supported yet
      /**
      if (!this.reportOrigNumOfStrategyOrders) {
        formattedReport[key].numOrders = formattedReport[key].numOrders -
                                         formattedReport[key].numOrdersByStrategy.OCO/2 -
                                         formattedReport[key].numOrdersByStrategy.OTA/2 -
                                         formattedReport[key].numOrdersByStrategy.FTO/3 -
                                         formattedReport[key].numOrdersByStrategy.MLO/2;
        formattedReport[key].numOrdersByStrategy.OCO /= 2;
        formattedReport[key].numOrdersByStrategy.OTA /= 2;
        formattedReport[key].numOrdersByStrategy.FTO /= 3;
        formattedReport[key].numOrdersByStrategy.MLO /= 2;
      }*/

      formattedReport[reportKey].longestInAwaitingReviewOrder.waitingSec = OrderMonitorReport.getSecondsAsString(formattedReport[reportKey].longestInAwaitingReviewOrder.waitingSec);
      if (formattedReport[reportKey].longestInAwaitingReviewOrder.order)
        formattedReport[reportKey].longestInAwaitingReviewOrder.order = formattedReport[reportKey].longestInAwaitingReviewOrder.order.getAsStringObject();

      formattedReport[reportKey].longestAwaitingPlusUnderReviewOrder.waitingSec = OrderMonitorReport.getSecondsAsString(formattedReport[reportKey].longestAwaitingPlusUnderReviewOrder.waitingSec);
      if (formattedReport[reportKey].longestAwaitingPlusUnderReviewOrder.order)
        formattedReport[reportKey].longestAwaitingPlusUnderReviewOrder.order = formattedReport[reportKey].longestAwaitingPlusUnderReviewOrder.order.getAsStringObject();
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

    const date: string = order.getRevisionDate(OrderRevisionType.AWAITING_REVIEW);

    // Longest waited time between 9:30am and 4pm
    if (date in this.report) {
      const currLongestApproved = this.report[date].longestAwaitingPlusUnderReviewOrder.waitingSec;
      const newTimeToApprove:number = order.getRevisionTimeDiff(OrderRevisionType.AWAITING_REVIEW, OrderRevisionType.POST_REVIEW);

      if (newTimeToApprove > currLongestApproved) {
        this.report[date].longestAwaitingPlusUnderReviewOrder.waitingSec = newTimeToApprove;
        this.report[date].longestAwaitingPlusUnderReviewOrder.order = order;
      }
    }
  }

  /**
   * Add push event ont report
   * @param order
   */
  recordPushOrder(order: Order): void {
    var a = OrderMarketHours.ALL;
    if (this.reportProperties.includeMarketHours != OrderMarketHours.ALL &&
        this.reportProperties.includeMarketHours != order.getOrderMarketHoursType())
      return;

    const orderDate:string = order.getRevisionDate(OrderRevisionType.AWAITING_REVIEW);

    // Initialize the report if new date is detected
    if (!(orderDate in this.report))
      this.addNewReportResource(orderDate);

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

    switch (order.getRevision(OrderRevisionType.AWAITING_REVIEW).strategyOrderType) {
      case 'MARKET':
        this.report[orderDate].numOrdersByOrderType.MARKET++;
        break;
      case 'NET_DEBIT':
      case 'NET_CREDIT':
      case 'EVEN':
        this.report[orderDate].numOrdersByOrderType.LIMIT++;
        break;
    }

    if (order.getRevision(OrderRevisionType.AWAITING_REVIEW).channel == "CH.ATT" &&
        order.getRevision(OrderRevisionType.AWAITING_REVIEW).accountRRCode == "RMP1")
      this.report[orderDate].numOrdersByCustom.ATT_RMP1++;
  }

  /**
   * Initialzie a report object
   * @param key - string to indicate if report is for date (i.e. 03.17.2017) or 'totals'
   */
  protected addNewReportResource(key: string): void {
    this.report[key] = {
      numOrders: 0,
      numOrdersByChannel: {WEB: 0, WBR: 0, ATT: 0, MBL: 0, TMAX: 0, TALK: 0, TBL: 0, UNKNOWN: 0},
      numOrdersByRRCode: {RMPA: 0, RMP1: 0, RMP2: 0, RMP3: 0, RMP4: 0, RM: 0},
      numOrdersByStrategy: {SPL: 0, OCO: 0, OTA: 0, FTO: 0, MLO: 0},
      numOrdersByOrderType: {MARKET: 0, LIMIT: 0, STOP_MARKET: 0, STOP_LIMIT: 0, TRAILING_STOP_MARKET: 0, TRAILING_STOP_LIMIT: 0},
      numOrdersByCustom: {ATT_RMP1: 0},

      longestInAwaitingReviewOrder: {waitingSec: 0, order: null},
      longestAwaitingPlusUnderReviewOrder: {waitingSec: 0, order: null},
    };
  }

  /**
   * Calculates the overall total report
   */
  protected updateOverallTotalsReport(): void {
    // TODO: add check to prevent consumer to pass total into the object
    this.addNewReportResource('totals');

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
/**
        if (this.report[key].longestInAwaitingReviewOrder.waitingSec > this.report['totals'].longestInAwaitingReviewOrder.waitingSec)
          this.report['totals'].longestInAwaitingReviewOrder.waitingSec = this.report[key].longestInAwaitingReviewOrder.waitingSec;

        if (this.report[key].longestAwaitingPlusUnderReviewOrder.waitingSec > this.report['totals'].longestAwaitingPlusUnderReviewOrder.waitingSec) {
          this.report['totals'].longestAwaitingPlusUnderReviewOrder.waitingSec = this.report[key].longestAwaitingPlusUnderReviewOrder.waitingSec;
        }

        // Move orders above max sec exceptions to totals
        this.report[key].orderExceptions.aboveMaxSecs.forEach(order => {
          this.report['totals'].orderExceptions.aboveMaxSecs.push(order);
        });
        this.report['totals'].numOrderPastMaxSecs += this.report[key].orderExceptions.aboveMaxSecs.length;
        this.report[key].orderExceptions.aboveMaxSecs = undefined;

        // Move orphaned locked revisions to totals
        this.report[key].orderExceptions.orphanedLocked.forEach(order => {
          this.report['totals'].orderExceptions.orphanedLocked.push(order);
        });
        this.report['totals'].numOrphasedLockedOrders += this.report[key].orderExceptions.orphanedLocked.length;
        this.report[key].orderExceptions.orphanedLocked = undefined;*/
      }
    }
  }

  /**
   * @param date number of secs
   * @return {string} date in string format XXh:XXm:XXs
   */
  static getSecondsAsString(date: number): string {
    var d: Date = new Date(date);

    return ('0' + d.getHours()).slice(-2) + 'h:'
         + ('0' + d.getMinutes()).slice(-2) + 'm:'
         + ('0' + d.getSeconds()).slice(-2) + 's';
  }
}