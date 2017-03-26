/**
 * Created by Tom on 2017-03-25.
 */
import {OrderExtendedTerms, RevisionType} from "./Order";
import Order from './Order';

export function createOrderFromCSV(order: any): Order {
  var extendedTerms: {[key: string]: OrderExtendedTerms} = {};

  extendedTerms[RevisionType.CREATED] = {
    accountRRCode: undefined,
    actionType: undefined,
    channel: undefined,
    durationType: undefined,
    nextDayInd: undefined,
    orderType: undefined,
    status: undefined,
    strategyPrice: undefined,
    timestamp: order['ORDER_ITEM_CREATION_TS']
  };

  extendedTerms[RevisionType.AWAITING_REVIEW] = {
    accountRRCode: order['ACCT_BOB_CD'],
    actionType: order['ACTION_TYPE_CD'],
    channel: undefined,
    durationType: order['DURATN_TYPE_CD'],
    nextDayInd: order['NEXT_DAY_ORDER_IND'],
    orderType: order['ORDER_TYPE_CD'],
    status: order['ORDER_ITEM_STAT_CD1'],
    strategyPrice: order['ORDER_PRICE_PLAN_CD'],
    timestamp: order['EFFECTIVE_TS1']
  };

  extendedTerms[RevisionType.POST_REVIEW] = {
    accountRRCode: undefined,
    actionType: undefined,
    channel: undefined,
    durationType: undefined,
    nextDayInd: undefined,
    orderType: undefined,
    status: order['ORDER_ITEM_STAT_CD2'],
    strategyPrice: undefined,
    timestamp: order['EFFECTIVE_TS2'],
  };

  return new Order (order['ORDER_STRTGY_CD'], order['SECRTY_TYPE_CD'], order['ORDER_NUM'],
    order['FTNOTE_TRAIL_2_TXT'], extendedTerms);
}
