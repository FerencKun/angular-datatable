'use strict';

angular.module('angularTableApp')
    .controller('MainCtrl', function ($scope) {

        //fake database
        var dataSource = [
            { id : 0, engine: "Trident", browser: "Internet Explorer 4.0", platform: "Win 95+", version: 4, grade: "X" },
            { id : 1, engine: "Trident", browser: "Internet Explorer 5.0", platform: "Win 95+", version: 5, grade: "C" },
            { id : 2, engine: "Trident", browser: "Internet Explorer 5.5", platform: "Win 95+", version: 5.5, grade: "A" },
            { id : 3, engine: "Trident", browser: "Internet Explorer 6.0", platform: "Win 98+", version: 6, grade: "A" },
            { id : 4, engine: "Trident", browser: "Internet Explorer 7.0", platform: "Win XP SP2+", version: 7, grade: "A" },
            { id : 5, engine: "Gecko", browser: "Firefox 1.5", platform: "Win 98+ / OSX.2+", version: 1.8, grade: "A" },
            { id : 6, engine: "Gecko", browser: "Firefox 2", platform: "Win 98+ / OSX.2+", version: 1.8, grade: "A" },
            { id : 7, engine: "Gecko", browser: "Firefox 3", platform: "Win 2k+ / OSX.3+", version: 1.9, grade: "A" },
            { id : 8, engine: "Webkit", browser: "Safari 1.2", platform: "OSX.3", version: 125.5, grade: "A" },
            { id : 9, engine: "Webkit", browser: "Safari 1.3", platform: "OSX.3", version: 312.8, grade: "A" },
            { id : 10, engine: "Webkit", browser: "Safari 2.0", platform: "OSX.4+", version: 419.3, grade: "A" },
            { id : 11, engine: "Webkit", browser: "Safari 3.0", platform: "OSX.4+", version: 522.1, grade: "A" },
            { id : 12, engine: "Trident", browser: "Internet Explorer 4.0", platform: "Win 95+", version: 4, grade: "X" },
            { id : 13, engine: "Trident", browser: "Internet Explorer 5.0", platform: "Win 95+", version: 5, grade: "C" },
            { id : 14, engine: "Trident", browser: "Internet Explorer 5.5", platform: "Win 95+", version: 5.5, grade: "A" },
            { id : 15, engine: "Trident", browser: "Internet Explorer 6.0", platform: "Win 98+", version: 6, grade: "A" },
            { id : 16, engine: "Trident", browser: "Internet Explorer 7.0", platform: "Win XP SP2+", version: 7, grade: "A" },
            { id : 17, engine: "Gecko", browser: "Firefox 1.5", platform: "Win 98+ / OSX.2+", version: 1.8, grade: "A" },
            { id : 18, engine: "Gecko", browser: "Firefox 2", platform: "Win 98+ / OSX.2+", version: 1.8, grade: "A" },
            { id : 19, engine: "Gecko", browser: "Firefox 3", platform: "Win 2k+ / OSX.3+", version: 1.9, grade: "A" },
            { id : 20, engine: "Webkit", browser: "Safari 1.2", platform: "OSX.3", version: 125.5, grade: "A" },
            { id : 21, engine: "Webkit", browser: "Safari 1.3", platform: "OSX.3", version: 312.8, grade: "A" },
            { id : 22, engine: "Webkit", browser: "Safari 2.0", platform: "OSX.4+", version: 419.3, grade: "A" },
            { id : 23, engine: "Webkit", browser: "Safari 3.0", platform: "OSX.4+", version: 522.1, grade: "A" },
            { id : 24, engine: "Trident", browser: "Internet Explorer 4.0", platform: "Win 95+", version: 4, grade: "X" },
            { id : 25, engine: "Trident", browser: "Internet Explorer 5.0", platform: "Win 95+", version: 5, grade: "C" },
            { id : 26, engine: "Trident", browser: "Internet Explorer 5.5", platform: "Win 95+", version: 5.5, grade: "A" },
            { id : 27, engine: "Trident", browser: "Internet Explorer 6.0", platform: "Win 98+", version: 6, grade: "A" },
            { id : 28, engine: "Trident", browser: "Internet Explorer 7.0", platform: "Win XP SP2+", version: 7, grade: "A" },
            { id : 29, engine: "Gecko", browser: "Firefox 1.5", platform: "Win 98+ / OSX.2+", version: 1.8, grade: "A" }
        ];

        //<editor-fold desc='CONFIGURE DATA TABLE SECTION'>

        //custom header controls of the data table
        var selector = {
            type: DataTableExtensions.headerControls.select,
            properties: {
                label: "Version:",
                options: ["0-10", "10-100", "100-1000"],
                filterName: "version",
                trigger: {mode: DataTableExtensions.triggerModes.explicit, starter: "buttonFilter"}
            }
        };

        var textBox = {
            type: DataTableExtensions.headerControls.textBox,
            properties: {
                label: "Search:",
                filterName: "search",
                trigger: {mode: DataTableExtensions.triggerModes.explicit, starter: "buttonFilter"}
            }
        };

        var button1 = {
            type: DataTableExtensions.headerControls.button,
            properties: {
                name: "buttonFilter",
                text: "Search"
                //callback: function(){console.log("fucking awesome")} //option to bind controller function to button
            }
        };

        var button2 = {
            type: DataTableExtensions.headerControls.button,
            properties: {
                name: "buttonDoNotClick",
                text: "DO NOT CLICK",
                callback: function(){alert("I said do not click it!")} //option to bind controller function to button
            }
        };

        //array of controls inside the array makes the controls into one logical group
        $scope.headerControls = [[selector, textBox, button1], button2];

        //paging - page sizes
        $scope.pageSizes = [10,50,100];

        //sorting allowed only by this properties
        $scope.sortingProperties = ["engine", "grade"];

        //hide the following properties
        $scope.hidingProperties = ["id"];

        //data source of the data table's first page
        /**************************************************************************************/
        /* Remove slice and add the whole collection as source if you use implicit pagination */
        $scope.dataSource = dataSource.slice(0, 10);
        /**************************************************************************************/

        //need to store the last used settings to reuse it after delete/edit
        var lastUsedData;
        //callback function of the data table
        $scope.refresh = function (data) {

            lastUsedData = data;
            var tempDataSource = dataSource;

            //filter options
            if(data.filterOptions){

                for(var i = 0; i < data.filterOptions.length; i++){

                    //filter names are from the custom header controls defined earlier
                    if(data.filterOptions[i].filterName == "version"){

                        tempDataSource = sortDataByVersion(tempDataSource, data.filterOptions[i].filterValue);
                    }

                    if(data.filterOptions[i].filterName == "search"){

                        tempDataSource = sortDataBySearch(tempDataSource, data.filterOptions[i].filterValue);
                    }
                }
            }

            //now it use only the paging changes
            /***************************************************/
            /* Comment this row out if you use implicit paging */
            $scope.dataSource = tempDataSource.slice(data.pageIndex * data.pageSize, (data.pageIndex + 1) * data.pageSize);
            /***************************************************/
        };

        var sortDataByVersion = function(source, versionRangeString){

            if(versionRangeString){

                var versions = versionRangeString.split("-");
                var result = [];

                if(versions){

                    var start = parseInt(versions[0]);
                    var end = parseInt(versions[1]);

                    for(var i = 0; i < source.length; i++){
                        if(source[i].version >= start && source[i].version <= end){
                            result.push(source[i]);
                        }
                    }
                }

                return result;
            }

            return source;
        };

        var sortDataBySearch = function(source, searchCondition){

            if(searchCondition){

                var result = [];

                for(var i = 0; i < source.length; i++){
                    if(source[i].platform.indexOf(searchCondition) != -1){
                        result.push(source[i]);
                    }
                }

                return result;
            }

            return source;
        };

        //fake function on select
        $scope.select = function(item){

            console.log("SELECTED");
            console.log(item);
        };

        //fake function on edit
        $scope.editRow = function(item){

            console.log("EDIT");
            console.log(item);
        };

        //fake function on select
        $scope.deleteRow = function(item){

            dataSource.deleteById(item);

            var tmpData = {pageIndex : 0, pageSize : 10};

            $scope.refresh(lastUsedData ? lastUsedData : tmpData);
        };

        $scope.gradeConverter = function (value) {

            if (value === 'A') {
                return '5';
            } else if(value === 'C'){
                return '3';
            }else{
                return '1';
            }
        };

        $scope.converters = [
            { property: 'grade', converterCallback: 'gradeConverter(value)'}
        ];
        //</editor-fold>
    });

//helper function to delete item by id
Array.prototype.deleteById = function (obj) {

    for (var i = 0; i < this.length; i++) {

        if (this[i].id === obj.id) {
            this.splice(i, 1);
        }
    }
}
