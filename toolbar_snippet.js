var customViewUrl = "{{custom_view_url}}";

    var vizUrl = "{{tableau_server_url}}/t/{{site_content_url}}/views/{{workbook_content_url}}/{{view_content_url}}";
    if (customViewUrl !== ""){
        vizUrl += "/" + customViewUrl;
    }
    var placeholderDivId = 'tableauViz';

    // Defined in embedded_system.js
    debugLog('LocalVizOptions prior to load');
    debugLog(localVizOptions);
    function loadTableauContent() {
        initializeViz(placeholderDivId, vizUrl, localVizOptions, viz);
    }

    // This does the initial login flow for trusted auth. Once it is done, then do the actual load of the content
    authThenLoad(tableauServerBaseUrl, siteContentUrl, loginWorkbook, loginView, loadTableauContent, alertUserSSOFailed );

    /*
    * Web Edit Button Functionality
    */
    // Madhav Kannan Web Edit Implementation Method
    var iframeUrl = vizUrl;
    var urlAfterOnload;
    var webEditActiveOnloads = 0;

    function launchEdit() {
        viz.getCurrentUrlAsync().then( function(current_url){
            debugLog('Something happened with the Viz iframe URL!, first call');
            // Skip action if already in web edit mode, denoted by the lack of /views/ in the URL
            debugLog('iframeUrl is: ' + iframeUrl);
            if (iframeUrl.indexOf('/views/') !== -1){
                debugLog('Standard view detected, starting web edit');
                viz.dispose();
                toggleViewsList();
                url = current_url.split('?')[0].replace('/views', '/authoring');
                // After first WebEdit, you don't need to run the onFirstInteractive things anymore, except this

                // You need to change the initial sizing to account for the Web Edit UI taking up space
                // Must do a shallow copy (or maybe deep), rather than reference assignment.
                var webEditVizOptions = Object.assign({},localVizOptions);
                // Set to match the defaults, which will fill the space in a monitor proportion
                webEditVizOptions.height = defaultVizOptions.height;
                //webEditVizOptions.width = '1400px';
                webEditVizOptions.width = defaultVizOptions.width;
                var vizDiv = document.getElementById('tableauViz');
                //vizDiv.style.width = '1400px';
                vizDiv.style.width = defaultVizOptions.height;
                vizDiv.style.height = defaultVizOptions.height;


                webEditVizOptions.onFirstInteractive = function (e) {
                    debugLog('onFirstInteractive of Web Edit fires');
                    debugLog(e);
                    var v = e.getViz();
                    debugLog(v);
                    v.getCurrentUrlAsync().then(function(u)
                        {
                            debugLog('New URL Async from the firstInteractive');
                            debugLog(u);

                        }
                    );
                    var iframe = document.querySelectorAll('iframe')[0];
                   // iframe.style.width = defaultVizOptions.width;
                   // iframe.style.height = defaultVizOptions.width;
                    iframeUrl = iframe.src;
                    iframe.onload = function(){
                        debugLog('iFrame Onload event fires!');
                        debugLog(v);

                        debugLog(v.getUrl());
                        //console.log(v.getIsHidden());
                        v.getCurrentUrlAsync().then( function(current_url){
                            debugLog('Something happened with the Viz iframe URL!, from the web edit viz');
                            urlAfterOnload = current_url.split('?')[0];

                            // After the Onload, if the Vizes match then it was just a Close action
                            // This wil fire on the first load as well
                            debugLog('Current vizUrl: ' + vizUrl);
                            debugLog('Current urlAfterOnload: ' + urlAfterOnload);
                            if(urlAfterOnload == vizUrl){
                                //  Apparently this DOESN'T fire the first time, so just look for the 0 on the counter
                                // Counter may not be necessary long term
                                debugLog('Web Edit counter is : ' + webEditActiveOnloads);
                                if (webEditActiveOnloads == 0) {
                                    // Reset to the /views/ URL so Web Edit can be triggered again
                                    //iframeUrl = current_url.split('?')[0];
                                    iframeUrl = urlAfterOnload.replace('/authoring', '/views');
                                    debugLog('Resetting the iframeUrl to: ' + iframeUrl);
                                    debugLog('Rebuilding the tabs list');
                                    // You actually need to reinitialize here, otherwise the filters don't rewire after
                                    // a regular close in web edit
                                    debugLog('LocalVizOptions at time of web edit reinitialize');
                                    debugLog(localVizOptions);
                                    clearFiltersPane();
                                    document.getElementById(placeholderDivId).style.visibility = 'hidden';
                                    // This should assign the global viz variable to the actual working viz object at this moment
                                    viz = v;
                                    initializeViz(placeholderDivId, vizUrl, localVizOptions, viz);
                                    initializeTableauMenuButtons(viz);
                                    debugLog('Toggling the tabs list to visible');
                                    toggleViewsList();
                                    webEditActiveOnloads = 0;
                                }
                                else{
                                    debugLog('Incrementing the Web Edit counter');
                                    webEditActiveOnloads++;
                                    debugLog(webEditActiveOnloads);
                                }

                            }
                            // If the new URL is different from the original, it is a Save As
                            // Reload back into the standard view after a Save As, they can trigger off web edit later if they want
                            else {
                                // Reset the original to match the new, in case another Save As happens
                                vizUrl = urlAfterOnload;
                                // Keeps the lock on the Web Edit button until close
                                //iframeUrl = current_url.split('?')[0].replace('/views', '/authoring');
                                //iframeUrl = current_url.split('?')[0];
                                // Reset to the /views/ URL so Web Edit can be triggered again
                                //iframeUrl = current_url.split('?')[0];
                                iframeUrl = urlAfterOnload.replace('/authoring', '/views');
                                // Refresh the thumbnail cache because there is a new workbook
                                debugLog('New viz, refreshing the thumbnail cache');
                                refreshThumbnailCache('{{site_content_url}}');  // embedded_system.js

                                // This should make the global viz variable match the current viz object
                                viz = v;

                                // Destroy the web edit window, and then reload to original

                                // Destroying existing viz
                                clearFiltersPane();
                                document.getElementById(placeholderDivId).style.visibility = 'hidden';
                                initializeViz(placeholderDivId, vizUrl, localVizOptions, viz);
                                debugLog('Toggling the tabs list to visible');
                                toggleViewsList();
                                initializeTableauMenuButtons(viz);
                                webEditActiveOnloads = 0;
                            }
                        });
                    };
                };
                console.log("About to initialize the web edit view");
                initializeViz(placeholderDivId, url, webEditVizOptions, viz);
            }
        })
    }

    var viewsDest = 'views-list';
    // JS API version of this code. Could do later with REST

    // This completely deletes the elements in the filters pane, for a tab / view change
    function clearFiltersPane(){
        //console.log('Clearing all existing filters from teh pane');
        // do this - clear all the dimension filter selections
        //console.log("cat_divs:", cat_divs);

        // left off here on 10/8/19
        // need to fix this so that filters work after revertAllAsync is called
        deleteCategoricalFilters(cat_divs);


        // other filter types stubbed out below

        // do this - clear all the quantitative filter selections
        // clearQuantitativeFilters(quant_divs);

        // do this - clear all the date filter selections
        // clearDateFilters(date_divs);
        createFiltersProcessingMessage();
    }

    function createFiltersProcessingMessage(){
        // Create processing msg in case some one clicks on the new filters menu before it finishes loading
        if (document.getElementById('filterProcessingMessage') == null){
            var msgP = document.createElement('p');
            msgP.id = "filterProcessingMessage"
            msgP.style.display = "block";
            msgP.innerText = 'Retrieving filters ';
            var img = document.createElement('img');
            img.src = "{% static "images/loader-spinner.gif" %}";
            img.style.height = '20px';
            img.style.width = '20px';
            msgP.append(img);
            document.getElementById('multiSelectButtons').append(msgP);
        }
    }

    // This resets the values in the filters, per a revert
    function resetAllFilters(){
        console.log('Clearing existing detected filters');
        // do this - clear all the dimension filter selections
        console.log("cat_divs:", cat_divs);

        // left off here on 10/8/19
        // need to fix this so that filters work after revertAllAsync is called
        clearCategoricalFilters(cat_divs);


        // other filter types stubbed out below

        // do this - clear all the quantitative filter selections
        // clearQuantitativeFilters(quant_divs);

        // do this - clear all the date filter selections
        // clearDateFilters(date_divs);
    }

    // Lets you control the filter slider later
    var filterSlider;

    function initializeTableauMenuButtons(vizObj){
        // All elements are wrapped in an if statement checking if they exist, in case we remove things from the HTML for any reason

        // pdf export button
        if (document.getElementById('pdf-export-2') != null) {
            document.getElementById('pdf-export-2').onclick = function () {
                viz.showExportPDFDialog();
            };
        }

        // image export button
        if (document.getElementById('image-export-2') != null){
            document.getElementById('image-export-2').onclick = function () {
                viz.showExportImageDialog();
            };
        }

        // data export button
        if ( document.getElementById('data-export-2') != null) {
            document.getElementById('data-export-2').onclick = function () {
                viz.showExportDataDialog();
            };
        }

        // share button
        if ( document.getElementById('share-2') != null) {
            document.getElementById('share-2').onclick = function () {
                viz.showShareDialog();
            };
        }

        // refresh data button
        if ( document.getElementById('refreshData-2') != null) {
            document.getElementById('refreshData-2').onclick = function () {
                // alert("Refreshing Data!");
                viz.refreshDataAsync();
            };
        }

        // web-edit
        if ( document.getElementById('web-edit-2') != null ) {
            document.getElementById('web-edit-2').onclick = function () {
                launchEdit();
            };
        }

      // revert viz and clear all the filters -- need to talk to select2
        if ( document.getElementById('revertViz-2') != null) {
          document.getElementById('revertViz-2').onclick = function () {
              viz.revertAllAsync().then(resetAllFilters);

              // clearCategoricalFilters(cat_divs, filterDataForSelect2);
          }
        }

        // Slide-out Menu for Filters
        if ( document.getElementById('handle-filters') != null) {
            console.log('Adding the slide-out filter JS');
            //console.log($("#handle-filters"));
            filterSlider = $("#left-slideout-pane").slideReveal({
                trigger: $("#handle-filters"), // This is the ID of the button element to trigger the appearance of the filters slideout
                position: "right",
                push: false,
                overlay: true,
                speed: 800,
                top: 150,
                autoEscape: false
            });
            console.log('Slide-out filter JS all done');
            //console.log($("#left-slideout-pane"));
        }

        // actions button
        if ( document.getElementById('action-dialog') != null) {
            document.getElementById('action-dialog').onclick = function () {
                displayActionsDialog();
            };
        }

        // subscriptions button
        if( document.getElementById('subscribe-2') != null) {
            document.getElementById('subscribe-2').onclick = function () {
                displaySubscriptionsDialog();
            };
        }

        // subscriptions button
        if( document.getElementById('custom-views-2') != null) {
            document.getElementById('custom-views-2').onclick = function () {
                displayCustomViewsDialog();
            };
        }
    }

    /*
    * Do Actions menu based on marksSelection
    */
    // We'll constantly be updating what is selected in an object in the background, then this will just show that selection
    // Solves the problem of not knowing which sheet might be the active one
    function displayActionsDialog(){
        // Blank anything in the modal menu, then redisplay this one
        var modalMenuDivs = document.getElementsByClassName('modal-menu-content');
        // This some fancy JavaScript calling because the result is an HTMLCollection not an array
        Array.prototype.forEach.call(modalMenuDivs,  function(div){   div.style.display = 'none';  } );
        document.getElementById('actionDialogDiv').style.display = 'block';
        // Check if there is anything, display something else if not
        if (lastSelectedMarks === undefined) {
            console.log('No selections to display');
            document.getElementById('actionForm').innerHTML = '<p>No marks were selected';
        }
        else {
            debugLog('This was the most recently selected set of marks');
            debugLog(lastSelectedMarks);
            // Create a table object from those marks
            var table = lastSelectedMarks.getTableObjectOfFormattedValues();
            debugLog(table);

            // Add a column of select boxes to each row
            var tableThead = table.tHead;
            var th = document.createElement('th');
            th.innerText = 'Action to Take';
            tableThead.append(th);
            for (var i = 0, len = table.rows.length; i < len; i++) {
                var td = document.createElement('td');
                td.style.minWidth = '250px';
                td.innerHTML = '<select><option selected>None</option><option>Reprocessing</option><option>Customer Support</option><option>Make Reminder</option></select>';
                table.rows[i].append(td);
            }
            var form = document.createElement('form');
            form.append(table);
            var formDiv = document.getElementById('actionForm');
            // Delete anything that exists from previous builds
            formDiv.innerHTML = "";
            // Now place the new table there
            document.getElementById('actionForm').append(form);
        }
    }

    /*
    * Subscriptions require REST API commands, so they need their own UI
    */
    function displaySubscriptionsDialog(){
        var modalMenuDivs = document.getElementsByClassName('modal-menu-content');
        // This some fancy JavaScript calling because the result is an HTMLCollection not an array
        Array.prototype.forEach.call(modalMenuDivs,  function(div){   div.style.display = 'none';  } );
        // Blank anything in the modal menu, then redisplay this one
        document.getElementById('subscribeDialogDiv').style.display = 'block';
    }

    /*
    * Custom Views have JS API methods, but unlike the others, they don't make the standard UI appear in the Viz iframe
    * Instead, you need to create your own UI for managing them
    */

    // Global variable for whenever the UI actually is displayed
    var customViews = [];

    function retrieveCustomViews(){
        // Custom view functions attach to the Workbook object -- https://help.tableau.com/current/api/js_api/en-us/JavaScriptAPI/js_api_ref.htm#workbook_class
        var wb = viz.getWorkbook();
        // Retrieving Custom Views is Async
        wb.getCustomViewsAsync().then(
            // Returns an Array of CustomView objects - https://help.tableau.com/current/api/js_api/en-us/JavaScriptAPI/js_api_ref.htm#customview_class
            function (cvs){
                console.log('Retrieved Custom Views');
                console.log(cvs);

                for(var i = 0, len = cvs.length; i < len; i++){
                    var cv = cvs[i];
                    //console.log(cv);
                    // Only show your own views, just in case we forgot to turn off public views

                    if (cv.getAdvertised() == false){
                        var cvAttributes = {'name' : cv.getName(), 'isDefault': cv.getDefault(), 'url': cv.getUrl() };
                        customViews.push(cvAttributes);
                    }
                }
                console.log(customViews);
            }
        , function (e) {
            console.log('Error occurred retrieving custom views:');
            console.log(e);
        });
    }

    function displayCustomViewsDialog(){
        var modalMenuDivs = document.getElementsByClassName('modal-menu-content');
        // This some fancy JavaScript calling because the result is an HTMLCollection not an array
        Array.prototype.forEach.call(modalMenuDivs,  function(div){   div.style.display = 'none';  } );
        // Blank anything in the modal menu, then redisplay this one
        document.getElementById('customViewsListDiv').innerHTML = "";
        // Clear the dialog box if they entered something before
        document.getElementById('newSavedViewName').value = "";
        document.getElementById('makeSavedViewDefault').checked = false;
        if (customViews.length == 0) {
            console.log('No custom views');
            document.getElementById('customViewsListDiv').innerHTML = '<p>You have no custom saved views for this view';
        }
        else {
            // Create an unordered list then add all the views that are available.
            var ul = document.createElement('ul');
            for (var i = 0, len = customViews.length; i < len; i++) {
                var li = document.createElement('li');

                if (customViews[i].isDefault ) {
                    li.innerHTML = '<a href="#" onclick="viz.getWorkbook().showCustomViewAsync(\'' + customViews[i].name  + '\'); return false;">' + customViews[i].name + " (default)" + '</a>';
                }
                else {
                    li.innerHTML = '<a href="#" onclick="viz.getWorkbook().showCustomViewAsync(\'' + customViews[i].name + '\'); return false;">' + customViews[i].name + '</a>';
                }

                ul.append(li);

            }
            // Now add the non-custom view as an option. You send null (or nothing) to go back to default (not very obvious from the documentation)
            li = document.createElement('li');
            li.innerHTML = '<a href="#" onclick="viz.getWorkbook().showCustomViewAsync(null); return false;"><i><b>Revert to Original View</b></i></a>';
            ul.append(li);

            document.getElementById('customViewsListDiv').append(ul);
        }


        document.getElementById('customViewDialogDiv').style.display = 'block';
    }

    function saveCustomView(){
        var wb = viz.getWorkbook();
        var customViewName = document.getElementById('newSavedViewName').value;
        if (customViewName == ""){
            alert('Please give a name for this Saved View');
            return;
        }
        var setDefaultFlag = document.getElementById('makeSavedViewDefault').checked;
        wb.rememberCustomViewAsync(customViewName).then(
            function(cv){
                console.log('New custom view created successfully:');
                console.log(cv);
                // Now refresh the listings
                if (setDefaultFlag == true){
                    wb.setActiveCustomViewAsDefaultAsync().then(
                        function () {
                            console.log('Current Custom View set as default');
                            customViews = [];
                            retrieveCustomViews();
                        },
                        function (e) {
                            console.log('Setting custom view to default had error:');
                            console.log(e);
                        }
                    );

                }
                else {
                    customViews = [];
                    retrieveCustomViews();
                }


            },
            function(e){
                console.log('Custom view creation had an error:');
                console.log(e);
            }
        );
    }