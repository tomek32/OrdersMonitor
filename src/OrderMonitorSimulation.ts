/**
 * Created by Tom on 2017-03-18.
 */
import Order from './Order';
import {MarketHours} from "./Order";
import OrderMonitor from './OrderMonitor';

var csv = require("fast-csv");
const writeJsonFile = require('write-json-file');

var missedOrderWaitingSec: number = 60 * 5;
var inputFile = './resources/orders.csv';
var outputFile = './scratch/order_report_report.json';

var orderMonitor = new OrderMonitor(MarketHours.MARKETS_OPEN, missedOrderWaitingSec);
csv
    .fromPath(inputFile, {headers: true})
    .on('data', function(order) {
        orderMonitor.pushOrder(order);
    })
    .on('end', function() {
        while (orderMonitor.popOrder());

        var json: any = orderMonitor.getReport();
        writeJsonFile(outputFile, json).then(() => {});
    });

/**
// Comparision function for orderMonitor
var f = function (a: any, b: any) {
  return a.initialTimestamp < b.initialTimestamp;
};
}*/
