/**
 * Created by Tom on 2017-03-21.
 */
export enum MarketHours {
  ALL, MARKETS_OPEN, MARKETS_CLOSED, EXTENDED_MARKETS
}

export enum Channel {
  WEB, WBR, ATT, MBL, TMAX, TALK, TBL, UNKNOWN
}

export enum AccountRRCode {
  RMPA, RMP1, RMP2, RMP3, RMP4, RM
}

export enum StrategyType {
  SPL, OCO, OTA, FTO, MLO
}

export enum StrategyPriceType {
  EVEN, MARKET, NET_DEBIT, NET_CREDIT
}

export enum SecurityType {
  EQUITY, OPTION
}

export enum ActionType {
  BUY, SELL, SHORT_SELL, BUY_TO_COVER,
  BUY_TO_OPEN, BUY_TO_CLOSE, SELL_TO_OPEN, SELL_TO_OPEN_COVERED, SELL_TO_OPEN_UNCOVERED, SELL_TO_CLOSE
}

export enum DurationType {
  CANCEL, DAY, EXT, GTD
}

export enum StatusType {
  FILLED, KILLED, OPEN, PARTIALLY_FILLED, WAITING
}

export enum RevisionType {
  CREATED, AWAITING_REVIEW, UNDER_REVIEW, POST_REVIEW
}

export interface OrderExtendedTerms {
  accountRRCode: string;
  actionType: ActionType;
  channel: string;
  durationType: DurationType;
  nextDayInd: boolean;
  orderType: string;
  status: string;
  strategyPrice: StrategyPriceType;
  timestamp: string;

}

export interface OrderInterface {
  strategyType: string;
  securityType: SecurityType;
  orderNumber: string;
  trailer2txt: string;
  extendedTerms: {[key: string]: OrderExtendedTerms};

  addRevision(revision: RevisionType, extendedTerms: OrderExtendedTerms): boolean;
  getChannelFromTrailer(revision: RevisionType): string;
  getOrderMarketHoursType(): MarketHours;
  getRevision(revision: RevisionType): OrderExtendedTerms;
  getRevisionDate(revision: RevisionType): string;
  getRevisionTimeDiff(fromRevision: RevisionType, toRevision: RevisionType): number;
  getUniqueID(): string;
}

export default class Order implements OrderInterface {
  strategyType: string;
  securityType: SecurityType;
  orderNumber: string;
  trailer2txt: string;
  extendedTerms: {[key: string]: OrderExtendedTerms};


  /**
   * Creates an order resource with revisions provided
   * @param strategyType
   * @param securityType
   * @param orderNumber
   * @param trailer2txt
   * @param extendedTerms
   */
  constructor(strategyType: string,
              securityType: SecurityType,
              orderNumber: string,
              trailer2txt: string,
              extendedTerms: {[key: string]: OrderExtendedTerms}) {

    this.strategyType = strategyType;
    this.securityType = securityType;
    this.orderNumber = orderNumber;
    this.trailer2txt = trailer2txt;
    this.extendedTerms = extendedTerms;

    Object.keys(this.extendedTerms).forEach(key => {
      this.extendedTerms[key].channel = this.getChannelFromTrailer(Order.getStatusAsRevisionType(key));
    });
  }

  /**s
   *
   * @param revision
   * @param extendedTerms
   * @returns {boolean}
   */
  addRevision(revision: RevisionType, extendedTerms: OrderExtendedTerms): boolean {
    if (revision in this.extendedTerms)
      return false;

    if (revision == RevisionType.UNDER_REVIEW) {
      var waitingTimestamp: string = this.getRevision(RevisionType.AWAITING_REVIEW).timestamp;
      var lockedTimestamp: string = extendedTerms.timestamp;
      var timeDiff: number = (new Date(lockedTimestamp).getTime() - new Date(waitingTimestamp).getTime()) / 1000;
      if ((timeDiff < 0) || (timeDiff > 60*2))
        return false;
    }

    this.extendedTerms[revision] = extendedTerms;
    return true;
  }

  /**
   * Set the channel from the trailer text
   * @param revision has the channel in the format of CH.*
   */
  getChannelFromTrailer(revision: RevisionType): string {
    var trailer2txt = this.trailer2txt;
    var i: number = trailer2txt.indexOf('CH.');
    return trailer2txt.substring(i, trailer2txt.indexOf('/', i));
  }

  /**
   * @returns {MarketHours} if market hours were open or closed at time order went into waiting status. Doesn't account for holidays
   */
  getOrderMarketHoursType(): MarketHours {
    var d: Date = new Date(this.getRevision(RevisionType.AWAITING_REVIEW).timestamp);

    if (d.getHours() < 9 || d.getHours() >= 16)
      return MarketHours.MARKETS_CLOSED;
    else if (d.getHours() == 9 && d.getMinutes() < 30)
      return MarketHours.MARKETS_CLOSED;
    else if (d.getDay() == 6 || d.getDay() == 7)
      return MarketHours.MARKETS_CLOSED;

    return MarketHours.MARKETS_OPEN;
  }

  /**
   *
   * @param revision
   * @returns {OrderExtendedTerms} date of revision for status. format MM.DD.YYYY
   */
  getRevision(revision: RevisionType): OrderExtendedTerms {
    return this.extendedTerms[revision];
  }

  /**
   *
   * @param revision
   * @returns {string} date of revision for status. format MM.DD.YYYY
   */
  getRevisionDate(revision: RevisionType): string {
    //var revisionStr: string = Order.getRevisionTypeAsString(revision);
    if (!(revision in this.extendedTerms))
      return null;

    var d: Date = new Date(this.extendedTerms[revision].timestamp);
    return (('0' + (d.getMonth() + 1).toString()).slice(-2) + '.' + ('0' + d.getDate()).slice(-2) + '.' + d.getFullYear());
  }

  /**
   *
   * @param fromRevision
   * @param toRevision
   * @returns {number} of seconds between the final and initial timestamp
   */
  getRevisionTimeDiff(fromRevision: RevisionType, toRevision: RevisionType): number {
    var fromTimestamp: string = this.getRevision(RevisionType.AWAITING_REVIEW).timestamp;
    var toTimestamp: string = this.getRevision(RevisionType.POST_REVIEW).timestamp;

    return (new Date(toTimestamp).getTime() - new Date(fromTimestamp).getTime()) / 1000;
  }

  /**
   * @param revision
   * @returns {string}
   */
  static getRevisionTypeAsString(revision: RevisionType): string {
    switch (revision) {
      case RevisionType.CREATED:
        return 'CREATED';
      case RevisionType.AWAITING_REVIEW:
        return 'AWAITING_REVIEW';
      case RevisionType.UNDER_REVIEW:
        return 'UNDER_REVIEW';
      case RevisionType.POST_REVIEW:
        return 'POST_REVIEW';
    }
  }

  /**
   *
   * @param status
   * @returns {RevisionType}
   */
  static getStatusAsRevisionType(status: string): RevisionType {
    switch (status) {
      case 'PLACED':
        return RevisionType.CREATED;
      case 'WAITING':
        return RevisionType.AWAITING_REVIEW;
      case 'LOCKED':
        return RevisionType.UNDER_REVIEW;
      default:
        return RevisionType.POST_REVIEW;
    }
  }

  /**
   *
   * @returns {string} that uniquely indentifies the order
   */
  getUniqueID(): string {
    return this.orderNumber + this.getRevisionDate(RevisionType.CREATED);
  }
}