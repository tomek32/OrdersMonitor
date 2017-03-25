/**
 * Created by Tom on 2017-03-18.
 */
import {MarketHours} from "./Order";
import Order from './Order';
import OrderMonitor from './OrderMonitor';

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
loadLockedOrders();


/**
 * Loads locked orders to pass
 */
function loadLockedOrders() {
  fastCsv
        .fromPath(inputLockedFile, {headers: true})
        .on('data', order => {
          orderMonitor.addLockedRevision(order);
        })
        .on('end', () => {
          runSimulation();
        });
}

/**
 * Run simulation with pushing all waiting orders and then popping them
 */
function runSimulation() {
  fastCsv
        .fromPath(inputOrdersFile, {headers: true})
        .on('data', order => {
          orderMonitor.pushOrder(order);
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