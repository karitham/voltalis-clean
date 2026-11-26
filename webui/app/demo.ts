// @ts-nocheck
/* In-memory demo transport. Shapes follow the API; every id, name and value is invented. */
import { siteOf } from "./core";

export function createDemo() {
  let data = null;

function fixture() {
  /* Synthetic home: invented ids, names and values. Only the *shape* follows the API. */
  var ranges = function (a, b, mode, temp, isOn) {
    return { from: a, to: b, mode: mode, temperature: temp === undefined ? null : temp, isOn: isOn === undefined ? true : isOn };
  };
  var day = function (n, rs) { return { id: 4100 + n, dayNumber: n, ranges: rs }; };
  var plan = function (id, aid, name, days, modes) {
    return { id: id, idAppliance: aid, nameAppliance: name, applianceType: 'HEATER',
      availableModes: modes || ['ECO', 'CONFORT', 'TEMPERATURE', 'HORS_GEL'], dailyprogs: days };
  };
  var week = function (f) { return [1, 2, 3, 4, 5, 6, 7].map(function (n) { return day(n, f(n)); }); };
  return {
    account: { defaultSite: { id: 42, name: 'Home' }, otherSites: [] },
    /* Shape copied from real traffic: idManualSetting stays null (the manualsetting list
       is keyed by idAppliance), heatingLevel is a level, every range carries a
       temperature, and a day ends at 23:59. */
    appliances: [
      { id: 101, name: 'Living room', applianceType: 'HEATER', modulatorType: 'VX_WIRE', heatingLevel: 3,
        availableModes: ['ECO', 'CONFORT', 'TEMPERATURE', 'HORS_GEL'],
        programming: { progType: 'USER', progName: 'program.default', idManualSetting: null, idPlanning: 9001,
          isOn: true, untilFurtherNotice: null, mode: 'ECO', endDate: null,
          temperatureTarget: 18.5, defaultTemperature: 17.0 } },
      { id: 102, name: 'Bedroom', applianceType: 'HEATER', modulatorType: 'VX_WIRE', heatingLevel: 0,
        availableModes: ['ECO', 'CONFORT', 'TEMPERATURE', 'HORS_GEL'],
        programming: { progType: 'USER', progName: 'program.default', idManualSetting: null, idPlanning: 9002,
          isOn: false, untilFurtherNotice: null, mode: 'HORS_GEL', endDate: null,
          temperatureTarget: 12.5, defaultTemperature: 16.0 } },
      { id: 103, name: 'Office', applianceType: 'HEATER', modulatorType: 'VX_WIRE', heatingLevel: 3,
        availableModes: ['ECO', 'CONFORT', 'TEMPERATURE', 'HORS_GEL'],
        programming: { progType: 'MANUAL', idManualSetting: null, idPlanning: 9001, isOn: true,
          untilFurtherNotice: false, mode: 'TEMPERATURE', endDate: '2026-11-26T21:30:00',
          temperatureTarget: 20.5, defaultTemperature: 17.0 } },
      { id: 104, name: 'Hallway', applianceType: 'HEATER', modulatorType: 'VX_WIRE', heatingLevel: 3,
        availableModes: ['ECO', 'CONFORT', 'TEMPERATURE', 'HORS_GEL'],
        programming: { progType: 'QUICK', progName: 'quicksettings.athome', idManualSetting: null, idPlanning: 9002,
          isOn: true, untilFurtherNotice: true, mode: 'CONFORT', endDate: null,
          temperatureTarget: 18.0, defaultTemperature: 17.5 } },
      { id: 105, name: 'Water heater', applianceType: 'WATER_HEATER', modulatorType: 'ON_OFF', heatingLevel: 1,
        availableModes: ['NORMAL', 'ECO'],
        programming: { progType: 'USER', progName: 'program.default', idManualSetting: null, idPlanning: 9003,
          isOn: true, untilFurtherNotice: null, mode: 'NORMAL', endDate: null, defaultTemperature: 55.0 } },
      { id: 106, name: 'Utility room', applianceType: 'HEATER', modulatorType: 'VX_WIRE', heatingLevel: 0,
        availableModes: ['ECO', 'CONFORT', 'TEMPERATURE', 'HORS_GEL'],
        programming: { progType: 'MANUAL', idManualSetting: null, isOn: false, untilFurtherNotice: true,
          mode: 'HORS_GEL', endDate: null, temperatureTarget: 11.0, defaultTemperature: 12.0 } }
    ],
    autodiag: [
      { csApplianceId: 101, csModulatorId: 7101, status: 'OK', consumptionStatus: 'OK', diagTestEnabled: true },
      { csApplianceId: 102, csModulatorId: 7102, status: 'NO_CONSUMPTION', consumptionStatus: 'NO_CONSUMPTION', diagTestEnabled: true },
      { csApplianceId: 103, csModulatorId: 7103, status: 'OK', consumptionStatus: 'OK', diagTestEnabled: false },
      { csApplianceId: 104, csModulatorId: 7104, status: 'OK', consumptionStatus: 'OK', diagTestEnabled: true },
      { csApplianceId: 105, csModulatorId: 7105, status: 'NOK', consumptionStatus: 'COMM_ERROR', diagTestEnabled: true },
      { csApplianceId: 106, csModulatorId: 7106, status: 'COMM_ERROR', diagTestEnabled: true }
    ],
    /* In-memory only: which appliance has a self-test running, and how far it got. */
    testing: {},
    manual: [
      { id: 701, enabled: false, idAppliance: 101, applianceName: 'Living room', applianceType: 'HEATER',
        untilFurtherNotice: false, isOn: true, mode: 'CONFORT', heatingLevel: 0,
        endDate: '2026-11-20T08:05:00', temperatureTarget: 18.5 },
      { id: 702, enabled: false, idAppliance: 102, applianceName: 'Bedroom', applianceType: 'HEATER',
        untilFurtherNotice: false, isOn: true, mode: 'CONFORT', heatingLevel: 0,
        endDate: '2026-11-20T08:05:00', temperatureTarget: 12.5 },
      { id: 703, enabled: true, idAppliance: 103, applianceName: 'Office', applianceType: 'HEATER',
        untilFurtherNotice: false, isOn: true, mode: 'TEMPERATURE', heatingLevel: 3,
        endDate: '2026-11-26T21:30:00', temperatureTarget: 20.5 },
      { id: 704, enabled: false, idAppliance: 104, applianceName: 'Hallway', applianceType: 'HEATER',
        untilFurtherNotice: false, isOn: true, mode: 'CONFORT', heatingLevel: 0,
        endDate: '2026-11-20T08:05:00', temperatureTarget: 18.0 },
      { id: 705, enabled: false, idAppliance: 105, applianceName: 'Water heater', applianceType: 'WATER_HEATER',
        untilFurtherNotice: false, isOn: true, mode: 'NORMAL', heatingLevel: 0, endDate: null },
      { id: 706, enabled: true, idAppliance: 106, applianceName: 'Utility room', applianceType: 'HEATER',
        untilFurtherNotice: true, isOn: false, mode: 'HORS_GEL', heatingLevel: 0,
        endDate: null, temperatureTarget: 11.0 }
    ],
    quick: [
      { id: 31, name: 'quicksettings.athome', untilFurtherNotice: false, modeEndDate: '2025-12-28T01:01:00',
        enabled: true, appliancesSettings: [] },
      { id: 32, name: 'quicksettings.shortleave', untilFurtherNotice: false, modeEndDate: '2025-12-28T01:01:00',
        enabled: false, appliancesSettings: [] },
      { id: 33, name: 'quicksettings.longleave', untilFurtherNotice: false, modeEndDate: '2025-12-28T01:01:00',
        enabled: false, appliancesSettings: [] }
    ],
    programs: [{ id: 205, name: 'program.default', enabled: true }, { id: 206, name: 'Mid-season', enabled: false }],
    details: {
      205: { id: 205, name: 'program.default', enabled: true, plannings: [
        plan(9001, 101, 'Living room', week(function (n) {
          return n < 6
            ? [ranges('00:00', '06:00', 'HORS_GEL', 12.5), ranges('06:00', '08:30', 'CONFORT', 18.5),
               ranges('08:30', '16:30', 'ECO', 17.0), ranges('16:30', '22:00', 'CONFORT', 18.5),
               ranges('22:00', '23:59', 'HORS_GEL', 12.5)]
            : [ranges('00:00', '09:30', 'HORS_GEL', 12.5), ranges('09:30', '12:00', 'CONFORT', 18.5),
               ranges('12:00', '20:30', 'ECO', 17.0), ranges('20:30', '23:59', 'CONFORT', 18.5)];
        })),
        plan(9002, 102, 'Bedroom', week(function (n) {
          return n < 6
            ? [ranges('00:00', '07:00', 'HORS_GEL', 12.5), ranges('07:00', '09:00', 'CONFORT', 16.0),
               ranges('09:00', '20:00', 'ECO', 15.0), ranges('20:00', '22:00', 'CONFORT', 16.0),
               ranges('22:00', '23:59', 'HORS_GEL', 12.5)]
            : [ranges('00:00', '10:00', 'HORS_GEL', 12.5), ranges('10:00', '21:00', 'ECO', 15.0),
               ranges('21:00', '23:59', 'CONFORT', 16.0)];
        })),
        plan(9003, 105, 'Water heater', week(function () {
          return [ranges('00:00', '05:30', 'ECO', 52.0), ranges('05:30', '23:59', 'NORMAL', 55.0)];
        }), ['NORMAL', 'ECO'])
      ] },
      206: { id: 206, name: 'Mid-season', enabled: false, plannings: [
        plan(9101, 101, 'Living room', week(function () {
          return [ranges('00:00', '08:00', 'ECO', 17.0), ranges('08:00', '11:00', 'CONFORT', 18.0),
                  ranges('11:00', '23:59', 'ECO', 17.0)];
        }))
      ] }
    },
    state: { id: 205, programType: 'USER', programName: 'program.default', untilFurtherNotice: true, endDate: null },
    /* Shapes invented on purpose: a nested point list for the live figure, so the
       tolerant parser is what is exercised, and no coordinates for the location. */
    welcome: { externalTemp: 9.5, iconName: 'CLOUDY', systemStatus: 'OK', notificationsNumber: 1, messageTitle: 'Heating season', messageText: 'Your schedule is active.' },
    realtime: { mode: 'TEN_MINUTES', numPoints: 1, points: [{ date: '2026-11-26T13:20:00', value: 1450 }] },
    geoloc: { radius: 1200, activatedByUser: true, latitude: null, longitude: null }
  };
}

/* A launched test reports TEST_IN_PROGRESS on the first read after the POST and OK on
   the next one, so the deferred refresh shows a change and Refresh shows the result. */
function autodiag() {
  data.autodiag.forEach(function (row) {
    var key = String(row.csApplianceId);
    if (data.testing[key] === 'next') {
      row.status = 'OK';
      delete data.testing[key];
    } else if (data.testing[key] === 'running') {
      row.status = 'TEST_IN_PROGRESS';
      data.testing[key] = 'next';
    }
  });
  return data.autodiag;
}

/* Synthetic consumption series: one point per hour/day/month, depending on the period. */
  function demoConsumption(period, anchor) {
    var count = period === 'day' ? 24 : period === 'week' ? 7 : period === 'month' ? 30 : 12;
    var points = [];
    var total = 0;
    for (var i = 0; i < count; i++) {
      var wh = 620 + ((i * 173) % 940);
      total += wh;
      var stamp;
      if (period === 'day') stamp = anchor + 'T' + String(i).padStart(2, '0') + ':00:00';
      else if (period === 'week') {
        var d = new Date(anchor + 'T00:00:00'); d.setDate(d.getDate() + i);
        stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      } else if (period === 'month') stamp = anchor + '-' + String(i + 1).padStart(2, '0');
      else stamp = anchor + '-' + String(i + 1).padStart(2, '0');
      points.push({
        stepTimestampOnSite: stamp,
        totalConsumptionInWh: wh,
        totalConsumptionInCurrency: Math.round(wh * 0.00021 * 100) / 100,
        estimatedConsumptionInWh: 0,
        peakHourConsumptionInWh: Math.round(wh * 0.55),
        offPeakHourConsumptionInWh: Math.round(wh * 0.45),
        temperatureInCelsiusDegree: 6 + ((i * 17) % 50) / 10
      });
    }
    var per = {};
    [101, 102, 103].forEach(function (applianceId, index) {
      per[applianceId] = points.map(function (point) {
        return {
          stepTimestampOnSite: point.stepTimestampOnSite,
          totalConsumptionInWh: Math.round(point.totalConsumptionInWh * (0.42 - index * 0.09))
        };
      });
    });
    return {
      status: 'OK',
      summary: {
        stepTimestampOnSite: anchor,
        totalConsumptionInWh: total,
        totalConsumptionInCurrency: Math.round(total * 0.00021 * 100) / 100,
        estimatedConsumptionInWh: Math.round(total * 0.94),
        peakHourConsumptionInWh: Math.round(total * 0.55),
        offPeakHourConsumptionInWh: Math.round(total * 0.45),
        temperatureInCelsiusDegree: 8.4
      },
      dataPoints: points,
      perAppliance: per,
      breakdown: { categories: [], disaggregationCategories: [] }
    };
  }

  function apiRaw(model, method, path, body) {
  if (!data) data = fixture();
  var site = siteOf(model);
  var match;
  if (method === 'GET' && path === '/api/account/me') return data.account;
  if (method === 'GET' && path === '/api/site') return [data.account.defaultSite];
  if (method === 'GET' && path === '/api/site/' + site + '/managed-appliance') return data.appliances;
  if (method === 'GET' && path === '/api/site/' + site + '/manualsetting') return data.manual;
  if (method === 'GET' && path === '/api/site/' + site + '/quicksettings') return data.quick;
  if (method === 'GET' && path === '/api/site/' + site + '/programming/program') return data.programs;
  if (method === 'GET' && path === '/api/site/' + site + '/programming/state') return data.state;
  if (method === 'GET' && path === '/api/site/' + site + '/autodiag') return autodiag();
  if (method === 'GET' && path === '/api/site/' + site + '/consumption/welcome') return data.welcome;
  if (method === 'GET' && path.indexOf('/api/site/' + site + '/consumption/realtime') === 0) return data.realtime;
  if (method === 'GET' && path === '/api/site/' + site + '/geoloc') return data.geoloc;
  if (method === 'PUT' && path === '/api/site/' + site + '/geoloc') {
    data.geoloc = Object.assign({}, data.geoloc, body);
    return data.geoloc;
  }
  match = path.match(/\/programming\/program\/([0-9]+)$/);
  if (method === 'GET' && match) return data.details[match[1]] || null;
  match = path.match(/\/managed-appliance\/([0-9]+)$/);
  if (method === 'PUT' && match) {
    var renamed = data.appliances.find(function (a) { return String(a.id) === match[1]; });
    if (renamed && body && typeof body.name === 'string') renamed.name = body.name.trim();
    return renamed ? [renamed] : null;
  }
  match = path.match(/\/manualsetting\/([0-9]+)$/);
  if (method === 'PUT' && match) {
    var appliance = data.appliances.find(function (x) { return x.id === body.idAppliance; });
    if (appliance) {
      appliance.programming = Object.assign({}, appliance.programming, {
        mode: body.mode, isOn: body.isOn, progType: body.enabled ? 'MANUAL' : 'USER',
        endDate: body.endDate, untilFurtherNotice: body.untilFurtherNotice,
        temperatureTarget: body.temperatureTarget, idManualSetting: Number(match[1])
      });
    }
    data.manual = data.manual.filter(function (x) { return x.id !== Number(match[1]); });
    if (body.enabled) data.manual.push(Object.assign({}, body, { id: Number(match[1]) }));
    return body;
  }
  match = path.match(/\/quicksettings\/([0-9]+)$/);
  if (method === 'PUT' && match) {
    /* Saving a preset changes the duration and the per-appliance rows; it does not
       start anything, which is what the separate enable call is for. */
    var edited = data.quick.find(function (q) { return q && q.id === Number(match[1]); });
    if (edited) {
      edited.untilFurtherNotice = !!body.untilFurtherNotice;
      edited.modeEndDate = body.modeEndDate;
      if (Array.isArray(body.appliancesSettings)) edited.appliancesSettings = body.appliancesSettings;
    }
    return edited || null;
  }
  match = path.match(/\/autodiag\/modulator\/([0-9]+)\/selftest$/);
  if (method === 'POST' && match) {
    var tested = data.autodiag.find(function (d) { return String(d.csModulatorId) === String(match[1]); });
    if (tested) {
      tested.status = 'TEST_IN_PROGRESS';
      data.testing[String(tested.csApplianceId)] = 'running';
    }
    return {};
  }
  match = path.match(/\/quicksettings\/([0-9]+)\/enable$/);
  if (method === 'PUT' && match) {
    /* One enabled at a time is the backend's rule; the answer carries only flags. */
    data.quick.forEach(function (q) { q.enabled = q.id === Number(match[1]) && !!body.enabled; });
    if (body.enabled) data.programs.forEach(function (p) { p.enabled = false; });
    return data.quick.map(function (q) { return { id: q.id, enabled: !!q.enabled }; });
  }
  match = path.match(/\/programming\/program\/([0-9]+)$/);
  if (method === 'PUT' && match) {
    var program = data.programs.find(function (p) { return p.id === Number(match[1]); });
    if (program) { program.name = body.name; program.enabled = body.enabled; }
    if (body.enabled) {
      data.quick.forEach(function (q) { q.enabled = false; });
      data.programs.forEach(function (x) { if (x.id !== Number(match[1])) x.enabled = false; });
    }
    return data.programs;
  }
  if (method === 'POST' && path === '/api/site/' + site + '/programming/program') {
    var nextId = Math.max.apply(null, data.programs.map(function (p) { return p.id; })) + 1;
    var created = { id: nextId, name: body.name, enabled: false };
    data.programs.push(created);
    /* A body with an id duplicates that program, plannings and all. */
    var sourceDetail = body.id == null ? null : data.details[body.id];
    data.details[nextId] = {
      id: nextId, name: body.name, enabled: false,
      plannings: sourceDetail ? JSON.parse(JSON.stringify(sourceDetail.plannings)) : []
    };
    return created;
  }
  match = path.match(/\/programming\/program\/([0-9]+)$/);
  if (method === 'DELETE' && match) {
    data.programs = data.programs.filter(function (p) { return p.id !== Number(match[1]); });
    delete data.details[Number(match[1])];
    return null;
  }
  if (method === 'PUT' && path === '/api/site/' + site + '/programming/planning/') {
    var targetDetail = data.details[body.idProgram];
    if (!targetDetail) return [];
    var sourcePlan = (targetDetail.plannings || []).find(function (pl) { return pl.id === body.idSource; });
    if (!sourcePlan) return [];
    var nextPlanningId = (targetDetail.plannings || []).reduce(function (max, pl) {
      return Math.max(max, Number(pl.id) || 0);
    }, 9000) + 1;
    var nextDay = 5000;
    var made = [];
    (body.idAppliances || []).forEach(function (applianceId) {
      var appliance = data.appliances.find(function (a) { return a.id === applianceId; });
      if (!appliance) return;
      targetDetail.plannings = (targetDetail.plannings || []).filter(function (pl) {
        return pl.idAppliance !== applianceId;
      });
      var copied = JSON.parse(JSON.stringify(sourcePlan));
      copied.id = nextPlanningId++;
      copied.idAppliance = appliance.id;
      copied.nameAppliance = appliance.name;
      copied.applianceType = appliance.applianceType || copied.applianceType;
      copied.availableModes = (appliance.availableModes || copied.availableModes || []).slice();
      copied.dailyprogs = (copied.dailyprogs || []).map(function (d) {
        return Object.assign({}, d, { id: nextDay++ });
      });
      targetDetail.plannings.push(copied);
      made.push(copied);
    });
    return made;
  }
  if (method === 'PUT' && path === '/api/site/' + site + '/programming/dailyprog') {
    var detail = model.data.programDetail && data.details[model.data.programDetail.id];
    var plannings = (detail && detail.plannings) || [];
    var writing = plannings.find(function (pl) { return pl.idAppliance === model.ui.selectedApplianceId; }) || plannings[0];
    if (writing) writing.dailyprogs = body;
    return body;
  }
  var consumption = path.match(/\/consumption\/(day|week|month|year)\/([^/]+)\/full-data$/);
  if (method === 'GET' && consumption) return demoConsumption(consumption[1], consumption[2]);
  if (method === 'GET' && path === '/api/site/' + site + '/temperature-sensor') {
    return { hasTemperatureSensor: true, redirectionLink: '' };
  }
  if (method === 'POST' && path === '/api/site/' + site + '/autodiag') return {};
  if (method === 'GET' && path === '/api/site/' + site + '/savings') {
    return { siteId: site, startDate: '2026-01-01', hasNoPrograming: false,
      energyPeakHourSavingsInKWh: 42.5, energyPeakHourSavingsInCurrency: 8.9,
      energyOffPeakHourSavingsInKWh: 31.2, energyOffPeakHourSavingsInCurrency: 6.1,
      energyTotalSavingsInKWh: 73.7, energyTotalSavingsInCurrency: 15.0, co2SavingInKg: 4.8 };
  }
  if (method === 'GET' && path === '/api/site/' + site + '/objective') {
    return { yearlyObjectiveInWh: 650000, yearlyObjectiveInCurrency: 135 };
  }
  if (method === 'GET' && path === '/api/' + site + '/rte-alerts') {
    return [{ alertLevel: 'YELLOW', from: '2026-11-26T06:00:00', to: '2026-11-26T10:00:00' }];
  }
  if (method === 'GET' && path === '/api/site/' + site + '/energymanager') {
    return { hasEnergyManager: true };
  }
  return null;
}

  /* A real response is freshly parsed JSON, not a shared in-memory object. Returning
     copies is what lets keyed views (For) see a new list after a write. */
  function clone(value) {
    return value === undefined || value === null ? value : JSON.parse(JSON.stringify(value));
  }
  function api(model, method, path, body) {
    return clone(apiRaw(model, method, path, body));
  }

  return {
    api,
    reset() { data = null; },
  };
}
