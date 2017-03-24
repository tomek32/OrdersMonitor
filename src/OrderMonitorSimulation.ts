/**
 * Created by Tom on 2017-03-18.
 */
import Order from './Order';
import {MarketHours} from "./Order";
import OrderMonitor from './OrderMonitor';

const csv = require("fast-csv");
const writeJsonFile = require('write-json-file');
const json2csv = require('json2csv');
const fs = require('fs');

var missedOrderWaitingSec: number = 60 * 5;
var inputFile = './resources/orders.csv';
var reportJSONFile = './scratch/order_report.json';
var reportCSVFile = './scratch/order_report.csv';
var missedOrdersCSVFile = './scratch/missed_waiting_order.csv';

var orderMonitor = new OrderMonitor(MarketHours.ALL, missedOrderWaitingSec);
csv
    .fromPath(inputFile, {headers: true})
    .on('data', function(order) {
        orderMonitor.pushOrder(order);
    })
    .on('end', function() {
        while (orderMonitor.popOrder());

        var json : any = orderMonitor.getReport();
        writeJsonFile(reportJSONFile, json).then(() => {});

        var csv : any = json2csv({data: json.totals.missedAwaytingOrders});
        fs.writeFile(missedOrdersCSVFile, csv, function(err) {
            console.log('file saved');
        });

        delete json.totals;
        var csv : any = json2csv({data: json});
        fs.writeFile(reportCSVFile, csv, function(err) {
            console.log('file saved');
        });
    });

/**
// Comparision function for orderMonitor
var f = function (a: any, b: any) {
  return a.initialTimestamp < b.initialTimestamp;
};
}*/