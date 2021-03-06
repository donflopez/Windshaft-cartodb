var dot = require('dot');
dot.templateSettings.strip = false;

var BaseWidget = require('./base');

var TYPE = 'list';

var listSqlTpl = dot.template('select {{=it._columns}} from ({{=it._query}}) as _cdb_list');

/**
{
    type: 'list',
    options: {
        columns: ['name', 'description']
    }
}
*/

function List(query, options) {
    options = options || {};

    if (!Array.isArray(options.columns)) {
        throw new Error('List expects `columns` array in widget options');
    }

    BaseWidget.apply(this);

    this.query = query;
    this.columns = options.columns;
}

List.prototype = new BaseWidget();
List.prototype.constructor = List;

module.exports = List;

List.prototype.sql = function(psql, override, callback) {
    if (!callback) {
        callback = override;
    }

    var listSql = listSqlTpl({
        _query: this.query,
        _columns: this.columns.join(', ')
    });

    return callback(null, listSql);
};

List.prototype.format = function(result) {
    return {
        rows: result.rows
    };
};

List.prototype.getType = function() {
    return TYPE;
};

List.prototype.toString = function() {
    return JSON.stringify({
        _type: TYPE,
        _query: this.query,
        _columns: this.columns.join(', ')
    });
};
