/**
 * Created by Tom on 2017-05-06.
 */
import {OrderMarketHours, OrderExtendedTerms, OrderRevisionType} from "./Order";
import Order from './Order';

const OrderExceptionMaxSecs: number = 60 * 10;

export default class orderExceptions {
  awaitingReview: {pastPostReviewTimestampOrders: Order[], orphanedLocked: Order[]};
  postReview: {aboveMaxSecs: Order[]};
  orderExceptionMaxSecs: number;

  /**
   * @param orderExceptionMaxSecs default is 10 min. set how long an order can be in WAITING status before it's recorded as an exception for investigation
   */
  constructor(orderExceptionMaxSecs: number = OrderExceptionMaxSecs) {
    this.awaitingReview = {pastPostReviewTimestampOrders: [], orphanedLocked: []};
    this.postReview = {aboveMaxSecs: []};
    this.orderExceptionMaxSecs = orderExceptionMaxSecs;
  }

  getReport() {
    Object.keys(this.postReview.aboveMaxSecs).forEach(orderKey => {
      this.postReview.aboveMaxSecs[orderKey] = this.postReview.aboveMaxSecs[orderKey].getAsStringObject();
    });

    Object.keys(this.awaitingReview.orphanedLocked).forEach(orderKey => {
      this.awaitingReview.orphanedLocked[orderKey] = this.awaitingReview.orphanedLocked[orderKey].getAsStringObject();
    });

    Object.keys(this.awaitingReview.pastPostReviewTimestampOrders).forEach(orderKey => {
      this.awaitingReview.pastPostReviewTimestampOrders[orderKey] = this.awaitingReview.pastPostReviewTimestampOrders[orderKey].getAsStringObject();
    });
  }

  /**
   * Record orders if time difference between the Waiting and Next Status (i.e. Open) is > order exception max seconds
   */
  recordOrderExceptions(order: Order): void {
    // If awaiting review revision is missing and status is Killed, it means the order too a long time to review and we can disregard
    if ((order.getRevision(OrderRevisionType.AWAITING_REVIEW) == null) && (order.getRevision(OrderRevisionType.POST_REVIEW).status == 'KILLED'))
      return;

    if ((order.getRevision(OrderRevisionType.AWAITING_REVIEW) != null) && (order.getRevision(OrderRevisionType.UNDER_REVIEW) != null)) {
      const waitingTimestamp: string = order.getRevision(OrderRevisionType.AWAITING_REVIEW).timestamp;
      const lockedTimestamp: string = order.getRevision(OrderRevisionType.UNDER_REVIEW).timestamp;;
      const postReviewTimestamp: string = order.getRevision((OrderRevisionType.POST_REVIEW)).timestamp;
      var timeDiff: number = 0;

      timeDiff = (new Date(lockedTimestamp).getTime() - new Date(postReviewTimestamp).getTime()) / 1000;
      if (timeDiff => 0)
        this.awaitingReview.pastPostReviewTimestampOrders.push(order);

      timeDiff = (new Date(lockedTimestamp).getTime() - new Date(waitingTimestamp).getTime()) / 1000;
      if ((timeDiff < 0) || (timeDiff > this.orderExceptionMaxSecs))
        this.awaitingReview.pastPostReviewTimestampOrders.push(order);
    }

    if (order.getRevisionTimeDiff(OrderRevisionType.AWAITING_REVIEW, OrderRevisionType.POST_REVIEW) > this.orderExceptionMaxSecs) {
      this.postReview.aboveMaxSecs.push(order);
    }
  }
}