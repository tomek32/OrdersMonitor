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
  initialTimestamp: string;
  initialStatus: StatusType;
  finalTimestamp: string;
  finalStatus: StatusType;
  strategyType: string;
  strategyPrice: StrategyPriceType;
  securityType: SecurityType;
  actionType: ActionType;
  durationType: DurationType;
  nextDayInd: boolean;
  channel: string;

  getInitialDate(): string;
  getOrderMarketHoursType(): MarketHours;
}


export default class Order implements OrderInterface {
  accountRRCode: string;
  orderNumber: string;
  creationTimestamp: string;
  initialTimestamp: string;
  initialStatus: StatusType;
  finalTimestamp: string;
  finalStatus: StatusType;
  strategyType: string;
  strategyPrice: StrategyPriceType;
  securityType: SecurityType;
  actionType: ActionType;
  orderType: string;
  durationType: DurationType;
  nextDayInd: boolean;
  channel: string;


  /**
   * @returns {string} date when order went first into WAITING status
   */
  getInitialDate(): string {
    var d: Date = new Date(this.initialTimestamp);
    return (('0' + (d.getMonth() + 1).toString()).slice(-2) + '.' + ('0' + d.getDate()).slice(-2) + '.' + d.getFullYear());
  }

  /**
   * @returns {MarketHours} if market hours were open or closed. Doesn't account for holidays
   */
  getOrderMarketHoursType(): MarketHours {
    var d: Date = new Date(this.initialTimestamp);

    if (d.getHours() < 9 || d.getHours() >= 16)
      return MarketHours.MARKETS_CLOSED;
    else if (d.getHours() == 9 && d.getMinutes() < 30)
      return MarketHours.MARKETS_CLOSED;
    else if (d.getDay() == 6 || d.getDay() == 7)
      return MarketHours.MARKETS_CLOSED;

    return MarketHours.MARKETS_OPEN;
  }
}