/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ContainerSurface = require('famous/surfaces/ContainerSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var RenderController         = require('famous/views/RenderController')

    var MouseSync     = require("famous/inputs/MouseSync");
    var TouchSync     = require("famous/inputs/TouchSync");
    var ScrollSync    = require("famous/inputs/ScrollSync");
    var GenericSync   = require("famous/inputs/GenericSync");

    var Draggable     = require("famous/modifiers/Draggable");

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Extras
    var Utils = require('utils');

    var _ = require('underscore');

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    var StandardHeader2 = require('views/common/StandardHeader2');
    var SideNavLayout = require('views/common/SideNavLayout');
    var SidebarView = require('views/common/SidebarView');
    var SidebarItem = require('views/common/SidebarItem');

    var ModifiedSurface = require('views/common/ModifiedSurface');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/ThreadQuick.html');
    var template            = Handlebars.compile(tpl);

    // Models
    var mThread = require('models/thread');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // Determine the type of NormalList we're showing
        switch(this.params.args[0]){
            case 'inbox':
                this.search_info = {
                    type: 'label',
                    text: 'Inbox',
                    search_limit: 12
                };

                break;

            case 'starred':
                this.search_info = {
                    type: 'label',
                    text: 'Starred',
                    search_limit: 12
                };
                break;

            default:
                alert('not stored NormalList for this name');
                Timer.setTimeout(function(){
                    window.history.go(-1);
                },100);
                return;
                break;
        }
        
        // create the layout
        this.layout = new SideNavLayout({
            headerSize: 50,
            sideSize: 50,
            footerSize: 0,
            // direction: 0 // sideways
        });

        this.createContent();
        this.createHeader();
        this.createSidebar();

        // Models

        this.collection = new mThread.ThreadCollection([],this.search_info);
        this.collection.infiniteResults = 0;
        this.collection.on("sync", this.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addThread, this);
        this.collection.on("error", function(){
            console.error('Collection error');
        });
        this.collection.on("request", function(){
            // todo
        });

        // Fetch
        this.collection.fetch({prefill: true});
        this.collection.populated().then(function(){
            // Got a few threads

            that.updateCollectionStatus();

            // // reset surfaces
            // that.scrollSurfaces = [];

            // // add surfaces
            // that.addThreads();

        });
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header bar
        this.header = new StandardHeader2({
            content: this.search_info.text,
            classes: ["normal-header"],
            backClasses: ["back-header"],
            moreContent: false
        }); 
        this.header.on('back', function(){
            window.history.go(-1);
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        this.layout.header.add(this.header);

    };

    PageView.prototype.createSidebar = function(){
        var that = this;
        
        var maxWidth = window.innerWidth,
            rightPadding = 20,
            tabExtraWidth = 40,
            tabWidth = maxWidth - rightPadding,
            contentWidth = maxWidth - rightPadding - tabExtraWidth;

        this.sidebar = new SequentialLayout();
        this.sidebar.currentDragger = null;
        this.sidebar.contentWidth = contentWidth;
        this.sidebar.OriginMod = new StateModifier({
            origin: [0, 1]
        });
        this.sidebar.Sequence = [];

        // Sidebar bg
        this.sidebar.Background = new Surface({
            size: [undefined, undefined],
            properties: {
                // backgroundColor: "white"
            }
        });

        // Overlay for sidebar
        // - below the menu though
        this.sidebar.Overlay = new View();
        this.sidebar.Overlay.SizeMod = new StateModifier({
            size : [undefined, undefined]
        });
        this.sidebar.Overlay.OpacityMod = new Modifier({
            opacity : function(){
                // console.log(that.sidebar);
                if(that.sidebar.currentDragger){
                    var currentPosition = that.sidebar.currentDragger.position.get();
                    return Utils.ratio_remap((currentPosition[0] / that.sidebar.contentWidth), [0,1],[0,0.5]);
                    // return (currentPosition[0] / that.sidebar.contentWidth); // currentPosition[1]
                }
                // console.log(that.sidebar.curentDragger);
                return 0;
            }
        });
        this.sidebar.Overlay.Surface = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: "white"
            }
        });
        this.sidebar.Overlay.add(this.sidebar.Overlay.SizeMod).add(this.sidebar.Overlay.OpacityMod).add(this.sidebar.Overlay.Surface);

        // Items
        _.each(_.range(3),function(i){

            var newItem = new SidebarItem({
                parent: that.sidebar,
                type: 'throw_across',
                tab: {
                    content: 't' + i.toString(),
                    properties: {}
                }
            });
            that.sidebar.Sequence.push(newItem);

        });

        // Items
        _.each(_.range(3),function(i){

            var newItem = new SidebarItem({
                parent: that.sidebar,
                type: 'content_drawer',
                tab: {
                    content: 'd' + i.toString(),
                    properties: {}
                }
            });
            that.sidebar.Sequence.push(newItem);

            // // Container for sideview
            // var temp = new View();
            // // temp.SizeMod = new StateModifier({
            // //     size: [window.innerWidth - 100, undefined],
            // // });
            // temp.TranslateMod = new Modifier({
            //     transform: Transform.translate(-1 * (contentWidth), 0, 0)
            // });

            // // Tab
            // temp.tab = new View();
            // temp.tab.Surface = new Surface({
            //     content: 'Opt',
            //     size: [tabWidth, 40],
            //     properties: {
            //         textAlign: "right",
            //         paddingRight: "2px",
            //         lineHeight: "40px",
            //         color: "white",
            //         backgroundColor: "hsl(" + (i * 360 / 40) + ", 100%, 50%)",
            //         // backgroundColor: "black",
            //         borderRadius: "0 3px 3px 0"
            //     }
            // });
            // temp.tab.HeightMod = new StateModifier({
            //     size: [tabWidth, 60]
            // });


            // temp.touchSync = new GenericSync({
            //     "mouse"  : {},
            //     "touch"  : {}
            // });
            // temp.position = new Transitionable([0,0]);

            // // temp.pipe(temp.touchSync);

            // // temp.pipe(that.contentScrollView);

            // temp.touchSync.on('start', function(data){
            //     // Add the overlay to the content
            //     // - don't want to accidentally press something
            //     that.sidebar.currentDragger = temp;

            //     // Clear other displayed ones
            //     _.each(that.sidebar.Sequence, function(tmpView){
            //         if(tmpView !== temp){
            //             tmpView.position.tuckAway({});
            //         }
            //     });

            //     // // Overlay sizes
            //     // that.layout.content.Overlay.SizeMod.setSize([undefined, undefined]);
            //     // that.sidebar.Overlay.SizeMod.setSize([undefined, undefined]);

            // });

            // temp.touchSync.on('update', function(data){
            //     var currentPosition = temp.position.get(),
            //         currentAdded = currentPosition[0] + data.delta[0],
            //         newXPosition = 0;
            //     if(currentAdded >= contentWidth){
            //         newXPosition = contentWidth;
            //     } else {
            //         newXPosition = currentPosition[0] + data.delta[0];
            //     }

            //     temp.position.set([
            //         newXPosition,
            //         currentPosition[1] + data.delta[1]
            //     ]);

            // });
            // temp.touchSync.on('end', function(data){
                
            //     // Resetting?
            //     var velocity = data.velocity;
            //     if(velocity && velocity[0] > 0){
            //         temp.position.extendOut(data);
            //     } else {
            //         temp.position.resetToOriginal(data, true);
            //         temp.position.resetOthersToOriginal(data);
            //     }
            // });
            // temp.touchSync.on('leave', function(data){
            //     var velocity = data.velocity;
            //     if(velocity && velocity[0] > 0){
            //         temp.position.extendOut(data);
            //     } else {
            //         temp.position.resetToOriginal(data, true);   
            //         temp.position.resetOthersToOriginal(data);
            //     }
            // });


            // temp.position.resetOthersToOriginal = function(){
            //     // Clear other displayed ones
            //     _.each(that.sidebar.Sequence, function(tmpView){
            //         if(tmpView !== temp){
            //             tmpView.position.resetToOriginal({});
            //         }
            //     });
            // };

            // temp.position.resetToOriginal = function(data, callback){
            //     // Resettting back to "semi-hidden"
            //     var velocity = data.velocity || 0;
            //     temp.position.set([0, 0], {
            //         method : 'spring',
            //         period : 150,
            //         dampingRatio: 0.9,
            //         velocity : velocity
            //     }, function(){
            //         if(callback && that.sidebar.currentDragger == temp){
            //             that.sidebar.currentDragger = null;
            //         }
            //     });

            // };
            // temp.position.tuckAway = function(data){
            //     // Resettting back to "semi-hidden"
            //     var velocity = data.velocity || 0;
            //     var hideSize = -1 * (tabExtraWidth - 2);
            //     if(that.sidebar.Sequence.indexOf(temp) >= that.sidebar.Sequence.indexOf(that.sidebar.currentDragger)){
            //         hideSize = -1 * (tabExtraWidth);
            //     }
            //     temp.position.set([hideSize, 0], {
            //         method : 'spring',
            //         period : 150,
            //         dampingRatio: 0.9,
            //         velocity : velocity
            //     });

            // };
            // temp.position.extendOut = function(data){
            //     // Extends out the view
            //     var velocity = data.velocity || 0;
            //     temp.position.set([contentWidth, 0], {
            //         method : 'spring',
            //         period : 150,
            //         dampingRatio: 0.9,
            //         velocity : velocity
            //     });
            // };

            // temp.positionModifier = new Modifier({
            //     transform : function(){
            //         var currentPosition = temp.position.get();
            //         return Transform.translate(currentPosition[0], 0, 0); // currentPosition[1]
            //     }
            // });

            // temp.tab.add(temp.tab.Surface);
            // // temp.tab.Surface.pipe(temp.tab.draggable);
            // temp.tab.Surface.pipe(temp.touchSync);


            // // Content
            // temp.content = new View();
            // temp.content.SizeMod = new StateModifier({
            //     size: [contentWidth, window.innerHeight - 20]
            // });
            // temp.content.Surface = new Surface({
            //     size: [undefined, undefined],
            //     content: "sideview content here",
            //     properties: {
            //         backgroundColor: "hsl(" + (i * 360 / 40) + ", 100%, 50%)",
            //         color: "#444",
            //         borderColor: "#222"
            //     }
            // });

            // temp.content.Surface.pipe(temp.touchSync);


            // temp.content.add(temp.content.SizeMod).add(temp.content.Surface);

            // // Only as high as the tab height
            // var node = temp.add(temp.TranslateMod).add(temp.tab.HeightMod).add(temp.positionModifier).add(new Modifier({transform: Transform.inFront}));
            // node.add(temp.content);
            // node.add(temp.tab)

            // that.sidebar.Sequence.push(temp);
        });
        
        var frontMod = new Modifier({transform : Transform.inFront});

        this.sidebar.sequenceFrom(this.sidebar.Sequence);

        // this.layout.side.add(this.sidebar.Background);
        this.layout.side.add(this.sidebar.Overlay);
        this.layout.side.add(this.sidebar.OriginMod).add(frontMod).add(this.sidebar);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // // create the scrollView of content
        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        // this.scrollSurfaces = [];

        // // link endpoints of layout to widgets

        // // // Add surfaces to content (buttons)
        // // this.addSurfaces();

        // // Sequence
        // this.contentScrollView.sequenceFrom(this.scrollSurfaces);



        this.lightbox = new RenderController();

        // Create LightboxButtons for Render Infinity Buttons (refreshing, etc.)
        this.lightboxButtons = new RenderController();

        // Scrollview of actual content
        this.content_layout = new ScrollView(App.Defaults.ScrollView);

        this.threadListLayout = new SequentialLayout();
        this.threadListLayout.Views = [];
        this.threadListLayout.sequenceFrom(this.threadListLayout.Views);

        // Sequence main layout from the trip surfaces, and the buttons
        this.content_layout.sequenceFrom([
            this.threadListLayout, // another SequentialLayout
            this.lightboxButtons
        ]);

        // Create Loading Renderable
        this.loadingSurface = new Surface({
            content: "Loading Threads",
            size: [undefined, 100],
            properties: {
                color: "black",
                backgroundColor: "#F8F8F8",
                textAlign: "center"
            }
        });
        // Create "No Results" Renderable
        this.emptyListSurface = new Surface({
            content: "No threads to show",
            size: [undefined, 100],
            properties: {
                color: "black",
                backgroundColor: "#F8F8F8",
                textAlign: "center"
            }
        });

        // Create infinite Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            properties: {
                color: "black",
                backgroundColor: "#F8F8F8",
                textAlign: "center",
                lineHeight: "50px"
            }
        });
        this.infinityLoadingSurface.pipe(this.content_layout);

        // Loaded 'em all!
        // - shows "X total trips"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            properties: {
                color: "blue",
                backgroundColor: "#F8F8F8",
                textAlign: "center",
                lineHeight: "50px"
            }
        });
        this.infinityLoadedAllSurface.pipe(this.content_layout);

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            properties: {
                color: "black",
                backgroundColor: "white",
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: "50px"
            }
        });
        this.infinityShowMoreSurface.pipe(this.content_layout);
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });

        // Show loading surface
        this.lightboxButtons.show(this.infinityLoadingSurface);


        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error

        // // this.add(this.layoutSizeMod).add(this.layout); 
        // this.add(this.content_layout);




        // var container = new ContainerSurface({
        //     size: [undefined, undefined],
        //     properties:{
        //         overflow:'hidden'
        //     }
        // })
        // container.add(this.contentScrollView)

        // Content bg
        // - for handling clicks
        this.contentBg = new Surface({
            size: [undefined, undefined],
            properties: {
                zIndex: "-1"
            }
        });
        this.contentBg.on('click', function(){
            window.history.go(-1);
        });

        // Content
        this.layout.content.StateModifier = new StateModifier({
            // origin: [0, 1],
            // size: [undefined, undefined]
        });
        this.layout.content.SizeModifier = new StateModifier({
            size: [undefined, undefined]
        });



        // Overlay for content
        // - gets semi blacked-out on drag across
        this.layout.content.Overlay = new View();
        this.layout.content.Overlay.SizeMod = new Modifier({
            // size: [0,0]
            size : function(){
                if(that.sidebar.currentDragger){
                    // console.log(that.sidebar.currentDragger.position.get());
                    return [undefined, undefined];
                    // var currentPosition = that.sidebar.currentDragger.position.get();
                    // return Utils.ratio_remap((currentPosition[0] / that.sidebar.contentWidth), [0,1],[0,0.7]);
                    // // return (currentPosition[0] / that.sidebar.contentWidth); // currentPosition[1]
                }
                return [0,1];
                // var currentPosition = temp.position.get();
                // return Transform.translate(currentPosition[0], 0, 0); // currentPosition[1]
            }
        });
        this.layout.content.Overlay.OpacityMod = new Modifier({
            opacity : function(){
                // console.log(that.sidebar);
                if(that.sidebar.currentDragger){
                    var currentPosition = that.sidebar.currentDragger.position.get();
                    return Utils.ratio_remap((currentPosition[0] / that.sidebar.contentWidth), [0,1],[0,0.7]);
                    // return (currentPosition[0] / that.sidebar.contentWidth); // currentPosition[1]
                }
                // console.log(that.sidebar.curentDragger);
                return 0;
            }
        });
        this.layout.content.Overlay.Surface = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: "white"
            }
        });
        this.layout.content.Overlay.add(this.layout.content.Overlay.SizeMod).add(this.layout.content.Overlay.OpacityMod).add(this.layout.content.Overlay.Surface);

        var frontMod = new Modifier({transform : Transform.inFront});
        var behindMod = new Modifier({transform : Transform.behind});

        // Now add content
        // this.layout.content.add(this.contentBg);
        this.layout.content.add(behindMod).add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(this.lightbox);
        this.layout.content.add(frontMod).add(this.layout.content.Overlay);




        // // Overlay for content
        // // - hiding on menu out
        // this.layout.content.Overlay = new View();
        // this.layout.content.Overlay.SizeMod = new StateModifier({
        //     size: [0,0]
        // });
        // this.layout.content.Overlay.OpacityMod = new Modifier({
        //     opacity : function(){
        //         // console.log(that.sidebar);
        //         if(that.sidebar.currentDragger){
        //             var currentPosition = that.sidebar.currentDragger.position.get();
        //             return Utils.ratio_remap((currentPosition[0] / that.sidebar.contentWidth), [0,1],[0,0.7]);
        //             // return (currentPosition[0] / that.sidebar.contentWidth); // currentPosition[1]
        //         }
        //         // console.log(that.sidebar.curentDragger);
        //         return 0;
        //     }
        // });
        // this.layout.content.Overlay.Surface = new Surface({
        //     size: [undefined, undefined],
        //     properties: {
        //         backgroundColor: "black"
        //     }
        // });
        // this.layout.content.Overlay.add(this.layout.content.Overlay.SizeMod).add(this.layout.content.Overlay.OpacityMod).add(this.layout.content.Overlay.Surface);

        // // Not actually setting this.lightbox.show(), waiting for models first

        // // Now add content
        // // this.layout.content.add(this.contentBg);
        // this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(this.lightbox); //add(this.contentScrollView);
        // this.layout.content.add(this.layout.content.Overlay);
        // // this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(container);


    };

    PageView.prototype.addThread = function(Thread) {
        var that = this;

        var thread = Thread.toJSON();

        // Get related Emails for Thread
        Thread._related.Email.populated().then(function(){

            surface.setContent(buildThread(Thread));

        });
        Thread.fetchRelated();

        var buildThread = function(Thread){

            return template({
                Thread: Thread.toJSON(),
                Email: Thread._related.Email.toJSON()
            });

            // if(Thread._related.Email.hasFetched !== true){
            //     return '<div>' + Utils.safeString(Thread.toJSON().original.subject) + '</div><div>&nbsp;</div>'; //thread.attributes.total_emails;
            // }

            // // Build the more complex version now that we have the full email
            // var content = '';
            // content += '<div>'+Utils.safeString(Thread.toJSON().original.subject)+'</div>';
            // content += '<div>'+Utils.safeString(Thread._related.Email.first().toJSON().original.headers.From)+'</div>';

            // // console.log(surface.getSize(true));
            // // console.log(surface._size);

            // return content;

        };

        // var surface = new ModifiedSurface({
        var surface = new Surface({
            content: buildThread(Thread),
            size: [undefined, 80],
            initialSize: [undefined, 100],
            classes: ["thread-list-item"],
            properties: {
                lineHeight: '20px',
                // padding: '10px 0',
                // borderBottom: '1px solid #ddd',
                // backgroundColor: "white"
            }
        });

        surface.View = new View();
        surface.View.TransitionModifier = new StateModifier();
        surface.View.CustomSizeMod = new StateModifier({
            size: [undefined, 80]
        });
        surface.View.PositionMod = new StateModifier();

        surface.View.Thread = thread;
        surface.Thread = thread;

        surface.draggable = new Draggable({
            projection: 'x'
        });

        // RenderController behind the slid left/right thing
        surface.BackgroundController = new RenderController();

        // slid right (archive)
        surface.BackgroundController.Views = {};
        surface.BackgroundController.Views.slideRight = new Surface({
            content: 'Archived',
            size: [undefined, undefined],
            properties: {
                lineHeight: '40px',
                textAlign: 'right',
                paddingRight: '10px',
                color: 'black'
            }
        });
        surface.BackgroundController.Views.slideRight.on('click', function(){
            // undoing...
            Utils.Notification.Toast('Undoing');
            surface.BackgroundController.show(null);
            surface.draggable.bounceBack();
        });
        // slid left (delay/scheduling)
        surface.BackgroundController.Views.slideLeft = new Surface({
            content: 'Delayed',
            size: [undefined, undefined],
            properties: {
                lineHeight: '40px',
                textAlign: 'left',
                paddingLeft: '10px',
                color: 'black'
            }
        });
        surface.BackgroundController.Views.slideLeft.on('click', function(){
            // undoing...
            Utils.Notification.Toast('Undoing');
            surface.BackgroundController.show(null);
            surface.draggable.bounceBack();
        });

        // slid left (delay/scheduling)
        surface.BackgroundController.Views.multiSelectBackground = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: '#fbf3de'
            }
        });

        var frontMod = new Modifier({transform : Transform.inFront});

        var surfaceTreeNode = surface.View.add(surface.View.TransitionModifier).add(surface.View.CustomSizeMod); //.add(surface.RealSizeMod);
        surfaceTreeNode.add(surface.BackgroundController);
        surfaceTreeNode.add(frontMod).add(surface.View.PositionMod).add(surface);
        // surface.View.add(surface.View.TransitionModifier);

        surface.pipe(surface.draggable)
        surface.pipe(that.content_layout);

        // Add to sequence/array of Views
        that.threadListLayout.Views.push(surface.View);

        // Resequence the order of the things?
        // - todo...

        // surface.touchSync = new GenericSync({
        //     "mouse"  : {},
        //     "touch"  : {}
        // });
        // surface.position = new Transitionable([0,0]);

        // surface.pipe(surface.touchSync);
        // surface.pipe(that.contentScrollView);

        // surface.touchSync.on('update', function(data){
        //     var currentPosition = surface.position.get();
        //     surface.position.set([
        //         currentPosition[0] + data.delta[0],
        //         currentPosition[1] + data.delta[1]
        //     ]);
        // });

        surface.draggable.bounceBack = function(){
            surface.View.PositionMod.setTransform(Transform.translate(0,0,0), {
                curve : 'easeIn',
                duration: 100
            });
        };
        surface.draggable.bounceRight = function(){
            surface.View.PositionMod.setTransform(Transform.translate(window.innerWidth,0,0), {
                curve : 'easeIn',
                duration: 100
            });

            surface.BackgroundController.show(surface.BackgroundController.Views.slideRight);
        };
        surface.draggable.bounceLeft = function(){
            surface.View.PositionMod.setTransform(Transform.translate(window.innerWidth * -1,0,0), {
                curve : 'easeIn',
                duration: 100
            });

            // Show the correct RenderController
            surface.BackgroundController.show(surface.BackgroundController.Views.slideLeft);
        };

        surface.draggable.on('start', function(data){
            // Begin events anew
            surface.draggable.allowedToDrag = true;
            surface.draggable.startTouch = new moment();

            // Multiple selected?
            if(data.event.count > 1){
                surface.draggable.allowedToDrag = false;
            }

        });

        surface.draggable.on('update', function(data){
            // console.log(data.position);
            // var currentPosition = surface.draggable.position.get();
            // console.log(currentPosition);

            // Only one draggable at a time
            if(data.event.count > 1){
                surface.draggable.bounceBack()
                surface.draggable.allowedToDrag = false;

                // Enable "selected" background
                surface.BackgroundController.show(surface.BackgroundController.Views.multiSelectBackground);
                return;
            }

            if(data.position[0] < 10 && data.position[0] > -10){
                surface.draggable.bounceBack
                return;
            }

            // Cancel dragging on conditions
            // - if vertical movement is high
            // console.log(Math.abs(surface.draggable.originalClientY - data.event.clientY));
            // console.log(JSON.stringify(data.event));
            // if(Math.abs(surface.draggable.originalClientY - data.event.clientY) > 50){
            //     surface.draggable.allowedToDrag = false;
            //     surface.draggable.bounceBack();
            //     return;
            // }

            if(surface.draggable.allowedToDrag){
                surface.View.PositionMod.setTransform(Transform.translate(data.position[0],0,0));
            }

            

            // var velocity = data.velocity;

            // surface.draggable.setPosition([0, 0], {
            //     method : 'spring',
            //     period : 150,
            //     velocity : velocity
            // });

        });

        surface.draggable.on('end', function(data){
            // transition the position back to [0,0] with a bounce
            // position.set([0,0], {curve : 'easeOutBounce', duration : 300});

            if(!data.event.velocity){
                data.event.velocity = [0,0];
            }

            if(surface.draggable.allowedToDrag !== true){
                surface.draggable.bounceBack();
                return;
            }

            // Get X position and velocity

            // Meet conditions to be "thrown" to the right or left?
            if(data.position[0] > 0){
                // Moving right

                // check velocity
                if(data.event.velocity[0] > 0.5){
                    surface.draggable.bounceRight();
                    return;
                }

                // check position (1/3?) and velocity (forward)
                if(data.position[0] > (window.innerWidth / 3) && data.event.velocity[0] > 0.1){
                    surface.draggable.bounceRight();
                    return;
                }

                // Missed, bounceBack
                surface.draggable.bounceBack();


            } else {
                // Moving left

                // check velocity
                if(data.event.velocity[0] < -0.5){
                    surface.draggable.bounceLeft();
                    return;
                }

                // check position (1/3?) and velocity (forward)
                if(data.position[0] < (window.innerWidth / -3) && data.event.velocity[0] < -0.1){
                    surface.draggable.bounceLeft();
                    return;
                }

                // Missed, bounceBack
                surface.draggable.bounceBack();
            }

            surface.draggable.setPosition([0,0]);

            surface.draggable.bounceBack();

            // Only trigger "custom-click" if tapped quickly
            if(moment().diff(surface.draggable.startTouch) < 100){
                var threshold = 0.01;
                if(data.event.velocity == null || (data.event.velocity[0] < threshold && data.event.velocity[1] < threshold)){
                    surface.emit('custom-click')
                }
            }

        });

        // surface.View.positionModifier = new Modifier({
        //     transform : function(){
        //         var currentPosition = surface.position.get();
        //         return Transform.translate(currentPosition[0], 0, 0); // currentPosition[1]
        //     }
        // });

        // surface.View.add(surface.View.positionModifier).add(surface);

        surface.on('click', function(){
            // // alert('clicked!');
            // // alert(this.Setting.href);
            // Backbone.history.navigate('thread/' + this.Thread._id, {trigger: true});
        });
        surface.on('custom-click', function(){
            // // alert('clicked!');
            // // alert(this.Setting.href);
            Backbone.history.navigate('thread/' + this.Thread._id, {trigger: true});
        });

        // });

        // that.contentScrollView.sequenceFrom(that.scrollSurfaces);

    };

    PageView.prototype.updateCollectionStatus = function() { 

        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent('Show More (' + amount_left + ')');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total Trips');

        if(this.collection.totalResults){
            this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total Threads');
            // this.$('.loaded-all').text(this.collection.totalResults + ' Total Trips');
        }

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.content_layout;
        }

        if(nextRenderable != this.lightbox.lastRenderable){
            this.lightbox.lastRenderable = nextRenderable;
            this.lightbox.show(nextRenderable);
        }

        // // Update sizes
        // console.log(this.lightbox.getSize());
        // console.log(this.collection.infiniteResults);
        // this.layoutSizeMod.setSize(this.collection.infiniteResults * 120);
        // debugger;


        // // Resort the tripSurfaces
        // this.tripSurfaces = _.sortBy(this.tripSurfaces, function(surface){
        //     var m = moment(surface.Model.get('start_time'));
        //     return m.format('X') * -1;
        // });

        // // Re-sequence
        // if(this.tripSurfaces.length > 0){
        //     this.tripLayout.sequenceFrom(this.tripSurfaces);
        // }

        // Show correct infinity buttons (More, All, etc.)
        this.render_infinity_buttons();

        // this.layoutSizeMod

        // // Update the Parent view
        // this._eventOutput.trigger('views_updated');

    };

    PageView.prototype.render_infinity_buttons = function(){
        // Renders the correct infinity-list buttons (the "Show More" or "Is loading" button/hint) at the bottom of the page

        // // Hide all dat shit
        // // - unnecessary?
        // this.$('.load-list').addClass('nodisplay');

        if(this.collection.hasFetched){
            // at the end?
            if(this.collection.infiniteResults == this.collection.totalResults){
                this.lightboxButtons.show(this.infinityLoadedAllSurface);
                // this.$('.loaded-all').removeClass('nodisplay');
            } else {
                // Show more
                // - also includes the number more to show :)
                this.lightboxButtons.show(this.infinityShowMoreSurface);
                // this.$('.show-more').removeClass('nodisplay');
            }
        } else {
            // not yet fetched, so display the "loading" one
            this.lightboxButtons.show(this.infinityLoadingSurface);
            // this.$('.loading-progress').removeClass('nodisplay');
        }

    };

    PageView.prototype.next_page = function(){
        // Load more trips
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;
        
        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
        return false;
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        var baseTransitionDuration = 300;
                        transitionOptions.outTransition = { 
                            duration: (that.threadListLayout.Views.length * 50) + baseTransitionDuration,
                            curve: 'linear'
                        };

                        // Hide/move elements
                        Timer.setTimeout(function(){
                            
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide content down
                            that.threadListLayout.Views.forEach(function(surfaceView, index){
                                Timer.setTimeout(function(oldIndex){
                                    // console.log(oldIndex, index);
                                    // var transition = _.clone(transitionOptions.outTransition);
                                    // transition.duration = transition.duration - (oldIndex * 50 );//(Math.floor(Math.random() * 100) + 1);
                                    // console.log(transition.duration);

                                    surfaceView.TransitionModifier.setOpacity(0, {
                                        duration: baseTransitionDuration,
                                        curve: 'easeIn'
                                    }); //transition);
                                    // surfaceView.TransitionModifier.setTransform(Transform.translate(window.innerWidth,0,0), {
                                    //     duration: baseTransitionDuration,
                                    //     curve: 'easeIn'
                                    // }); //transition);
                                }.bind(surfaceView, index), 50 * index); //Math.floor(Math.random() * 100) + 1);
                            }); 

                            // Clear other displayed ones
                            _.each(that.sidebar.Sequence, function(tmpView){
                                tmpView.position.tuckAway({});
                            });

                            // if(goingBack){
                            //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.outTransition);
                            // } else {
                            //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);
                            // }

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // window.setTimeout(that.refreshData.bind(that), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0));
                        // }

                        // Header
                        // - no extra delay
                        Timer.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        }, delayShowing);

                        // // Content
                        // // - extra delay for content to be gone
                        // window.setTimeout(function(){

                        //     // // Bring map content back
                        //     // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        //     // Bring back each
                        //     that.scrollSurfaces.forEach(function(surfaceView, index){
                        //         Timer.setTimeout(function(){
                        //             surfaceView.TransitionModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                        //         },50 * index);
                        //     }); 
                        if(goingBack){

                            // Bring back each
                            that.threadListLayout.Views.forEach(function(surfaceView, index){
                                // Timer.setTimeout(function(){
                                    surfaceView.TransitionModifier.setOpacity(0);
                                    surfaceView.TransitionModifier.setTransform(Transform.translate(0,0,0));
                                // },50 * index);
                            }); 


                        } else {
                            // Bring back each
                            that.threadListLayout.Views.forEach(function(surfaceView, index){
                                // Timer.setTimeout(function(){
                                    surfaceView.TransitionModifier.setOpacity(0);
                                    surfaceView.TransitionModifier.setTransform(Transform.translate(window.innerWidth,0,0));
                                // },50 * index);
                            }); 

                        }

                        // }, delayShowing + transitionOptions.outTransition.duration);

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            // // Bring map content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring back each
                            that.threadListLayout.Views.forEach(function(surfaceView, index){
                                
                                Timer.setTimeout(function(){
                                    surfaceView.TransitionModifier.setOpacity(1, transitionOptions.inTransition);
                                    surfaceView.TransitionModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                                },50 * index);
                            }); 

                            // Clear other displayed ones
                            _.each(that.sidebar.Sequence, function(tmpView){
                                tmpView.position.resetToOriginal({});
                            });

                        }, delayShowing);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };



    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
        },
        footer: {
            size: [undefined, 0]
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
