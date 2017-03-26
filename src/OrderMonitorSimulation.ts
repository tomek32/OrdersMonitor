/**
 * Created by Tom on 2017-03-18.
 */
import {MarketHours, OrderExtendedTerms, RevisionType} from "./Order";
import Order from './Order';
import OrderMonitor from './OrderMonitor';
import {createOrderFromCSV} from './OrderStream';

const fastCsv = require("fast-csv");
const fs = require('fs');
const json2csv = require('json2csv');
const writeJsonFile = require('write-json-file');

const inputOrdersFile = './resources/orders.csv';
const inputLockedFile = './resources/locked.csv';
const orderReportJson = './scratch/orders_report.json';
const exceptionReportJson = './scratch/order_exceptions.json';
const exceptionReportCsv = './scratch/order_exceptions.csv';

const orderExceptionMaxSecs: number = 60 * 5;
const orderMonitor = new OrderMonitor(orderExceptionMaxSecs, MarketHours.ALL);
runSimulation();


/**
 * Loads locked orders to pass
 *
function loadLockedOrders() {
  fastCsv
        .fromPath(inputLockedFile, {headers: true})
        .on('data', order => {
          //orderMonitor.addLockedRevision(order);
        })
        .on('end', () => {
          runSimulation();
        });
}*/

/**
 * Run simulation with pushing all waiting orders and then popping them
 */
function runSimulation() {
  fastCsv
        .fromPath(inputOrdersFile, {headers: true})
        .on('data', order => {

          var newOrder = createOrderFromCSV(order);
          orderMonitor.pushOrder(newOrder);
        })
        .on('end', () => {
          while (orderMonitor.popOrder()) {}
          exportReports();
        });
}

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