/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')
    
    var LongTapSync = require("views/common/LongTapSync");
        

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Helpers
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    var Handlebars = require('lib2/handlebars-helpers');

    var TabBar = require('famous/widgets/TabBar');
    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Subviews
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // // Side menu of options
    // var GameMenuView      = require('views/Game/GameMenu');

    // Notifications SubView
    var AllView      = require('./Subviews/All');
    var FilterView      = require('./Subviews/All');
    // var PotentialView      = require('./Subviews/Potential');
    // var IncomingView      = require('./Subviews/Incoming');
    // var OutgoingView      = require('./Subviews/Outgoing');
    
    // Models

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();

        this._subviews = [];

        // // Wait for User to be resolved
        this.createContent();

        this.add(this.layout);

        // Listen for 'showing' events
        this._eventOutput.on('inOutTransition', function(args){
            // 0 = direction
            if(args[0] == 'showing'){
                // App.Data.ContestCollection.fetch();
            }
        });

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons
        this.headerContent = new View();

        // Create a Contest
        this.headerContent.Create = new Surface({
            content: '<i class="icon ion-ios7-plus-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Create.on('longtap', function(){
            Utils.Help('contest_plus');
        });
        this.headerContent.Create.on('click', function(){

            App.history.modifyLast({
                tag: 'StartAdd'
            });
            App.history.navigate('email/add', {history: false});

            return;
        });

        // Invoices
        this.headerContent.Invoices = new Surface({
            content: '<i class="icon ion-social-usd"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Invoices.on('longtap', function(){
            Utils.Help('contest_invoices');
            this.longTap = true;
        });
        this.headerContent.Invoices.on('click', function(){
            if(this.longTap === true){
                this.longTap = false;
                return;
            }
            App.history.navigate('invoice/list');
        });



        // Search
        this.headerContent.Search = new Surface({
            content: '<i class="icon ion-ios7-search-strong"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Search.on('longtap', function(){
            Utils.Help('contest_plus');
        });
        this.headerContent.Search.on('click', function(){
            App.history.navigate('contest/search');
        });

        // History
        this.headerContent.History = new Surface({
            content: '<i class="icon ion-ios7-search"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.History.on('longtap', function(){
            Utils.Help('contest_plus');
        });
        this.headerContent.History.on('click', function(){
            App.history.navigate('contest/history');
        });

        // ListContent switcher
        this.headerContent.FilterSwitcher = new View();
        this.headerContent.FilterSwitcher.Lightbox = new RenderController();
        this.headerContent.FilterSwitcher.SizeMod = new StateModifier({
            size: [80, 60]
        });
        this.headerContent.FilterSwitcher.add(this.headerContent.FilterSwitcher.SizeMod).add(this.headerContent.FilterSwitcher.Lightbox);
        
        this.headerContent.ShowContest = new Surface({
            content: '<i class="icon ion-ios7-circle-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowContest.on('longtap', function(){
            Utils.Help('contest_circle_checkmark');
        });
        this.headerContent.ShowContest.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowComplete);
            that.ListContent.show(that.ListContent.CompleteContests);
            that.ListContent.CompleteContests.collection.fetch();
        });
        this.headerContent.ShowComplete = new Surface({
            content: '<i class="icon ion-ios7-checkmark-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowComplete.on('longtap', function(){
            Utils.Help('contest_circle_checkmark');
        });
        this.headerContent.ShowComplete.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowAll);
            that.ListContent.show(that.ListContent.AllContests);
            that.ListContent.AllContests.collection.fetch();
        });
        this.headerContent.ShowAll = new Surface({
            content: '<i class="icon ion-ios7-checkmark"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowAll.on('longtap', function(){
            Utils.Help('contest_circle_checkmark');
        });
        this.headerContent.ShowAll.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowContest);
            that.ListContent.show(that.ListContent.Contests);
            that.ListContent.Contests.collection.fetch();
        });

        this.headerContent.FilterSwitcher.Lightbox.show(this.headerContent.ShowContest);


        // create the header
        this.header = new StandardHeader({
            content: "Threads",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // moreContent: false
            backContent: false,
            // moreClasses: ["normal-header"],
            moreSurfaces: [
                // this.headerContent.Invoices,
                // this.headerContent.History,
                // this.headerContent.Search, // Find NEW Jobs (maybe rename to Bids?)
                this.headerContent.Create
                // this.headerContent.FilterSwitcher,
            ]
            // moreContent: "New", //'<span class="icon ion-navicon-round"></span>'
        });
        this.header._eventOutput.on('back',function(){
            // App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            // App.history.back();
        });

        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // // Node for Modifier and background
        // this.HeaderNode = new RenderNode();
        // this.HeaderNode.add(this.headerBg);
        // this.HeaderNode.add(this.header.StateModifier).add(this.header);

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.tab_change = function(name){
        var that = this;

        // Determine the filter we'll use for this ListView
        var search_options = {},
            empty_string = '';

        // create correct filter

        switch(this.tabs.searches){

            case 'inbox':
                // contests I am responsible for completing
                empty_string = 'Inbox Zero!',
                search_options = {
                    type: 'label',
                    text: 'Inbox',
                    search_limit: 12
                };
                break;

            case 'starred':
                
                // contests that are assigned that you know about
                empty_string = 'No Starred Threads';
                search_options = {
                    type: 'label',
                    text: 'Starred',
                    search_limit: 12
                };
                break;

            default:
                alert(1);
                return;
        }

        var key = this.tabs.contests; //_complete + '_' +  this.tabs.contests_assigned;

        // is filter already created (JSON.stringify and check as a key)
        var cachedView = this._cachedViews[key];

        // Create the ListView if it doesn't exist
        if(!cachedView){
            cachedView = new FilterView({
                empty_string: empty_string,
                search_options: search_options
            });

            this._cachedViews[key] = cachedView;
            this._subviews.push(cachedView);

        } else {
            cachedView.collection.fetch();
        }

        // Show the ListView
        this.ListContent.show(cachedView);


    };

    PageView.prototype.createTabs = function(){
        var that = this;

        this.tabs = {
            searches: '',
            // contests_complete: 'notcomplete',
            // contests_assigned: 'all'
        }
        this._cachedViews = {};

        this.filterTabs = new View();
        this.filterTabs.getSize = function(){
            return [undefined, 40];
        };
        this.filterTabs.BgSurface = new Surface({
            size: [undefined, undefined],
            classes: ['todo-filter-tabs-bg-default']
        });
        this.filterTabs.Layout = new FlexibleLayout({
            direction: 0, //x
            // ratios: [true,true,true, 1, true,true,true]
            ratios: [true,1]
        });
        this.filterTabs.Views = [];
        this.filterTabs.SizeMod = new StateModifier({
            size: [undefined, 40]
        });



        // All the tab options that could be clicked
        // - and a spacer

        // My
        this.filterTabs.SearchInbox = new Surface({
            content: 'Inbox',
            size: [120, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.SearchInbox.group = 'Contests';
        this.filterTabs.SearchInbox.on('click', function(){
            that.tabs.searches = 'inbox';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'Contests'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.SearchInbox);

        // Assigned
        this.filterTabs.SearchStarred = new Surface({
            content: 'Starred',
            wrap: '<div class="ellipsis-all"></div>',
            size: [undefined, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.SearchStarred.group = 'Contests';
        this.filterTabs.SearchStarred.on('click', function(){
            that.tabs.searches = 'starred';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'Contests'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.SearchStarred);

        // // Completed
        // this.filterTabs.CompleteContests = new Surface({
        //     content: 'Hired Someone Else',
        //     wrap: '<div class="ellipsis-all"></div>',
        //     size: [undefined, undefined],
        //     classes: ['todo-filter-tabs-item-default']
        // });
        // this.filterTabs.CompleteContests.group = 'Contests';
        // this.filterTabs.CompleteContests.on('click', function(){
        //     that.tabs.contests = 'hired_else';
        //     that.tab_change();
        //     that.filterTabs.Views.forEach(function(tmpView){
        //         if(tmpView.group == 'Contests'){
        //             tmpView.setClasses(['todo-filter-tabs-item-default']);
        //         }
        //     });
        //     this.setClasses(['todo-filter-tabs-item-default','selected']);
        // });
        // this.filterTabs.Views.push(this.filterTabs.CompleteContests);

        this.filterTabs.Layout.sequenceFrom(this.filterTabs.Views);
        
        var node = this.filterTabs.add(this.filterTabs.SizeMod);
        node.add(Utils.usePlane('contentTabs',-1)).add(this.filterTabs.BgSurface);
        node.add(Utils.usePlane('contentTabs')).add(this.filterTabs.Layout);

        this.contentScrollView.Views.push(this.filterTabs);

        // Select Defaults
        this.filterTabs.SearchInbox._eventOutput.trigger('click');
        // this.filterTabs.ContestsAssignedAll._eventOutput.trigger('click');

    };

    
    PageView.prototype.createContent = function(){
        var that = this;

        // Content
        this.ContentStateModifier = new StateModifier();

        // // Filter 
        // this.ListContent.FilterContests = new FilterView({
        //     empty_string: "You have not created any Contests, ever!",
        //     filter: {}
        // });
        // this._subviews.push(this.ListContent.AllContests);

        // App.Data.User.populated().then(function(){
            // debugger;
            // this.contentScrollView = new SequentialLayout();
            that.contentScrollView = new FlexibleLayout({
                direction: 1, //FlexibleLayout.DIRECTION_Y,
                ratios: [true, 1]
            });
            that.contentScrollView.Views = [];


            // Lists
            that.ListContent = new RenderController();

            that.createTabs();

            // // Show "Contests" by default
            // that.ListContent.show(that.ListContent.Contests);
            // that.contentScrollView.Views.push(that.ListContent);
            that.contentScrollView.Views.push(that.ListContent);

            that.contentScrollView.sequenceFrom(that.contentScrollView.Views);

            that.layout.content.add(that.ContentStateModifier).add(that.contentScrollView);
        // });

    };

    PageView.prototype.refreshData = function() {
        try {
            // this.model.fetch();
            // this.media_collection.fetch();
            // this.errorList.fetch();
            // this.alert_collection.fetch();
            // this.CarTripListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        console.log('RemoteRefresh - PageView');
        Utils.RemoteRefresh(this, snapshot);
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        var args = arguments;

        this._eventOutput.emit('inOutTransition', arguments);

        // emit on subviews
        _.each(this._subviews, function(obj, index){
            obj._eventInput.emit('inOutTransition', args);
        });

        switch(direction){
            case 'hiding':

                switch(otherViewName){

                    case 'ContestView':
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        Timer.setTimeout(function(){

                            // Hide
                            that.ContentStateModifier.setOpacity(0, transitionOptions.outTransition);

                        }, delayShowing);

                        break;

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        Timer.setTimeout(function(){

                            // Slide down
                            that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? 1.5 : -1.5)),0,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;

            case 'showing':
                if(this._refreshData){
                    Timer.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    case 'ContestView':

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // Default opacity
                        that.ContentStateModifier.setOpacity(0);

                        // Content
                        // - extra delay
                        Timer.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setOpacity(1, transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);

                        break;

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // Default position
                        that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? -1.5 : 1.5)),0,0));

                        // Content
                        // - extra delay
                        Timer.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
        },
        footer: {
            size: [0,0]
        },
        content: {
            size: [undefined, undefined],
            inTransition: true,
            outTransition: true,
            overlap: true
        }
    };

    module.exports = PageView;

});
