var DataTableExtensions = DataTableExtensions || {};

DataTableExtensions.headerControls = {
    select: 0,
    button: 1,
    textBox: 2
};

DataTableExtensions.triggerModes = {
    onChange: 0,
    explicit: 1
};

DataTableExtensions.buttonStyle = {
    info: 0,
    warning: 1,
    error: 2,
    success: 3
};

//function to overwrite the pagination system of dataTables
function createPagination(previousCallback, nextCallback, hasNextPageCallback, hasPreviousPageCallback, decorateCallback) {

    $.fn.dataTableExt.oPagination.my_custom_buttons = {

        fnInit: function (oSettings, nPaging) {

            var pager = $('<ul class="pager">').appendTo(nPaging);

            console.log(pager);

            var nPreviousWrapper = $('<li id="previousPager">').appendTo(pager);//.addClass("paginate_enabled_previous");
            var nNextWrapper = $('<li id="nextPager">').appendTo(pager);//.addClass("paginate_enabled_next");

            var nPrevious = $('<a>').text("Previous").appendTo(nPreviousWrapper);
            var nNext = $('<a>').text("Next").appendTo(nNextWrapper);

            //click event subscribe on previous
            nPrevious.click(previousCallback);

            //click event subscribe on next
            nNext.click(nextCallback);


            //disallow text selection
            nPrevious.bind('selectstart', function () {
                return false;
            });
            nNext.bind('selectstart', function () {
                return false;
            });
        },

        fnUpdate: function (oSettings) {

            //check if there is the paging control allowed or not
            if (!oSettings.aanFeatures.p) {
                return;
            }

            $('#previousPager').switchClass(hasPreviousPageCallback, "paginate_enabled_previous", "paginate_disabled_previous");

            $('#nextPager').switchClass(hasNextPageCallback, "paginate_enabled_next", "paginate_disabled_next")

        }
    };


    $.fn.dataTableExt.oPagination.my_two_buttons = {
        /*
         * Function: oPagination.two_button.fnInit
         * Purpose:  Initialise dom elements required for pagination with forward/back buttons only
         * Returns:  -
         * Inputs:   object:oSettings - dataTables settings object
         *           node:nPaging - the DIV which contains this pagination control
         *           function:fnCallbackDraw - draw function which must be called on update
         */
        "fnInit": function ( oSettings, nPaging, fnCallbackDraw )
        {
            //var oLang = oSettings.oLanguage.oPaginate;
            //var oClasses = oSettings.oClasses;
            var fnClickHandler = function ( e ) {
                if ( oSettings.oApi._fnPageChange( oSettings, e.data.action ) )
                {
                    fnCallbackDraw( oSettings );
                }
            };

            var pager = $('<ul class="pager">').appendTo(nPaging);

            var nPreviousWrapper = $('<li id="previousPager">').appendTo(pager);//.addClass("paginate_enabled_previous");
            var nNextWrapper = $('<li id="nextPager">').appendTo(pager);//.addClass("paginate_enabled_next");

            var nPrevious = $('<a>').text("Previous").appendTo(nPreviousWrapper);
            var nNext = $('<a>').text("Next").appendTo(nNextWrapper);

            /*var els = $('a', nPaging);
             var nPrevious = els[0],
             nNext = els[1];*/

            oSettings.oApi._fnBindAction( nPrevious, {action: "previous"}, fnClickHandler );
            oSettings.oApi._fnBindAction( nNext,     {action: "next"},     fnClickHandler );

            /* ID the first elements only */
            if ( !oSettings.aanFeatures.p )
            {
                nPaging.id = oSettings.sTableId+'_paginate';
                nPrevious.attr('id', oSettings.sTableId+'_previous');
                nNext.attr('id', oSettings.sTableId+'_next');

                nPrevious.attr('aria-controls', oSettings.sTableId);
                nNext.attr('aria-controls', oSettings.sTableId);
            }
        },

        /*
         * Function: oPagination.two_button.fnUpdate
         * Purpose:  Update the two button pagination at the end of the draw
         * Returns:  -
         * Inputs:   object:oSettings - dataTables settings object
         *           function:fnCallbackDraw - draw function to call on page change
         */
        "fnUpdate": function ( oSettings )
        {
            if (!oSettings.aanFeatures.p) {
                return;
            }

            $('#previousPager').switchClass(function (){ return oSettings._iDisplayStart === 0 }, "paginate_disabled_previous", "paginate_enabled_previous");

            $('#nextPager').switchClass(function(){ return oSettings.fnDisplayEnd() == oSettings.fnRecordsDisplay()}, "paginate_disabled_next", "paginate_enabled_next");

            decorateCallback(oSettings._iDisplayStart);
        }
    };
}

//function to create own header for the data table
function createCustomHeader(controls, filterOptionsCallback) {

    //get the placeholder div for the custom header
    var customHeader = $("#customHeader");

    //array of own filter options defined by new controls
    var filtersToTrigger = [];

    //walk through the custom controls that the user want
    for (var i = 0; i < controls.length; i++) {

        var control = controls[i];

        //if array element is not a single element
        if (Object.prototype.toString.call(control) === '[object Array]') {
            createControlGroup(control);
        } else {

            var createFunction;
            switch (control.type) {

                case DataTableExtensions.headerControls.button:
                    createFunction = createButton;
                    break;
                case DataTableExtensions.headerControls.textBox:
                    createFunction = createTextBox;
                    break;
                case DataTableExtensions.headerControls.select:
                    createFunction = createSelector;
                    break;
            }

            createAndAppendControl(createFunction, control, customHeader);
        }
    }

    function createControlGroup(controls) {

        var controlGroup = $('<div></div>');
        controlGroup.addClass("control-group");

        //walk through the custom controls that the user want
        for (var i = 0; i < controls.length; i++) {

            var control = controls[i];

            var createFunction;
            switch (control.type) {

                case DataTableExtensions.headerControls.button:
                    createFunction = createButton;
                    break;
                case DataTableExtensions.headerControls.textBox:
                    createFunction = createTextBox;
                    break;
                case DataTableExtensions.headerControls.select:
                    createFunction = createSelector;
                    break;
            }

            createAndAppendControl(createFunction, control, controlGroup);
        }

        controlGroup.appendTo(customHeader);
    }

    function createAndAppendControl(createFunction, control, addToThis) {

        var newControl = createFunction(control.properties);
        newControl.appendTo(addToThis);
    }

    //create and append selector
    function createSelector(properties) {

        var selectorDiv = $('<div class="header-controls"></div>');

        //create the select tag with css class
        var select = $('<select class="header-selector"/>');

        //create label if the text box have label text
        if (properties.label) {

            var label = $('<label class="header-label">').text(properties.label);
            label.appendTo(selectorDiv);
        }

        select.appendTo(selectorDiv);

        //set the options for select
        for (var i = 0; i < properties.options.length; i++) {

            //$('<option />', {value: item, text: properties.options[item]}).appendTo(select);
            $('<option />', { value: properties.options[i], text: properties.options[i] }).appendTo(select);
        }

        //set trigger on sending filter infos of the selector
        if (properties.trigger) {

            var mode = properties.trigger.mode;

            if (mode === DataTableExtensions.triggerModes.explicit) {

                filtersToTrigger.push({
                    starter: properties.trigger.starter,
                    name: properties.filterName,
                    value: properties.options[0]
                });

                select.change(function () {

                    filtersToTrigger.push({
                        starter: properties.trigger.starter,
                        name: properties.filterName,
                        value: $(this).val()
                    });
                });
            }
            else if (mode === DataTableExtensions.triggerModes.onChange) {

                select.change(function () {
                    properties.trigger.callback($(this).val());
                });
            }
        }

        return selectorDiv;
    }

    //create and append text box
    function createTextBox(properties) {

        var textBoxDiv = $('<div class="header-controls"></div>');

        var textBox = $('<input type="text" class="header-button">');

        //create label if the text box have label text
        if (properties.label) {

            var label = $('<label class="header-label">').text(properties.label);
            label.appendTo(textBoxDiv);
        }

        textBox.appendTo(textBoxDiv);

        if (properties.trigger) {

            var mode = properties.trigger.mode;

            if (mode === DataTableExtensions.triggerModes.explicit) {

                filtersToTrigger.push({starter: properties.trigger.starter, name: properties.filterName});

                //if the filter is triggered by other control, just collect the value on change
                textBox.change(function () {

                    //starter - the other control that will send the filter
                    //name - the property name of the filter option
                    //value - the value of the filter option
                    filtersToTrigger.push({
                        starter: properties.trigger.starter,
                        name: properties.filterName,
                        value: $(this).val()
                    });
                });
            }

            else if (mode === DataTableExtensions.triggerModes.onChange) {

                textBox.change(function () {
                    properties.trigger.callback($(this).val())
                });
            }
        }

        return textBoxDiv;
    }

    //create and append button
    function createButton(properties) {

        var button = $('<button class="header-button"/>');
        button.text(properties.text);
        //button.click(properties.callback);

        switch (properties.style) {

            case DataTableExtensions.buttonStyle.info:
                button.addClass("btn btn-info");
                break;
            case DataTableExtensions.buttonStyle.warning:
                button.addClass("btn btn-warning");
                break;
            case DataTableExtensions.buttonStyle.success:
                button.addClass("btn btn-success");
                break;
            case DataTableExtensions.buttonStyle.error:
                button.addClass("btn btn-danger");
                break;
            default:
                button.addClass("btn");
                break;
        }

        if (properties.callback) {

            button.click(properties.callback);
        } else {
            //on click collect the filters registered to this control and call the callback with the changed values
            button.click(function () {

                var filters = [];
                for (var i = 0; i < filtersToTrigger.length; i++) {

                    var filter = filtersToTrigger[i];

                    console.log(filter);

                    if (filter.starter === properties.name) {

                        filters.push({filterName: filter.name, filterValue: filter.value});
                    }
                }

                filterOptionsCallback(filters);
            });
        }
        return button;
    }
}

//my implementation to switch between two css classes according to the result of the callback
(function ($) {
    $.fn.switchClass = function (conditionCallback, classA, classB) {

        var classToAdd;
        var classToRemove;

        if (conditionCallback()) {
            classToAdd = classA;
            classToRemove = classB;

        } else {
            classToAdd = classB;
            classToRemove = classA;
        }

        $(this).removeClass(classToRemove);
        $(this).addClass(classToAdd);
    };
})(jQuery);