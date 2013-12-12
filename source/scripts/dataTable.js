angular.module('angularTableApp')
    .directive('myDataTable', function ($parse) {
        'use strict';

        return {
            template: '<table class="display table table-striped table-hover" id="my-data-table"><div id="customHeader"></div></table>',

            link: function postLink(scope, element, attrs) {

                //<editor-fold desc="region: variables">
                var originalSource; //store the original data source to get element later by row index

                var actualPageIndex = 0;
                var pageSize = scope[attrs.defaultPageSize] ? parseInt(scope[attrs.defaultPageSize]): 10;
                var orderBy;
                var filterOptions = [];
                var headers = [];
                var headerTitles = [];
                var elementsMaxReached = false;
                var lastIndex = -1;
                //first element is true because the datatable initialization calls the decorate function on the first page
                var pageDecorationStatus = [true];
                //new option to use custom header titles
                var haveCustomHeaderTitles = false;
                var table;
                var isInitTime = true;
                //</editor-fold>

                //<editor-fold desc="region: handler parsers">
                //ANGULAR - parse callable functions from attributes

                var refreshHandler = $parse(attrs.refresh);

                var onRowSelectedHandler = $parse(attrs.selectRow);

                var onEditRow = $parse(attrs.editRow);

                var onDeleteRow = $parse(attrs.deleteRow);
                //</editor-fold>

                //<editor-fold desc="region: callbacks called from outside">

                //dataTableExtensions
                //get previous page - callback of dataTables's pagination
                var previousCallback = function () {

                    if (actualPageIndex > 0) {

                        actualPageIndex--;
                        refreshCallback();
                    }
                };

                //dataTableExtensions
                //get next page - callback of dataTables's pagination
                var nextCallback = function () {

                    if (!elementsMaxReached) {

                        actualPageIndex++;
                        refreshCallback();
                    }
                };

                //set the filter conditions - callback of the custom header controls
                var setFilterOptions = function (options) {

                    for (var i = 0; i < options.length; i++) {

                        var filter = filterOptions.getElementByFilterName(options[i])
                        if (filter) {

                            filter.filterValue = options[i].filterValue;
                        } else {
                            filterOptions.push(options[i]);
                        }
                    }

                    //after filter we want to see the results started from the first page
                    actualPageIndex = 0;
                    refreshCallback();
                };

                //set the actual page size - callback of the custom header controls
                var setPageSize = function (size) {

                    pageSize = size;

                    //after changed page size we want to see the results started from the first page
                    actualPageIndex = 0;
                    refreshCallback();
                };

                //check if it has a next page or not - callback of dataTables's pagination
                var hasNextPage = function () {

                    return !elementsMaxReached;
                };

                //check if it has a previous page or not - callback of dataTables's pagination
                var hasPreviousPage = function () {

                    return actualPageIndex !== 0;
                };
                //</editor-fold>

                //<editor-fold desc="region: table decorators">

                //calls the refresh method of the controller, sends the new filter/order/paging options to the controller
                var refreshCallback = function () {

                    //collect the filter options
                    var conditions = {pageIndex: actualPageIndex, pageSize: pageSize, orderBy: orderBy, filterOptions: filterOptions};

                    scope.$apply(function () {

                        refreshHandler({data: conditions}, scope, { $event: event });
                    });
                };

                //calls decoration on new page if the data tables uses the my-two-buttons pagination mode
                function decorateCallback(startIndex){
                    var pageIndex = startIndex / pageSize;
                    if(!pageDecorationStatus[pageIndex]){
                        decorateDataTableOnChange();
                        pageDecorationStatus[pageIndex] = true;
                    }
                };

                //create and set own pagination
                createPagination(previousCallback, nextCallback, hasNextPage, hasPreviousPage, decorateCallback);

                //prepare the header controls to add them to the header
                var headerControls = [];
                (function prepareHeaderControls() {

                    //if the pageSizes attr is defined add it to the header controls
                    if (attrs.pageSizes) {

                        var pageSizeChanger = {
                            type: DataTableExtensions.headerControls.select,
                            properties: {
                                options: scope[attrs.pageSizes],
                                label: "Show",
                                trigger: {mode: DataTableExtensions.triggerModes.onChange, callback: setPageSize} //calls the data table filters changed event
                            }
                        };

                        headerControls.push(pageSizeChanger);
                    }

                    //collect all of the header controls
                    var controls = scope[attrs.header];
                    if (controls) {
                        for (var i = 0; i < controls.length; i++) {

                            var control = controls[i];

                            //check if trigger mode is 'onchange' but there is no callback set by user
                            if (control.trigger && control.trigger.mode === DataTableExtensions.triggerModes.onChange
                                && !control.trigger.callback) {

                                control.trigger.callback = refreshCallback;
                            }

                            headerControls.push(control);
                        }
                    }

                    createCustomHeader(headerControls, setFilterOptions);
                })();

                //callback on row selection
                var setRowSelectionCallback = function () {

                    $("#my-data-table tbody tr").click(function (event) {

                        //TWITTER BOOTSTRAP - color the row
                        $("#my-data-table tbody tr").removeClass('info');
                        $(this).addClass('info');

                        var index = $(this).context._DT_RowIndex;

                        //set lastIndex to stay consistent with row change on arrow key pressed
                        lastIndex = $(this).context.rowIndex - 1;

                        var itemOnIndex = originalSource[index];

                        scope.$apply(function () {

                            onRowSelectedHandler({item: itemOnIndex}, scope, {$event: event});
                        });
                    });
                };

                //function to add extra buttons to rows
                var addExtraButtonToRow = function (button) {

                    //create empty header (to extend the style)
                    if ($('#' + button.name).length === 0) {

                        var nCloneTh = $('<th>');
                        nCloneTh.attr("id", button.name);
                        nCloneTh.appendTo($('#my-data-table thead tr'));
                    }

                    var nCloneTd = $('<td>');

                    var btn = $('<button class="header-button"/>');

                    //add class by style set on button param
                    switch (button.style) {
                        case DataTableExtensions.buttonStyle.info:
                            btn.addClass("btn btn-info");
                        case DataTableExtensions.buttonStyle.warning:
                            btn.addClass("btn btn-warning");
                        case DataTableExtensions.buttonStyle.success:
                            btn.addClass("btn btn-success");
                        case DataTableExtensions.buttonStyle.error:
                            btn.addClass("btn btn-danger");
                        default:
                            btn.addClass("btn");
                    }

                    btn.text(button.text);

                    btn.appendTo(nCloneTd);

                    $('#my-data-table tbody tr').each(function (i) {

                        var tdButton = nCloneTd.clone(true);

                        tdButton.click(function (event) {

                            event.stopPropagation();
                            button.callback(event, originalSource[i]);
                        });

                        tdButton.appendTo(this);
                    });
                };

                //function to call on data table change
                var decorateDataTableOnChange = function () {

                    setRowSelectionCallback();

                    //if the function for editing a row parsed from an attribute exists add edit button
                    if (onEditRow != angular.noop) {

                        var btnEdit = {
                            name: "edit",
                            style: DataTableExtensions.buttonStyle.warning,
                            text: "Edit",
                            callback: function (event, obj) {
                                event.preventDefault();
                                scope.$apply(function () {

                                    onEditRow({item: obj}, scope, {$event: event});
                                });
                            }};

                        addExtraButtonToRow(btnEdit);
                    }

                    //if the function for deleting a row parsed from an attribute exists add delete button
                    if (onDeleteRow != angular.noop) {

                        var btnDelete = {
                            name: "delete",
                            style: DataTableExtensions.buttonStyle.error,
                            text: "Delete",
                            callback: function (event, obj) {
                                event.preventDefault();
                                scope.$apply(function () {

                                    onDeleteRow({item: obj}, scope, {$event: event});
                                });
                            }};

                        addExtraButtonToRow(btnDelete);
                    }
                };

                //navigation allowed by arrow keys
                var setNavigationOnArrows = function () {

                    $(document).keydown(function (event) {

                        var currentRow;
                        var rowsOnPageCount = $("#my-data-table tbody tr").length;

                        //!!!!!nice from dataTables
                        //$(currentRow).next().context._DT_RowIndex -- gives the original index of the row back (after ordering it remains the same)
                        //$(currentRow).context.rowIndex -- gives the actual index back

                        //change row selection and/or page on key down
                        switch (event.keyCode) {
                            //arrow down
                            case 40:

                                if (lastIndex < rowsOnPageCount - 1) {
                                    lastIndex++;
                                    currentRow = $("#my-data-table tbody tr").get(lastIndex);
                                    $(currentRow).prev().removeClass("info");
                                    $(currentRow).addClass("info");
                                } else {
                                    if (hasNextPage()) {
                                        $("#my-data-table tbody tr.info").removeClass("info");
                                        lastIndex = -1;
                                        nextCallback();
                                    } else {
                                        lastIndex = rowsOnPageCount - 1;
                                    }
                                }
                                break;
                            //arrow up
                            case 38:
                                if (lastIndex > 0) {
                                    lastIndex--;
                                    currentRow = $("#my-data-table tbody tr").get(lastIndex);
                                    $(currentRow).next().removeClass("info");
                                    $(currentRow).addClass("info");
                                } else {
                                    if (hasPreviousPage()) {
                                        lastIndex = pageSize;
                                        previousCallback();
                                    } else {
                                        lastIndex = 0;
                                    }
                                }
                                break;
                        }
                    });
                };
                //</editor-fold>

                //<editor-fold desc="region: draw and redraw table">

                //support case-insensitivity
                var sortables = [];
                var sortingProperties = scope[attrs.sortingProperties];
                for (var i = 0; i < sortingProperties.length; i++) {
                    sortables.push(sortingProperties[i].toLowerCase())
                }
                var toHide = [];
                var hidingProperties = scope[attrs.hidingProperties];
                for (var i = 0; i < hidingProperties.length; i++) {
                    toHide.push(hidingProperties[i].toLowerCase())
                }

                //create header of the table - set sorting and hide if needed
                var prepareHeader = function (header) {

                    var sortables = scope[attrs.sortingProperties];
                    var toHide = scope[attrs.hidingProperties];

                    //get the property names for header titles
                    for (var head in header) {
                        var item = haveCustomHeaderTitles ? head.propertyName : head;
                        var title = haveCustomHeaderTitles ? head.title : head;

                        if (!toHide || toHide.indexOf(item.toLowerCase()) == -1) {

                            var sortable = attrs.allSortable == "" ? true : false;

                            if (sortables && sortables.indexOf(item.toLowerCase()) != -1) {
                                sortable = true;
                            }

                            headers.push(item);
                            headerTitles.push({ "sTitle": title, "bSortable": sortable });
                        }
                    }
                }

                //create rows of the table - hide if needed
                var prepareRows = function (source) {

                    var rows = [];

                    for (var i = 0; i < source.length; i++) {

                        var row = [];

                        //use header to iterate through the elements to keep the property order
                        //'hide items' happens in prepareHeaders
                        for (var j = 0; j < headers.length; j++) {
                            var item = headers[j];//.sTitle;

                            var valueToAdd = source[i][item];
                            //use converters
                            var converters = scope[attrs.converters];
                            if (converters) {
                                var converterString = converters.getConverterStringTo(item);
                                if (converterString) {
                                    var converter = $parse(converterString);
                                    valueToAdd = converter({value: valueToAdd}, scope, { $event: event });
                                }
                                row.push(valueToAdd);
                            }
                        }

                        rows.push(row);
                    }

                    return rows;
                }

                //function to draw the table
                var drawTable = function (source) {

                    originalSource = source;

                    //get the property names for header titles or the user defined header titles
                    if(scope[attrs.headerTitles]){
                        prepareHeader(scope[attrs.headerTitles]);
                        haveCustomHeaderTitles = true;
                    }else{
                        prepareHeader(source[0]);
                    }

                    //get the property values for rows
                    var rows = prepareRows(source);

                    //set pagination
                    var pagination = 'my_two_buttons';

                    if(scope[attrs.paginationType]){
                        switch(scope[attrs.paginationType]){
                            case 'explicit':
                                pagination = 'my_custom_buttons';
                                break;
                            case 'implicit':
                                pagination = 'my_two_buttons';
                                break;
                        }
                    }

                    table = $("#my-data-table").dataTable({
                        "aoColumns": headerTitles,
                        "aaData": rows,
                        "iDisplayLength" : pageSize,
                        "fnInfoCallback": onInfoChanged,
                        "sPaginationType": pagination, //my implementation in dataTablesExtensions
                        "sDom": 't<"bottom"pi>',
                        "bFilter": false, //hides the search field
                        "bLengthChange": false, //hides the page size change option
                        "bSort": true //allows ordering
                    });

                    decorateDataTableOnChange();

                    setNavigationOnArrows();
                };

                //function called on the source change
                var refreshData = function (source) {

                    originalSource = source;

                    //check if it is the end of the elements or probably it is more
                    elementsMaxReached = source.length < pageSize;

                    table.fnClearTable();

                    var rows = prepareRows(source);

                    table.fnAddData(rows);

                    decorateDataTableOnChange();
                };

                //after adding the custom header it is not triggered by the default controls
                //checked why? ----------> 'i' was missing from sDom...
                var onInfoChanged = function (oSettings, iStart, iEnd, iMax, iTotal, sPre) {

                    //reading out the ordering info from oSettings
                    if (oSettings) {
                        var headerIndex = oSettings.aaSorting[0][0];
                        var direction = oSettings.aaSorting[0][1];
                        var header = headers[headerIndex];
                        var newOrder = { property: header.sTitle, direction: direction};
                    }

                    //need to check because at the first creation time it will be called to and at this time we are already in digest phase
                    if (!scope.$$phase) {
                        if (orderBy !== newOrder) {

                            orderBy = newOrder;
                            actualPageIndex = 0;
                            refreshCallback();
                        }
                    }
                };

                //set watch on the scope element
                scope.$watch(attrs.mySource, function (source) {

                    //the first time set of the collection is a watch triggering action too
                    if (isInitTime && source && source.length > 0) {

                        //initialize the table
                        drawTable(scope[attrs.mySource]);
                        isInitTime = false;
                        return;
                    } else if (!isInitTime) {

                        if (source && source.length > 0) {

                            //page size needs to be set explicitly on the table options too
                            var oSettings = table.fnSettings();
                            oSettings._iDisplayLength = pageSize;

                            //redraw after resize
                            table.fnDraw();

                            refreshData(source);
                        } else {
                            //if empty source comes back
                            elementsMaxReached = true;
                            table.fnClearTable();
                        }
                    }
                });
                //</editor-fold>
            }
        };
    });

Array.prototype.getElementByFilterName = function (obj) {

    for (var i = 0; i < this.length; i++) {
        if (this[i].filterName === obj.filterName) {
            return this[i];
        }
    }

    return;
}


Array.prototype.getConverterStringTo = function (property) {

    for (var i = 0; i < this.length; i++) {
        if (this[i].property.toLowerCase() === property.toLowerCase()) {

            return this[i].converterCallback;
        }
    }

    return;
}