/**
 * Created by Tom on 2017-03-18.
 */
import {OrderMarketHours} from "./Order";
import OrderMonitor from './OrderMonitor';
import OrderStream from './OrderStream';


const fs = require('fs');
const json2csv = require('json2csv');
const writeJsonFile = require('write-json-file');

const orderReportJson = './output/orders_report.json';
const exceptionReportJson = './output/order_exceptions.json';
const exceptionReportCsv = './output/order_exceptions.csv';

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
  const json : any = orderMonitor.getReport();
  writeJsonFile(orderReportJson, json).then(() => {});

  writeJsonFile(exceptionReportJson, orderStream.getOrderExceptions()).then(() => {});

  const csv : any = json2csv({data: orderStream.getOrderExceptions()});
  fs.writeFile(exceptionReportCsv, csv, function(err) {});
}

let orderMonitor = new OrderMonitor(orderExceptionMaxSecs, OrderMarketHours.ALL);
let orderStream: OrderStream = new OrderStream(simulationCallback, true);