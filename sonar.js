(function($, tableau) {
    var $sonarForm;
    var apiEndpoints = {};
    var mySonarConnector = tableau.makeConnector();

    // api endpoints for select combo
    apiEndpoints.authors = function getAuthors(sonarAPI, connectionData, callback) {
        $.getJSON(sonarAPI + 'issues/authors', { ps: 500 }, function(response) {
            var collection = response.authors;
            var tableData = [];

            // Iterate over the JSON object
            for (var i = 0, len = collection.length; i < len; i++) {
                tableData.push({
                    'email': collection[i]
                });
            }

            callback(tableData);
        });
    };
    apiEndpoints.timemachine = function getCoverage(sonarAPI, connectionData, callback) {
        $.getJSON(sonarAPI + 'timemachine/index', {
            resource: connectionData['sonar-projectkey'],
            metrics: connectionData.metrics.join(',')
        }, function(response) {
            var collection = response[0].cells;
            var tableData = [];

            // Iterate over the JSON object
            for (var i = 0, len = collection.length; i < len; i++) {
                var row = {
                    'date': collection[i].d.slice(0, 19).replace('T', ' ')
                };
                for(var m = 0; m < connectionData.metrics.length; m++) {
                    row[connectionData.metrics[m]] = collection[i].v[m];
                }
                tableData.push(row);
            }

            callback(tableData);
        });
    };


    // Define the schema
    mySonarConnector.getSchema = function(schemaCallback) {
        var connectionData = JSON.parse(tableau.connectionData);

        var authors = {
            id: "authors",
            alias: "Authors",
            columns: [
                {
                    id: 'email',
                    dataType: tableau.dataTypeEnum.string
                }
            ]
        };

        var timemachine = {
            id: "timemachine",
            alias: "TimeMachine",
            columns: [
                {
                    id: 'date',
                    dataType: tableau.dataTypeEnum.datetime
                }
            ]
        };
        tableau.log(connectionData)
        // update timeMachine schema
        if (connectionData.endpoints.timemachine) {
            for (var i=0; i < connectionData.metrics.length; i++) {
                timemachine.columns.push({
                    id: connectionData.metrics[i],
                    dataType: tableau.dataTypeEnum.float
                });
            }
        }

        schemaCallback([ authors, timemachine ]);
    };

    // Download the data
    mySonarConnector.getData = function(table, doneCallback) {
        var sonarAPI = '/api/'
        var connectionData = JSON.parse(tableau.connectionData);

        sonarAPI = connectionData['sonar-url'] + sonarAPI;

        apiEndpoints[table.tableInfo.id](sonarAPI, connectionData, function(tableData) {
            table.appendRows(tableData);
            doneCallback();
        });
    };

    tableau.registerConnector(mySonarConnector);

    function storeConnectionData() {
        var connectionData = {
            endpoints: {},
            metrics: []
        };

        $sonarForm.find('input, select').each(function(index, element) {
            switch (true) {
                case /sonar-endpoints/.test(element.name):
                    connectionData['endpoints'][element.getAttribute('data-name')] = element.checked;
                    break;
                case /sonar-metrics/.test(element.name):
                    if(element.checked) {
                        connectionData['metrics'].push(element.getAttribute('data-name'));
                    }
                    break;
                default:
                    connectionData[element.name] = element.type === 'checkbox' ? element.checked : element.value;
            }

        });

        tableau.connectionName = 'Sonar Data';

        tableau.connectionData = JSON.stringify(connectionData);
    }

    // Create event listeners
    $(document).ready(function() {
        $sonarForm = $('#sonar-form');
        $sonarForm.submit(function(event) {
            event.preventDefault();

            storeConnectionData();

            tableau.submit();
        });
    });
})(jQuery, tableau);