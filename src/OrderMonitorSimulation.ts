/**
 * Created by Tom on 2017-03-18.
 */
import {OrderMarketHours} from "./Order";
import OrderMonitor from './OrderMonitor';
import OrderStream from './OrderStream';


const config = require('config');
const fs = require('fs');
const json2csv = require('json2csv');
const writeJsonFile = require('write-json-file');


/**
 * Export order monitor reports
 */
function exportReports() {
  let json: any, csv: any;

  // Export orders report
  writeJsonFile(configParms.orderReportJsonFile, orderMonitor.getReport()).then(() => {});

  csv = json2csv(getExportOrdersReport());
  fs.writeFile(configParms.orderReportCsvFile, csv, function(err) {});

  // Export order exceptions
  writeJsonFile(configParms.exceptionReportJsonFile, orderStream.getOrderExceptions()).then(() => {});

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

/**
 * Load the config parameters
 */
function loadConfig(): void {
  switch (config.get('OrdersMonitor.InputFile.includeLockedOrders')) {
    case 'true':
      configParms.includeLockedOrders = true;
      break;
    case 'false':
      configParms.includeLockedOrders = false;
      break;
    default:
  }

  configParms.includeMarketHours = config.get('OrdersMonitor.OrderReport.includeMarketHours');
  configParms.orderReportJsonFile = config.get('OrdersMonitor.OrderReport.jsonFile');
  configParms.orderReportCsvFile = config.get('OrdersMonitor.OrderReport.csvFile');

  configParms.orderExceptionMaxSecs = config.get('OrdersMonitor.OrderExceptions.maxSecs');
  configParms.exceptionReportJsonFile = config.get('OrdersMonitor.OrderExceptions.jsonFile');
  configParms.exceptionReportCsvFile = config.get('OrdersMonitor.OrderExceptions.csvFile');
}

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

let configParms: any = {};
loadConfig();
let orderMonitor = new OrderMonitor(configParms.orderExceptionMaxSecs, configParms.includeMarketHours);
let orderStream: OrderStream = new OrderStream(simulationCallback, configParms.includeLockedOrders);