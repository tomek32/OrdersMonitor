/**
 * Created by Tom on 2017-03-18.
 */
import {OrderMarketHours} from "./Order";
import OrderMonitor from './OrderMonitor';
import OrderStream from './OrderStream';


const fs = require('fs');
const json2csv = require('json2csv');
const writeJsonFile = require('write-json-file');

const orderReportJson: string = './output/orders_report.json';
const orderReportCsv: string  = './output/orders_report.csv';
const exceptionReportJson: string  = './output/order_exceptions.json';
const exceptionReportCsv: string  = './output/order_exceptions.csv';

const orderExceptionMaxSecs: number = 60 * 10;

/**
 * Run simulation by pushing all orders onto queue and then empty the entire queue
 */
let simulationCallback = function () {
  Object.keys(orderStream.getOrders()).forEach(key => {
    orderMonitor.pushOrder(orderStream.orders[key]);
  });

  while (orderMonitor.popOrder()) {}
  exportReports();
};

/**
 * Export order monitor reports
 */
function exportReports() {
  let json: any, csv: any;

  // Export monitor report
  json = orderMonitor.getReport();
  csv = json2csv({data: json});

  writeJsonFile(orderReportJson, json).then(() => {});
  fs.writeFile(orderReportCsv, csv, function(err) {});

  // Export order exceptions
  json = orderStream.getOrderExceptions();
  csv = json2csv({data: json});

  writeJsonFile(exceptionReportJson, json).then(() => {});
  fs.writeFile(exceptionReportCsv, csv, function(err) {});
}

let orderMonitor = new OrderMonitor(orderExceptionMaxSecs, OrderMarketHours.ALL);
let orderStream: OrderStream = new OrderStream(simulationCallback, true);