require('../support/test_helper');

var assert = require('assert');
var RedisPool = require('redis-mpool');
var cartodbRedis = require('cartodb-redis');
var PgConnection = require(__dirname + '/../../lib/cartodb/backends/pg_connection');
var PgQueryRunner = require('../../lib/cartodb/backends/pg_query_runner');
var OverviewsMetadataApi = require('../../lib/cartodb/api/overviews_metadata_api');
var FilterStatsApi = require('../../lib/cartodb/api/filter_stats_api');
var MapConfigOverviewsAdapter = require('../../lib/cartodb/models/mapconfig/adapter/mapconfig-overviews-adapter');

var redisPool = new RedisPool(global.environment.redis);
var metadataBackend = cartodbRedis({pool: redisPool});
var pgConnection = new PgConnection(metadataBackend);
var pgQueryRunner = new PgQueryRunner(pgConnection);
var overviewsMetadataApi = new OverviewsMetadataApi(pgQueryRunner);
var filterStatsApi = new FilterStatsApi(pgQueryRunner);

var mapConfigOverviewsAdapter = new MapConfigOverviewsAdapter(overviewsMetadataApi, filterStatsApi);

describe('MapConfigOverviewsAdapter', function() {

    it('should not modify layers for which no overviews are available', function(done) {
        var sql = 'SELECT * FROM test_table';
        var cartocss = '#layer { marker-fill: black; }';
        var cartocss_version = '2.3.0';
        var layer_without_overviews = {
            type: 'cartodb',
            options: {
                sql: sql,
                cartocss: cartocss,
                cartocss_version: cartocss_version
            }
        };

        var _mapConfig = {
            layers: [layer_without_overviews]
        };

        var params = {};
        var context = {};

        mapConfigOverviewsAdapter.getMapConfig('localhost', _mapConfig, params, context, function(err, mapConfig) {
            assert.ok(!err);
            var layers = mapConfig.layers;
            assert.equal(layers.length, 1);
            assert.equal(layers[0].type, 'cartodb');
            assert.equal(layers[0].options.sql, sql);
            assert.equal(layers[0].options.cartocss, cartocss);
            assert.equal(layers[0].options.cartocss_version, cartocss_version);
            assert.equal(layers[0].options.overviews, undefined);
            done();
        });
    });
});

describe('MapConfigOverviewsAdapter', function() {

    it('should add overviews metadata for layers using tables with overviews', function(done) {
        var sql = 'SELECT * FROM test_table_overviews';
        var cartocss = '#layer { marker-fill: black; }';
        var cartocss_version = '2.3.0';
        var layer_with_overviews = {
            type: 'cartodb',
            options: {
                sql: sql,
                cartocss: cartocss,
                cartocss_version: cartocss_version
            }
        };

        var _mapConfig = {
            layers: [layer_with_overviews]
        };

        var params = {};
        var context = {};

        mapConfigOverviewsAdapter.getMapConfig('localhost', _mapConfig, params, context, function(err, mapConfig) {
            assert.ok(!err);
            var layers = mapConfig.layers;
            assert.equal(layers.length, 1);
            assert.equal(layers[0].type, 'cartodb');
            assert.equal(layers[0].options.sql, sql);
            assert.equal(layers[0].options.cartocss, cartocss);
            assert.equal(layers[0].options.cartocss_version, cartocss_version);
            assert.ok(layers[0].options.query_rewrite_data);
            var expected_data = {
                overviews: {
                    test_table_overviews: {
                        schema: 'public',
                        1: { table: '_vovw_1_test_table_overviews' },
                        2: { table: '_vovw_2_test_table_overviews' }
                    }
                }
            };
            assert.deepEqual(layers[0].options.query_rewrite_data, expected_data);
            done();
        });
    });
});
