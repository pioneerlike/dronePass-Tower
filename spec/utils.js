var path = require('path');
var expect = require('chai').expect;
var pg = require(path.join(__dirname, '..', './server/db/config.js'));
var utils = require(path.join(__dirname, '..', './server/db/utils.js'));

var TIME_OUT = 250;

var pathCoords3 = [[1886555.8045440218,614332.6659284362],[1886800.1148899796,612866.8038526904],[1888455.9961236925,613328.2789506103],[1887953.8026347796,612513.9111307516]];
var callSign = 'Test';//INSERT INTO drone (call_sign, drone_type, max_velocity) VALUES ('Test', 'Amazon', 10);
var droneOperatorId = 12345;//INSERT INTO drone_operator (id, operator_name) VALUES (12345, 'Test');
    // INSERT INTO land_owner (id, login) VALUES (12345, 'yo@yo.yo');
    // INSERT INTO land_owner (id, login) VALUES (23456, 'bo@bo.bo');
    // INSERT INTO land_owner (id, login) VALUES (34567, 'mo@mo.mo');
    // registerAddress(12345, 70371, '04:05:06', '10:05:06');
    // registerAddress(23456, 70199, null, null);
    // registerAddress(34567, 70640, '04:05:06', '10:05:06');
var request = {
  callSign : callSign,
  flightStart : '1999-01-08 04:05:06',
  flightEnd : '1999-01-08 10:05:06',
  // droneOperatorId : droneOperatorId,
  path : pathCoords3
};

describe('addFlightPath()', function () {
  'use strict';

  beforeEach(function(done) {
    request.flightStart = '1999-01-08 04:05:06';
    request.flightEnd = '1999-01-08 10:05:06';
    done();
  });

  it('exists addFlightPath', function () {
    expect(utils.addFlightPath).to.be.a('function');
  });

  it('should fail to add a flight path with incorrect time order', function(done) {
    var errResult;

    request.flightStart = "1999-01-08 05:05:06";
    request.flightEnd = "1999-01-08 04:05:06";
    
    utils.addFlightPath(request).exec(function(err, r) {
      errResult = err.routine;
    });

    setTimeout(function() {
      expect(errResult).to.equal('ExecConstraints');
      done();
    }, TIME_OUT);
  });

  it('should add flight path', function(done) {
    var flightPathId;
    utils.addFlightPath(request).exec(function(err, r) {
      flightPathId = r.rows[0].gid;
      pg('flight_path')
        .where('gid',flightPathId)
        .delete().exec(function(err, r) {
      });
    });

    setTimeout(function() {
      expect(flightPathId).to.be.at.least(0);
      done();
    }, TIME_OUT);
  });
});

describe('getPathConflicts()', function() {
  it('exists getPathConflicts', function () {
    expect(utils.getPathConflicts).to.be.a('function');
  });

  it('should return restricted geometries from getPathConflicts', function (done) {
    var expected = [ { lot_geom: 'MULTIPOLYGON(((-122.152439944457 37.7024361162133,-122.15254094361 37.7023939645878,-122.152617430206 37.7023620428772,-122.152770133018 37.7025930211517,-122.152592646877 37.7026670950637,-122.152439944457 37.7024361162133)))' } ];
    var result;
    var resultsLength;
    utils.getPathConflicts(request).exec(function(err, r) {
      if (err) {
        console.log(err);
        expect(err).to.equal('');
        done();
        return;
      }

      resultsLength = r.length;
      utils.getParcelGeometryText(r[0].gid, 'parcel_wgs84').exec(function(err, r) {
        result = r;
      });
    });
    
    setTimeout(function() {
      expect(result[0].lot_geom).to.equal(expected[0].lot_geom);
      expect(resultsLength).to.equal(1);
      done();
    }, TIME_OUT);    
  });

  it('should not return geometries from getPathConflicts', function (done) {
    var pathCoordsWrong = [[-1886555.8045440218,564332.6659284362],[1886800.1148899796,562866.8038526904],[1888455.9961236925,563328.2789506103],[1887953.8026347796,562513.9111307516]];
    request.path = pathCoordsWrong;
    var result;
    utils.getPathConflicts(request).exec(function(err, r) {
      result = r;
    });
    
    setTimeout(function() {
      expect(result.length).to.equal(0);
      done();
    }, TIME_OUT);    
  });

})
