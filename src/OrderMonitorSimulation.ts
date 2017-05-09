/**
 * Created by Tom on 2017-03-18.
 */
import {OrderMarketHours} from "./Order";
import OrderMonitor from './OrderMonitor';
import OrderStream from './OrderStream';


const fs = require('fs');
const json2csv = require('json2csv');
const writeJsonFile = require('write-json-file');

const orderReportJsonFile: string = './output/orders_report.json';
const orderReportCsvFile: string  = './output/orders_report.csv';
const exceptionReportJsonFile: string  = './output/order_exceptions.json';
const exceptionReportCsvFile: string  = './output/order_exceptions.csv';

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

  // Export orders report
  writeJsonFile(orderReportJsonFile, orderMonitor.getReport()).then(() => {});

  csv = json2csv(getExportOrdersReport());
  fs.writeFile(orderReportCsvFile, csv, function(err) {});

  // Export order exceptions
  writeJsonFile(exceptionReportJsonFile, orderStream.getOrderExceptions()).then(() => {});

  //TODO: add export of order exceptions
  //csv = json2csv({data: json});
  //fs.writeFile(exceptionReportCsvFile, csv, function(err) {});
}

function getExportOrdersReport(): any {
  let report: any, json: any, dateReport: any;
  let fields: string[], fieldNames: string[];

  // Export monitor report
  report = orderMonitor.getReport();
  fields = ['Date', 'All', '_1_',
            'WEB', 'WBR', 'ATT', 'MBL', 'TMAX', 'TALK', 'TBL', 'UNKNOWN', '_2_',
            'ATT_RMP1', '_3_',
            'RMPA', 'RMP1', 'RMP2', 'RMP3', 'RMP4', 'RM', '_4_',
            'SPL', 'OCO', 'OTA', 'FTO', 'MLO', '_5_',
            'MARKET', 'LIMIT', 'STOP_MARKET', 'STOP_LIMIT', 'TRAILING_STOP_MARKET', 'TRAILING_STOP_LIMIT'];
  fieldNames = ['Date', 'All Channels', '',
                'WebBroker Legacy', 'WebBroker', 'Advanced Dashboard', 'Mobile', 'Telemax', 'TalkBroker', 'Tablet', 'Unknown', '',
                'AD + RMP1', '',
                'RMPA', 'RMP1', 'RMP2', 'RMP3', 'RMP4', 'RM**', '',
                'Simple', 'OCO', 'OTA', 'FTO', 'Multi-Leg', '',
                'Market', 'Limit', 'Stop Market', 'Stop Limit', 'Trailing Stop Market', 'Trailing Stop Limit'];

  json = [];
  Object.keys(report).forEach(dateKey => {
    dateReport = {};
    dateReport.Date = dateKey;
    dateReport.All = report[dateKey].numOrders;
    dateReport._1_ = '';

    Object.keys(report[dateKey].numOrdersByChannel).forEach(channelKey => {
      dateReport[channelKey] = report[dateKey].numOrdersByChannel[channelKey];
    });
    dateReport._2_ = '';

    dateReport.ATT_RMP1 = report[dateKey].numOrdersByCustom.ATT_RMP1;
    dateReport._3_ = '';

    Object.keys(report[dateKey].numOrdersByRRCode).forEach(rrCodeKey => {
      dateReport[rrCodeKey] = report[dateKey].numOrdersByRRCode[rrCodeKey];
    });
    dateReport._4_ = '';

    Object.keys(report[dateKey].numOrdersByStrategy).forEach(strategyKey => {
      dateReport[strategyKey] = report[dateKey].numOrdersByStrategy[strategyKey];
    });
    dateReport._5_ = '';
    Object.keys(report[dateKey].numOrdersByOrderType).forEach(orderTypeKey => {
      dateReport[orderTypeKey] = report[dateKey].numOrdersByOrderType[orderTypeKey];
    });

    if (dateKey == 'totals')
      dateReport['Date'] = 'Totals';

    json.push(dateReport);
  });

  return {data: json, fields: fields, fieldNames: fieldNames};
}

let orderMonitor = new OrderMonitor(orderExceptionMaxSecs, OrderMarketHours.ALL);
let orderStream: OrderStream = new OrderStream(simulationCallback, true);