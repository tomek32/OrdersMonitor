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


export interface OrderInterface {
  accountRRCode: string;
  orderNumber: string;
  creationTimestamp: string;
  waitingTimestamp: string;
  waitingStatus: StatusType;
  nextStatusTimestamp: string;
  nextStatus: string;
  lockedTimestamp: string;
  strategyType: string;
  strategyPrice: StrategyPriceType;
  securityType: SecurityType;
  actionType: ActionType;
  durationType: DurationType;
  nextDayInd: boolean;
  channel: string;

  getInitialDate(): string;
  getOrderMarketHoursType(): MarketHours;
  getTimeDiff(): number;
  setChannel(trailer2txt: string): void;
  setLockedTime(time: string): void;
}


export default class Order implements OrderInterface {
  accountRRCode: string;
  orderNumber: string;
  creationTimestamp: string;
  waitingTimestamp: string;
  waitingStatus: StatusType;
  nextStatusTimestamp: string;
  nextStatus: string;
  lockedTimestamp: string;
  strategyType: string;
  strategyPrice: StrategyPriceType;
  securityType: SecurityType;
  actionType: ActionType;
  orderType: string;
  durationType: DurationType;
  nextDayInd: boolean;
  channel: string;

  /**
   * Loads an order from orders db fields
   * @param order
   */
  constructor(order: any) {
    this.accountRRCode = order['ACCT_BOB_CD'];
    this.orderNumber = order['ORDER_NUM'];
    this.creationTimestamp = order['ORDER_ITEM_CREATION_TS'];
    this.waitingTimestamp = order['EFFECTIVE_TS1'];
    this.waitingStatus = order['ORDER_ITEM_STAT_CD1'];
    this.nextStatusTimestamp = order['EFFECTIVE_TS2'];
    this.nextStatus = order['ORDER_ITEM_STAT_CD2'];
    this.lockedTimestamp = undefined;
    this.strategyType = order['ORDER_STRTGY_CD'];
    this.strategyPrice = order['ORDER_PRICE_PLAN_CD'];
    this.securityType = order['SECRTY_TYPE_CD'];
    this.actionType = order['ACTION_TYPE_CD'];
    this.orderType = order['ORDER_TYPE_CD'];
    this.durationType = order['DURATN_TYPE_CD'];
    this.nextDayInd = order['NEXT_DAY_ORDER_IND'];
    this.setChannel(order['FTNOTE_TRAIL_2_TXT']);
  }

  /**
   * @returns {string} date when order went first into WAITING status
   */
  getInitialDate(): string {
    var d: Date = new Date(this.waitingTimestamp);
    return (('0' + (d.getMonth() + 1).toString()).slice(-2) + '.' + ('0' + d.getDate()).slice(-2) + '.' + d.getFullYear());
  }

  /**
   * @returns {MarketHours} if market hours were open or closed. Doesn't account for holidays
   */
  getOrderMarketHoursType(): MarketHours {
    var d: Date = new Date(this.waitingTimestamp);

    if (d.getHours() < 9 || d.getHours() >= 16)
      return MarketHours.MARKETS_CLOSED;
    else if (d.getHours() == 9 && d.getMinutes() < 30)
      return MarketHours.MARKETS_CLOSED;
    else if (d.getDay() == 6 || d.getDay() == 7)
      return MarketHours.MARKETS_CLOSED;

    return MarketHours.MARKETS_OPEN;
  }

  /**
   * @returns {number} of seconds between the final and initial timestamp
   */
  getTimeDiff(): number {
    return (new Date(this.nextStatusTimestamp).getTime() - new Date(this.waitingTimestamp).getTime()) / 1000
  }

  /**
   * Set the channel from the trailer text
   * @param {trailer2txt} has the channel in the format of CH.*
   */
  setChannel(trailer2txt: string): void {
    var i: number = trailer2txt.indexOf('CH.');
    this.channel = trailer2txt.substring(i, trailer2txt.indexOf('/', i));
  }

  /**
   *
   * @param order
   */
  setLockedTime(time: string): void {
    this.lockedTimestamp = time;
  }
}