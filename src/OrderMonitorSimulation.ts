/**
 * Created by Tom on 2017-03-18.
 */
import {OrderMarketHours, OrderExtendedTerms, OrderRevisionType} from "./Order";
import Order from './Order';
import OrderMonitor from './OrderMonitor';
import OrderStream from './OrderStream';


const fs = require('fs');
const json2csv = require('json2csv');
const writeJsonFile = require('write-json-file');

const orderReportJson = './output/orders_report.json';
const exceptionReportJson = './output/order_exceptions.json';
const exceptionReportCsv = './output/order_exceptions.csv';

const orderExceptionMaxSecs: number = 60 * 10;
const orderMonitor = new OrderMonitor(orderExceptionMaxSecs, OrderMarketHours.ALL);


/**
 * Run simulation by pushing all orders onto queue and then empty the entire queue
 */
var simulationCallback = function () {
  Object.keys(orderStream.orders).forEach(key => {
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
  writeJsonFile(exceptionReportJson, json.totals.orderExceptions).then(() => {});

  const csv : any = json2csv({data: json.totals.orderExceptions});
  fs.writeFile(exceptionReportCsv, csv, function(err) {});

  json.totals.orderExceptions = undefined;
  writeJsonFile(orderReportJson, json).then(() => {});
}

/** Turned off locked orders. Locked orders input file has too many false positives to reliably report on */
const orderStream: OrderStream = new OrderStream(simulationCallback, true);