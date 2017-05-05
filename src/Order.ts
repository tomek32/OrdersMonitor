/**
 * Created by Tom on 2017-03-21.
 */
import {error} from "util";

/**
 * Order Enumeration Types
 */
export enum OrderMarketHours {
  ALL, MARKETS_OPEN, MARKETS_CLOSED, EXTENDED_MARKETS
}

export enum OrderChannel {
  WEB, WBR, ATT, MBL, TMAX, TALK, TBL, UNKNOWN
}

export enum AccountRRCode {
  RMPA, RMP1, RMP2, RMP3, RMP4, RM
}

export enum OrderStrategyType {
  SPL, OCO, OTA, FTO, MLO
}

export enum OrderStrategyPriceType {
  EVEN, MARKET, NET_DEBIT, NET_CREDIT
}

export enum OrderSecurityType {
  EQUITY, OPTION
}

export enum OrderActionType {
  BUY, SELL, SHORT_SELL, BUY_TO_COVER,
  BUY_TO_OPEN, BUY_TO_CLOSE, SELL_TO_OPEN, SELL_TO_OPEN_COVERED, SELL_TO_OPEN_UNCOVERED, SELL_TO_CLOSE
}

export enum OrderDurationType {
  CANCEL, DAY, EXT, GTD
}

export enum OrderStatusType {
  FILLED, KILLED, OPEN, PARTIALLY_FILLED, WAITING
}

export enum OrderRevisionType {
  CREATED, AWAITING_REVIEW, UNDER_REVIEW, POST_REVIEW
}

/**
 * Order Interfaces
 */
export interface OrderExtendedTerms {
  accountRRCode: string;
  actionType: OrderActionType;
  channel: string;
  durationType: OrderDurationType;
  nextDayInd: boolean;
  orderType: string;
  status: string;
  strategyOrderType: string;
  timestamp: string;

}

export interface OrderInterface {
  strategyType: string;
  securityType: OrderSecurityType;
  orderNumber: string;
  trailer2txt: string;
  extendedTerms: {[key: string]: OrderExtendedTerms};

  addRevision(revision: OrderRevisionType, extendedTerms: OrderExtendedTerms): boolean;
  getChannelFromTrailer(revision: OrderRevisionType): string;
  getOrderMarketHoursType(): OrderMarketHours;
  getRevision(revision: OrderRevisionType): OrderExtendedTerms;
  getRevisionDate(revision: OrderRevisionType): string;
  getRevisionTimeDiff(fromRevision: OrderRevisionType, toRevision: OrderRevisionType): number;
  getUniqueID(): string;
}

const orderExceptionMaxSecs: number = 60 * 10;


/**
 * Order class
 */
export default class Order implements OrderInterface {
  strategyType: string;
  securityType: OrderSecurityType;
  orderNumber: string;
  trailer2txt: string;
  extendedTerms: {[key: string]: OrderExtendedTerms};

  /**
   * Creates an order resource with revisions provided
   * @param strategyType - strategy type
   * @param securityType - security type
   * @param orderNumber - order number
   * @param trailer2txt - trailer2 text
   * @param extendedTerms - object containing revision. Must contain at least a waiting or locked status revision
   */
  constructor(strategyType: string,
              securityType: OrderSecurityType,
              orderNumber: string,
              trailer2txt: string,
              extendedTerms: {[key: string]: OrderExtendedTerms}) {
    if (!((OrderRevisionType.AWAITING_REVIEW in extendedTerms) ||
          (OrderRevisionType.UNDER_REVIEW in extendedTerms))) {
      console.log('Cannot create order; extended terms must contain a waiting or locked revision');
      throw new Error('Cannot create order; extended terms must contain a waiting or locked revision');
    }

    this.strategyType = strategyType.trim();
    this.securityType = securityType;
    this.orderNumber = orderNumber.trim();
    this.trailer2txt = trailer2txt.trim();
    this.extendedTerms = extendedTerms;

    Object.keys(this.extendedTerms).forEach(key => {
      this.extendedTerms[key].channel = this.getChannelFromTrailer(Order.getStatusAsRevisionType(key));
    });
  }

  /**
   * @param revision type being added
   * @param extendedTerms being added for revision
   * @returns {boolean} true if addition is succesfull
   *                    false if revision type already existing in order
   *                    false if revision is LOCKED and timestamp doesn't fall without allowed threshold of WAITING revision
   */
  addRevision(revision: OrderRevisionType, extendedTerms: OrderExtendedTerms): boolean {
    if (revision in this.extendedTerms)
      return false;

    if (revision == OrderRevisionType.UNDER_REVIEW) {
      const waitingTimestamp: string = this.getRevision(OrderRevisionType.AWAITING_REVIEW).timestamp;
      const lockedTimestamp: string = extendedTerms.timestamp;
      const postReviewTimestamp: string = this.getRevision((OrderRevisionType.POST_REVIEW)).timestamp;
      var timeDiff: number = 0;

      timeDiff = (new Date(lockedTimestamp).getTime() - new Date(postReviewTimestamp).getTime()) / 1000;
      if (timeDiff => 0) {
        console.log('   Cannot add revision. Under review timestamp is after the post review timestamp');
        return false;
      }

      timeDiff = (new Date(lockedTimestamp).getTime() - new Date(waitingTimestamp).getTime()) / 1000;
      if ((timeDiff < 0) || (timeDiff > orderExceptionMaxSecs)) {
        console.log('   Cannot add revision. Revision time difference is ' + timeDiff + '. Max time difference allowed is: ' + orderExceptionMaxSecs);
        return false;
      }
    }

    this.extendedTerms[revision] = extendedTerms;
    return true;
  }

  /**
   * Get the channel from the trailer text
   * @param revision type to retrieve
   * @return {string} channel of revision in the format of CH.*
   */
  getChannelFromTrailer(revision: OrderRevisionType): string {
    const i: number = this.trailer2txt.indexOf('CH.');
    if (i == -1)
      return 'UNKNOWN';

    var j: number = this.trailer2txt.indexOf('/', i);
    if (j == -1)
      j = this.trailer2txt.length;

    return this.trailer2txt.substring(i, j);
  }

  /**
   * @returns {OrderMarketHours} if market hours were open or closed for waiting revision. Doesn't account for holidays
   */
  getOrderMarketHoursType(): OrderMarketHours {
    const d: Date = new Date(this.getRevision(OrderRevisionType.AWAITING_REVIEW).timestamp);

    if (d.getHours() < 9 || d.getHours() >= 16)
      return OrderMarketHours.MARKETS_CLOSED;
    else if (d.getHours() == 9 && d.getMinutes() < 30)
      return OrderMarketHours.MARKETS_CLOSED;
    else if (d.getDay() == 6 || d.getDay() == 7)
      return OrderMarketHours.MARKETS_CLOSED;

    return OrderMarketHours.MARKETS_OPEN;
  }

  /**
   * @param revision type to retrieve
   * @returns {OrderExtendedTerms} data of revision
   */
  getRevision(revision: OrderRevisionType): OrderExtendedTerms {
    return this.extendedTerms[revision];
  }

  /**
   * @param revision
   * @returns {string} date of revision for status. Format MM.DD.YYYY
   */
  getRevisionDate(revision: OrderRevisionType): string {
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
  getRevisionTimeDiff(fromRevision: OrderRevisionType, toRevision: OrderRevisionType): number {
    const fromTimestamp: string = this.getRevision(OrderRevisionType.AWAITING_REVIEW).timestamp;
    const toTimestamp: string = this.getRevision(OrderRevisionType.POST_REVIEW).timestamp;

    return (new Date(toTimestamp).getTime() - new Date(fromTimestamp).getTime()) / 1000;
  }

  /**
   * @param revision
   * @returns {string} representation of revision
   */
  static getRevisionTypeAsString(revision: OrderRevisionType): string {
    switch (revision) {
      case OrderRevisionType.CREATED:
        return 'CREATED';
      case OrderRevisionType.AWAITING_REVIEW:
        return 'AWAITING_REVIEW';
      case OrderRevisionType.UNDER_REVIEW:
        return 'UNDER_REVIEW';
      case OrderRevisionType.POST_REVIEW:
        return 'POST_REVIEW';
    }
  }

  /**
   * @param status as string
   * @returns {OrderRevisionType} representation of status
   */
  static getStatusAsRevisionType(status: string): OrderRevisionType {
    switch (status) {
      case 'PLACED':
        return OrderRevisionType.CREATED;
      case 'WAITING':
        return OrderRevisionType.AWAITING_REVIEW;
      case 'LOCKED':
        return OrderRevisionType.UNDER_REVIEW;
      default:
        return OrderRevisionType.POST_REVIEW;
    }
  }

  /**
   *
   * @returns {string} that uniquely indentifies the order
   */
  getUniqueID(): string {
    return this.orderNumber + this.getRevisionDate(OrderRevisionType.CREATED);
  }
}