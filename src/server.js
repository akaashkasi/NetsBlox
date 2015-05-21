'use strict';
var express = require('express'),
    app = express(),
    argv = require('yargs').argv,
    port = process.env.PORT || 8080,
    wsPort = process.env.WS_PORT || 5432,
    NetsBlocksServer = require('./NetsBlocksServer');

console.log('port:', port);
app.use(express.static(__dirname + '/client/'));

app.get('/', function(req, res) {
    res.redirect('/snap.html');
});

app.listen(port);

console.log('NetsBlocks server listening on port '+port);

// Parse cmd line options for group manager
var fs = require('fs'),
    path = require('path');

var getGroupManagerDict = function() {
    var result = {},
        files = fs.readdirSync(__dirname + '/GroupManagers'),
        name;

    for (var i = files.length; i--;) {
        if (path.extname(files[i]) === '.js') {
            name = files[i].toLowerCase().replace('manager', '');
            name = name.replace('.js', '');
            result[name] = require('./GroupManagers/'+files[i]);
        }
    }
    return result;
};

var GroupManagers = getGroupManagerDict(),
    def = 'basic',
    group = argv.g || def,
    manager = GroupManagers[group.toLowerCase()] || GroupManagers[def];

// Set the group manager
var opts = {port: wsPort,
            path: '',
            GroupManager: manager};
var nbApp = new NetsBlocksServer(opts);
nbApp.start(opts);