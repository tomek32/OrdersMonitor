/**
 * Created by Tom on 2017-03-18.
 */
import Order from './Order';
import {MarketHours} from "./Order";
import OrderMonitor from './OrderMonitor';
var csv = require("fast-csv");
var orderMonitor = new OrderMonitor(MarketHours.MARKETS_OPEN, 60*5);

csv
    .fromPath("./resources/orders.csv", {headers: true})
    .on('data', function(order) {
        orderMonitor.pushOrder(order);
    })
    .on('end', function() {
        while (orderMonitor.popOrder())
            continue;
        orderMonitor.printReport();
    });

/**
// Comparision function for orderMonitor
var f = function (a: any, b: any) {
  return a.initialTimestamp < b.initialTimestamp;
};
}*/
