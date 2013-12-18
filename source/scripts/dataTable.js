angular.module('angularTableApp')
    .directive('myDataTable', function ($parse) {
        'use strict';

        return {
            template: '<table class="display table table-striped table-hover" id="my-data-table"><div id="customHeader"></div></table>',

            link: function postLink(scope, element, attrs) {

                //<editor-fold desc="region: constants">
                var tableRowId = '#my-data-table tbody tr';
                var tableId = '#my-data-table';
                var twoButtonsPagination = 'my_two_buttons';
                var customButtonsPagination = 'my_custom_buttons';
                //</editor-fold>

                //<editor-fold desc="region: variables">
                //store the original data source to get element later by row index
                var originalSource;
                var actualPageIndex = 0;
                var orderBy;
                var filterOptions = [];
                var headerControls = [];
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

                var sortables = [];
                var toHide = [];
                //</editor-fold>

                //<editor-fold desc="region: handler parsers">
                //ANGULAR - parse callable functions from attributes
                var refreshHandler = $parse(attrs.refresh);

                var onRowSelectedHandler = $parse(attrs.selectRow);

                var onEditRow = $parse(attrs.editRow);

                var onDeleteRow = $parse(attrs.deleteRow);
                //</editor-fold>

                //<editor-fold desc="region: parsed attrs">

                //new option to define one default page size
                var pageSize = scope[attrs.defaultPageSize] ? parseInt(scope[attrs.defaultPageSize]) : 10;
                //optional page sizes for page size selector
                var pageSizesAttr = scope[attrs.pageSizes];
                var headerControlsAttr = scope[attrs.header];
                var convertersAttr = scope[attrs.converters];
                //support case-insensitivity
                var sortingProperties = scope[attrs.sortingProperties];
                for (var i = 0; i < sortingProperties.length; i++) {
                    sortables.push(sortingProperties[i].toLowerCase())
                }
                var hidingProperties = scope[attrs.hidingProperties];
                for (var j = 0; j < hidingProperties.length; j++) {
                    toHide.push(hidingProperties[j].toLowerCase())
                }

                var headerTitlesAttr = scope[attrs.headerTitles];
                var paginationTypeAttr = attrs.paginationType;
                //</editor-fold>

                //<editor-fold desc="region: callbacks called from outside">

                //dataTableExtensions
                //get previous page - callback of dataTables's pagination
                function previousCallback() {

                    if (actualPageIndex > 0) {

                        actualPageIndex--;
                        refreshCallback();
                    }
                }

                //dataTableExtensions
                //get next page - callback of dataTables's pagination
                function nextCallback() {

                    if (!elementsMaxReached) {

                        actualPageIndex++;
                        refreshCallback();
                    }
                }

                //inner use
                //set the filter conditions - callback of the custom header controls
                function setFilterOptions(options) {

                    for (var i = 0; i < options.length; i++) {

                        var filter = filterOptions.getElementByFilterName(options[i]);
                        if (filter) {

                            filter.filterValue = options[i].filterValue;
                        } else {
                            filterOptions.push(options[i]);
                        }
                    }

                    //after filter we want to see the results started from the first page
                    actualPageIndex = 0;
                    refreshCallback();
                }

                //inner use
                //set the actual page size - callback of the custom header controls
                function setPageSize(size) {

                    pageSize = size;

                    //after changed page size we want to see the results started from the first page
                    actualPageIndex = 0;
                    refreshCallback();
                }

                //inner use
                //check if it has a next page or not - callback of dataTables's pagination
                function hasNextPage() {

                    return !elementsMaxReached;
                }

                //inner use
                //check if it has a previous page or not - callback of dataTables's pagination
                function hasPreviousPage() {

                    return actualPageIndex !== 0;
                }

                //</editor-fold>

                //<editor-fold desc="region: table decorators">

                //calls the refresh method of the controller, sends the new filter/order/paging options to the controller
                function refreshCallback() {

                    //collect the filter options
                    var conditions = {
                        pageIndex: actualPageIndex,
                        pageSize: pageSize,
                        orderBy: orderBy,
                        filterOptions: filterOptions
                    };

                    scope.$apply(function () {

                        refreshHandler({data: conditions}, scope, { $event: event });
                    });
                }

                //calls decoration on new page if the data tables uses the my-two-buttons pagination mode
                //it stores if a page was already decorated or not
                function decorateCallback(startIndex) {

                    var pageIndex = startIndex / pageSize;

                    if (!pageDecorationStatus[pageIndex]) {

                        decorateDataTableOnChange();
                        pageDecorationStatus[pageIndex] = true;
                    }
                }

                //callback on row selection
                function setRowSelectionCallback() {

                    $(tableRowId).click(function (event) {

                        //TWITTER BOOTSTRAP - color the row
                        $(tableRowId).removeClass('info');
                        $(this).addClass('info');

                        var index = $(this).context._DT_RowIndex;

                        //set lastIndex to stay consistent with row change on arrow key pressed
                        lastIndex = $(this).context.rowIndex - 1;

                        var itemOnIndex = originalSource[index];

                        scope.$apply(function () {

                            onRowSelectedHandler({item: itemOnIndex}, scope, {$event: event});
                        });
                    });
                }

                //function to add extra buttons to rows
                function addExtraButtonToRow(button) {

                    //create empty header (to extend the style)
                    if ($('#' + button.name).length === 0) {

                        var nCloneTh = $('<th>');
                        nCloneTh.attr("id", button.name);
                        nCloneTh.appendTo($(tableRowId));
                    }

                    var nCloneTd = $('<td>');

                    var btn = $('<button class="header-button"/>');

                    //add class by style set on button param
                    switch (button.style) {
                        case DataTableExtensions.buttonStyle.info:
                            btn.addClass("btn btn-info");
                            break;
                        case DataTableExtensions.buttonStyle.warning:
                            btn.addClass("btn btn-warning");
                            break;
                        case DataTableExtensions.buttonStyle.success:
                            btn.addClass("btn btn-success");
                            break;
                        case DataTableExtensions.buttonStyle.error:
                            btn.addClass("btn btn-danger");
                            break;
                        default:
                            btn.addClass("btn");
                            break;
                    }

                    btn.text(button.text);

                    btn.appendTo(nCloneTd);

                    $(tableRowId).each(function (i) {

                        var tdButton = nCloneTd.clone(true);

                        tdButton.click(function (event) {

                            event.stopPropagation();
                            button.callback(event, originalSource[i]);
                        });

                        tdButton.appendTo(this);
                    });
                }

                //function to call on data table change
                function decorateDataTableOnChange() {

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
                }

                //navigation allowed by arrow keys
                function setNavigationOnArrows() {

                    $(document).keydown(function (event) {

                        var currentRow;
                        var rowsOnPageCount = $(tableRowId).length;

                        //!!!!!nice from dataTables
                        //$(currentRow).next().context._DT_RowIndex -- gives the original index of the row back (after ordering it remains the same)
                        //$(currentRow).context.rowIndex -- gives the actual index back

                        //change row selection and/or page on key down
                        switch (event.keyCode) {
                            //arrow down
                            case 40:

                                if (lastIndex < rowsOnPageCount - 1) {
                                    lastIndex++;
                                    currentRow = $(tableRowId).get(lastIndex);
                                    $(currentRow).prev().removeClass("info");
                                    $(currentRow).addClass("info");
                                } else {
                                    if (hasNextPage()) {
                                        var infoId = tableRowId + ".info";
                                        $(infoId).removeClass("info");
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
                                    currentRow = $(tableRowId).get(lastIndex);
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
                }

                //</editor-fold>

                //<editor-fold desc="region: draw and redraw table">

                //create header of the table - set sorting and hide if needed
                function prepareHeader(header) {

                    //get the property names for header titles
                    for (var i = 0; i < header.length; i++) {
                        var head = header[i];
                        var item = (haveCustomHeaderTitles === true) ? head.propertyName : head;
                        var title = (haveCustomHeaderTitles === true) ? head.title : head;

                        if (!toHide || toHide.indexOf(item.toLowerCase()) == -1) {

                            var sortable = attrs.allSortable === "";

                            if (sortables && sortables.indexOf(item.toLowerCase()) != -1) {
                                sortable = true;
                            }

                            headers.push(item);
                            headerTitles.push({ "sTitle": title, "bSortable": sortable });
                        }
                    }
                }

                //create rows of the table - hide if needed
                function prepareRows(source) {

                    var rows = [];

                    for (var i = 0; i < source.length; i++) {

                        var row = [];

                        //use header to iterate through the elements to keep the property order
                        //'hide items' happens in prepareHeaders
                        for (var j = 0; j < headers.length; j++) {
                            var item = headers[j];//.sTitle;

                            var valueToAdd = source[i][item];

                            //use converters
                            if (convertersAttr) {
                                var converterString = convertersAttr.getConverterStringTo(item);
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

                //prepare the header controls to add them to the header
                function prepareHeaderControls() {

                    //if the pageSizes attr is defined add it to the header controls
                    if (pageSizesAttr) {

                        var pageSizeChanger = {
                            type: DataTableExtensions.headerControls.select,
                            properties: {
                                options: pageSizesAttr,
                                label: "Show",
                                trigger: {mode: DataTableExtensions.triggerModes.onChange, callback: setPageSize} //calls the data table filters changed event
                            }
                        };

                        headerControls.push(pageSizeChanger);
                    }

                    //collect all of the header controls
                    if (headerControlsAttr) {
                        for (var i = 0; i < headerControlsAttr.length; i++) {

                            var control = headerControlsAttr[i];

                            //check if trigger mode is 'onchange' but there is no callback set by user
                            if (control.trigger && control.trigger.mode === DataTableExtensions.triggerModes.onChange
                                && !control.trigger.callback) {

                                control.trigger.callback = refreshCallback;
                            }

                            headerControls.push(control);
                        }
                    }

                    createCustomHeader(headerControls, setFilterOptions);
                }

                //call the create the header controls
                prepareHeaderControls();

                //call the create and set own paginations
                createPagination(previousCallback, nextCallback, hasNextPage, hasPreviousPage, decorateCallback);

                //function to draw the table
                function drawTable(source) {

                    originalSource = source;

                    //get the property names for header titles or the user defined header titles
                    if (headerTitlesAttr) {
                        haveCustomHeaderTitles = true;
                        prepareHeader(headerTitlesAttr);
                    } else {
                        prepareHeader(source[0]);
                    }

                    //get the property values for rows
                    var rows = prepareRows(source);

                    //set pagination
                    var pagination = twoButtonsPagination;

                    if (paginationTypeAttr) {
                        switch (paginationTypeAttr) {
                            case 'explicit':
                                pagination = customButtonsPagination;
                                break;
                            case 'implicit':
                                pagination = twoButtonsPagination;
                                break;
                        }
                    }

                    table = $(tableId).dataTable({
                        "aoColumns": headerTitles,
                        "aaData": rows,
                        "iDisplayLength": pageSize,
                        "fnInfoCallback": onInfoChanged,
                        "sPaginationType": pagination, //my implementation in dataTablesExtensions
                        "sDom": 't<"bottom"pi>',
                        "bFilter": false, //hides the search field
                        "bLengthChange": false, //hides the page size change option
                        "bSort": true //allows ordering
                    });

                    decorateDataTableOnChange();

                    setNavigationOnArrows();
                }

                //function called on the source change
                function refreshData(source) {

                    originalSource = source;

                    //check if it is the end of the elements or probably it is more
                    elementsMaxReached = source.length < pageSize;

                    table.fnClearTable();

                    var rows = prepareRows(source);

                    table.fnAddData(rows);

                    decorateDataTableOnChange();
                }

                //after adding the custom header it is not triggered by the default controls
                //checked why? ----------> 'i' was missing from sDom...
                function onInfoChanged(oSettings) { //other available params: iStart, iEnd, iMax, iTotal, sPre

                    //reading out the ordering info from oSettings
                    if (oSettings) {
                        var headerIndex = oSettings.aaSorting[0][0];
                        var direction = oSettings.aaSorting[0][1];
                        var header = headers[headerIndex];
                        var newOrder = { property: header.sTitle, direction: direction};

                        //need to check because at the first creation time it will be called to and at this time we are already in digest phase
                        if (!scope.$$phase) {
                            if (orderBy !== newOrder) {

                                orderBy = newOrder;
                                actualPageIndex = 0;
                                refreshCallback();
                            }
                        }
                    }
                }

                //set watch on the scope element
                function setWatchOnTheSource() {
                    var mySourceId = attrs.mySource;
                    var mySource = scope[mySourceId];

                    if (mySource) {
                        scope.$watch(mySourceId, function (source) {

                            //the first time set of the collection is a watch triggering action too
                            if (isInitTime && source && source.length > 0) {

                                //initialize the table
                                drawTable(mySource);
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
                    }
                }

                //call the set watch
                setWatchOnTheSource();
                //</editor-fold>
            }
        }
    });


//<editor-fold desc="array extensions">
Array.prototype.getElementByFilterName = getElementByFilterName;
function getElementByFilterName(obj) {
    if (obj) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].filterName === obj.filterName) {
                return this[i];
            }
        }
    }
    return null;
}


Array.prototype.getConverterStringTo = getConverterStringTo;
function getConverterStringTo(property) {
    if (property) {
        for (var i = 0; i < this.length; i++) {
            var element = this[i];
            if (element && element.property && element.property.toLowerCase() === property.toLowerCase()) {

                return element.converterCallback;
            }
        }
    }
    return null;
}
//</editor-fold>