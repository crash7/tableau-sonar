(function($, tableau) {
    var schemaGenerators;
    var dataRetrievers;
    var mySonarConnector = tableau.makeConnector();

    /**
     * Set of schema generators to support multiple tables/inputs
     * - authors
     * - timemachine
     */
    schemaGenerators = {
        authors: function generateAuthorsSchema() {
            return {
                id: 'authors',
                alias: 'Authors',
                columns: [
                    { id: 'email', dataType: tableau.dataTypeEnum.string }
                ]
            };
        },

        timemachine: function generateTimeMachineSchema(projectKey, metrics) {
            var i;
            var template = {
                id: 'timemachine__' + projectKey,
                alias: 'TimeMachine - ' + projectKey,
                columns: [
                    { id: 'date', dataType: tableau.dataTypeEnum.datetime }
                ]
            };
            for (i = 0; i < metrics.length; i++) {
                template.columns.push({ id: metrics[i], dataType: tableau.dataTypeEnum.float });
            }
            return template;
        }
    };

    /**
     * Set of data retrievers
     * - authors
     * - timemachine
     */
    dataRetrievers = {
        authors: function retrieveAuthorsData(sonarAPI, projectKey, connectionData, callback) {
            // TODO: support more that 500 authors, retrieve data recursively
            $.getJSON(sonarAPI + 'issues/authors', { ps: 500 }, function(response) {
                var collection = response.authors;
                var tableData = [];
                var i;

                // Iterate over the JSON object
                for (i = 0, len = collection.length; i < len; i++) {
                    tableData.push({ 'email': collection[i] });
                }

                callback(tableData);
            });
        },

        timemachine: function retrieveTimeMachineData(sonarAPI, projectKey, connectionData, callback) {
            $.getJSON(sonarAPI + 'timemachine/index', {
                resource: projectKey,
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
        }
    };

    /**
     * Defines the schemas based on the connectionData
     */
    mySonarConnector.getSchema = function(schemaCallback) {
        var connectionData = JSON.parse(tableau.connectionData);
        var schemas = [];
        var i;

        if (connectionData.endpoints.authors) {
            schemas.push(schemaGenerators.authors());
        }

        if (connectionData.endpoints.timemachine) {
            for (i=0; i<connectionData.projectKeys.length; i++) {
                schemas.push(
                    schemaGenerators.timemachine(
                        connectionData.projectKeys[i],
                        connectionData.metrics
                    )
                );
            }
        }

        schemaCallback(schemas);
    };

    /**
     * Download the data
     */
    mySonarConnector.getData = function(table, doneCallback) {
        var sonarAPI = '/api/';
        var connectionData = JSON.parse(tableau.connectionData);
        var processedId = table.tableInfo.id.split('__');

        sonarAPI = connectionData['sonar-url'] + sonarAPI;

        dataRetrievers[processedId[0]](sonarAPI, processedId[1], connectionData, function(tableData) {
            table.appendRows(tableData);
            doneCallback();
        });
    };

    function onLoad() {
        var $sonarForm = $('#sonar-form');

        $sonarForm.submit(function (event) {
            var connectionData = {
                endpoints: {},
                metrics: [],
                projectKeys: []
            };

            event.preventDefault();

            $sonarForm.find('input, select').each(function (index, element) {
                switch (true) {
                    case /sonar-endpoints/.test(element.name):
                        connectionData['endpoints'][element.getAttribute('data-name')] = element.checked;
                        break;
                    case /sonar-metrics/.test(element.name):
                        if(element.checked) {
                            connectionData['metrics'].push(element.getAttribute('data-name'));
                        }
                        break;
                    case /sonar-projectkeys/.test(element.name):
                        connectionData.projectKeys = element.value.split(',');
                        break;
                    default:
                        if (element.type === 'checkbox') {
                            connectionData[element.name] = element.checked;
                        } else {
                            connectionData[element.name] = element.value;
                        }
                }
            });

            tableau.connectionName = 'Sonar WDC - ' + connectionData['sonar-url'];
            tableau.connectionData = JSON.stringify(connectionData);
            tableau.submit();
        });
    }

    tableau.registerConnector(mySonarConnector);
    $(document).ready(onLoad);
})(jQuery, tableau);