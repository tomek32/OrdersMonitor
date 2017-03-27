/**
 * Created by Tom on 2017-03-18.
 */
import {MarketHours, OrderExtendedTerms, RevisionType} from "./Order";
import Order from './Order';
import OrderMonitor from './OrderMonitor';
import OrderStream from './OrderStream';


const fs = require('fs');
const json2csv = require('json2csv');
const writeJsonFile = require('write-json-file');

const orderReportJson = './scratch/orders_report.json';
const exceptionReportJson = './scratch/order_exceptions.json';
const exceptionReportCsv = './scratch/order_exceptions.csv';

const orderExceptionMaxSecs: number = 60 * 5;
const orderMonitor = new OrderMonitor(orderExceptionMaxSecs, MarketHours.ALL);

/**
 *
 */
var simulation = function () {
  Object.keys(orderStream.orders).forEach(key => {
    orderMonitor.pushOrder(orderStream.orders[key]);
  });
  while (orderMonitor.popOrder()) {
  }
  exportReports();
};

/**
 * Export reports
 */
function exportReports() {
  const json : any = orderMonitor.getReport();
  writeJsonFile(exceptionReportJson, json.totals.orderExceptions).then(() => {});

  const csv : any = json2csv({data: json.totals.orderExceptions});
  fs.writeFile(exceptionReportCsv, csv, function(err) {});

  json.totals.orderExceptions = undefined;
  writeJsonFile(orderReportJson, json).then(() => {});
}

var orderStream: OrderStream = new OrderStream(simulation);