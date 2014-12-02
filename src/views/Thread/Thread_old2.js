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

    var ModifiedSurface = require('views/common/ModifiedSurface');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');

    // Models
    var mThread = require('models/thread');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

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

        this.model = new mThread.Thread({
            _id: this.params.args[0]
        })
        this.model.fetch({prefill: true});
        this.model.populated().then(function(){
            // Got a few threads

            // Get related Emails for Thread
            that.model._related.Email.populated().then(function(){
                // console.log(this);
                // console.log(that.model._related.Email.toJSON());
                console.log(that.model);
                that.header.navBar.title.setContent(that.model._related.Email.length+ ' email'+(that.model._related.Email.length === 1 ? '':'s')+' in thread' );

                that.addEmails();
                // debugger;
            });
            that.model.fetchRelated();

            // reset surfaces
            that.scrollSurfaces = [];

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
            content: "Thread",
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

        // // create the header bar
        // this.header = new StandardHeader({
        //     content: 'Dash',
        //     classes: ["normal-header"],
        //     backContent: false,
        //     moreContent: false
        // }); 
        // this.header.navBar.title.on('click', function(){
        //     window.history.go(-1);
        // });
        // this._eventOutput.on('inOutTransition', function(args){
        //     this.header.inOutTransition.apply(this.header, args);
        // })
        
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
                backgroundColor: "white"
            }
        });

        // Overlay for sidebar
        // - below the menu though
        this.sidebar.Overlay = new View();
        this.sidebar.Overlay.SizeMod = new StateModifier({
            size: [0,0]
        });
        this.sidebar.Overlay.OpacityMod = new Modifier({
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
        this.sidebar.Overlay.Surface = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: "black"
            }
        });
        this.sidebar.Overlay.add(this.sidebar.Overlay.SizeMod).add(this.sidebar.Overlay.OpacityMod).add(this.sidebar.Overlay.Surface);

        // Items
        _.each(_.range(5),function(i){

            // Container for sideview
            var temp = new View();
            // temp.SizeMod = new StateModifier({
            //     size: [window.innerWidth - 100, undefined],
            // });
            temp.TranslateMod = new Modifier({
                transform: Transform.translate(-1 * (contentWidth), 0, 0)
            });

            // Tab
            temp.tab = new View();
            temp.tab.Surface = new Surface({
                content: 'Opt',
                size: [tabWidth, 40],
                properties: {
                    textAlign: "right",
                    paddingRight: "2px",
                    lineHeight: "40px",
                    color: "white",
                    backgroundColor: "hsl(" + (i * 360 / 40) + ", 100%, 50%)",
                    // backgroundColor: "black",
                    borderRadius: "0 3px 3px 0"
                }
            });
            temp.tab.HeightMod = new StateModifier({
                size: [tabWidth, 60]
            });


            temp.touchSync = new GenericSync({
                "mouse"  : {},
                "touch"  : {}
            });
            temp.position = new Transitionable([0,0]);

            // temp.pipe(temp.touchSync);

            // temp.pipe(that.contentScrollView);

            temp.touchSync.on('start', function(data){
                // Add the overlay to the content
                // - don't want to accidentally press something
                that.sidebar.currentDragger = temp;

                // Clear other displayed ones
                _.each(that.sidebar.Sequence, function(tmpView){
                    if(tmpView !== temp){
                        tmpView.position.tuckAway({});
                    }
                });

                // Overlay sizes
                that.layout.content.Overlay.SizeMod.setSize([undefined, undefined]);
                that.sidebar.Overlay.SizeMod.setSize([undefined, undefined]);

            });

            temp.touchSync.on('update', function(data){
                var currentPosition = temp.position.get(),
                    currentAdded = currentPosition[0] + data.delta[0],
                    newXPosition = 0;
                if(currentAdded >= contentWidth){
                    newXPosition = contentWidth;
                } else {
                    newXPosition = currentPosition[0] + data.delta[0];
                }

                temp.position.set([
                    newXPosition,
                    currentPosition[1] + data.delta[1]
                ]);

            });
            temp.touchSync.on('end', function(data){
                
                // Resetting?
                var velocity = data.velocity;
                if(velocity && velocity[0] > 0){
                    temp.position.extendOut(data);
                } else {
                    temp.position.resetToOriginal(data, true);
                    temp.position.resetOthersToOriginal(data);
                }
            });
            temp.touchSync.on('leave', function(data){
                var velocity = data.velocity;
                if(velocity && velocity[0] > 0){
                    temp.position.extendOut(data);
                } else {
                    temp.position.resetToOriginal(data, true);   
                    temp.position.resetOthersToOriginal(data);
                }
            });


            temp.position.resetOthersToOriginal = function(){
                // Clear other displayed ones
                _.each(that.sidebar.Sequence, function(tmpView){
                    if(tmpView !== temp){
                        tmpView.position.resetToOriginal({});
                    }
                });

                // Change the size to nothing
                that.layout.content.Overlay.SizeMod.setSize([1,0]);
            };

            temp.position.resetToOriginal = function(data, callback){
                // Resettting back to "semi-hidden"
                var velocity = data.velocity || 0;
                temp.position.set([0, 0], {
                    method : 'spring',
                    period : 150,
                    dampingRatio: 0.9,
                    velocity : velocity
                }, function(){
                    if(callback){
                        that.sidebar.currentDragger = null;
                    }
                });

            };
            temp.position.tuckAway = function(data){
                // Resettting back to "semi-hidden"
                var velocity = data.velocity || 0;
                var hideSize = -1 * (tabExtraWidth - 2);
                if(that.sidebar.Sequence.indexOf(temp) >= that.sidebar.Sequence.indexOf(that.sidebar.currentDragger)){
                    hideSize = -1 * (tabExtraWidth);
                }
                temp.position.set([hideSize, 0], {
                    method : 'spring',
                    period : 150,
                    dampingRatio: 0.9,
                    velocity : velocity
                });

            };
            temp.position.extendOut = function(data){
                // Extends out the view
                var velocity = data.velocity || 0;
                temp.position.set([contentWidth, 0], {
                    method : 'spring',
                    period : 150,
                    dampingRatio: 0.9,
                    velocity : velocity
                });
            };

            temp.positionModifier = new Modifier({
                transform : function(){
                    var currentPosition = temp.position.get();
                    return Transform.translate(currentPosition[0], 0, 0); // currentPosition[1]
                }
            });

            temp.tab.add(temp.tab.Surface);
            // temp.tab.Surface.pipe(temp.tab.draggable);
            temp.tab.Surface.pipe(temp.touchSync);


            // Content
            temp.content = new View();
            temp.content.SizeMod = new StateModifier({
                size: [contentWidth, window.innerHeight - 20]
            });
            temp.content.Surface = new Surface({
                size: [undefined, undefined],
                content: "sideview content here",
                properties: {
                    backgroundColor: "hsl(" + (i * 360 / 40) + ", 100%, 50%)",
                    color: "#444",
                    borderColor: "#222"
                }
            });

            temp.content.Surface.pipe(temp.touchSync);
            // temp.content.pipe(temp.touchSync);


            temp.content.add(temp.content.SizeMod).add(temp.content.Surface);

            // Only as high as the tab height
            var node = temp.add(temp.TranslateMod).add(temp.tab.HeightMod).add(temp.positionModifier);
            node.add(temp.content);
            node.add(temp.tab)

            // temp.tab.add(surface.View.TransitionModifier).add(temp.tab.draggable).add(temp.tab.Surface);

            
            

            // temp.add(temp.SizeMod).add(temp.OriginMod).add(temp.Surface);

            that.sidebar.Sequence.push(temp);
        });

        this.sidebar.sequenceFrom(this.sidebar.Sequence);

        // this.layout.side.add(this.sidebar.Background);
        this.layout.side.add(this.sidebar.Overlay);
        this.layout.side.add(this.sidebar.OriginMod).add(this.sidebar);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];

        // link endpoints of layout to widgets

        // // Add surfaces to content (buttons)
        // this.addSurfaces();

        // Sequence
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);


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
        // - hiding on menu out
        this.layout.content.Overlay = new View();
        this.layout.content.Overlay.SizeMod = new StateModifier({
            size: [0,0]
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
                backgroundColor: "black"
            }
        });
        this.layout.content.Overlay.add(this.layout.content.Overlay.SizeMod).add(this.layout.content.Overlay.OpacityMod).add(this.layout.content.Overlay.Surface);

        // Now add content
        this.layout.content.add(this.contentBg);
        this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(this.contentScrollView);
        this.layout.content.add(this.layout.content.Overlay);
        // this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(container);


    };

    PageView.prototype.addEmails = function() {
        var that = this;

        this.model._related.Email.toJSON().forEach(function(email, index){

            // SequentialLayout to hold Header(To,From,Actions),Body, Signature
            var EmailView = new View();
            EmailView.TransitionModifier = new StateModifier({
                // transform: Transform.translate(window.innerWidth,0,0)
                transform: Transform.translate(0,0,0)
            });
            var EmailsSeqLayout = new SequentialLayout();
            EmailView.EmailsSeqLayout = EmailsSeqLayout;

            var EmailSeq = [];

            var views = {};

            // Create the From
            views.From = new View();
            views.From.Surface = new Surface({
                content: Handlebars.helpers.personName(email.original.headers.From_Parsed[0]),
                size: [undefined, 20],
                classes: [],
                properties: {
                    color: "black",
                    backgroundColor: "#f8f8f8",
                    lineHeight: "20px"
                }
            });
            views.From.add(views.From.Surface);

            views.From.Surface.pipe(that.contentScrollView);

            // Cc
            // Bcc

            // console.log(Handlebars);
            // console.log(Handlebars.helpers.personName(email.original.headers.From_Parsed[0]));

            // Pretty headers surface
            views.PrettyHeaders = new View();
            views.PrettyHeaders.Surface = new ModifiedSurface({
                content: JSON.stringify(email.original.headers),
                size: [undefined, true]
            });
            views.PrettyHeaders.DisplayMod = new StateModifier();

            views.PrettyHeaders.add(views.PrettyHeaders.DisplayMod).add(views.PrettyHeaders.Surface.RealSizeMod).add(views.PrettyHeaders.Surface);
            views.PrettyHeaders.Surface.pipe(that.contentScrollView);

            views.Body = new View();
            views.Body.Surface = new ModifiedSurface({
                content: that.display_bodies(email),
                // content: nl2br(emails[index]),
                // size: [(window.innerWidth) - ((window.innerWidth / 5) * index), true],
                size: [window.innerWidth - 10, true],
                classes: ["email-list-item"],
                properties: {
                    lineHeight: '20px',
                    padding: '5px',
                    // borderRadius: "3px",
                    backgroundColor: "white"
                    // backgroundColor: "hsl(" + ((index+1) * 360 / 40) + ", 100%, 50%)",
                }
            });
            views.Body.Surface.pipe(that.contentScrollView);
            // views.Body.Surface.on('sizeUpdated', function(newSize){

            //     console.info('deployed newSize in Thread', newSize);
            //     // console.log(this);
            //     // console.log(this._size);
            //     // console.log(this.getSize(true));

            //     var paddingSize = 10;
            //     this.View.PaddingModifier.setSize([undefined, newSize[1] + paddingSize]);

            //     // console.log(newSize[1] + paddingSize);
            //     // this.View.bgSizeModifier.setSize([undefined, newSize[1]]);

            //     // surface.PaddingModifier.setSize([undefined, surface.getSize()[1]]);
            // }.bind(views.Body));

            views.Body.Email = email;
            views.Body.Surface.Email = email;

            // views.Body.bg = new Surface({
            //     size: [undefined, undefined],
            //     properties: {
            //         // backgroundColor: "blue",
            //         zIndex: "-1"
            //     }
            // });
            // views.Body.bg.pipe(that.contentScrollView);

            // views.Body.bg.SizeModifier = new StateModifier();
            // views.Body.TransitionModifier = new StateModifier({
            //     transform: Transform.translate(window.innerWidth,0,0)
            // });
            // views.Body.PaddingModifier = new StateModifier({
            //     // will be changing size
            //     // size: [window.innerWidth - 20, true]
            // });
            // views.Body.OriginModifier = new StateModifier({
            //     origin: [0.5, 0.5]
            //     // will be changing size
            //     // size: [window.innerWidth - 20, true]
            // });
            // var node = surface.View.add(surface.View.TransitionModifier).add(surface.View.PaddingModifier);
            // node.add(surface.View.bg);
            // node.add(surface.View.OriginModifier).add(surface);

            views.Body.add(views.Body.Surface.RealSizeMod).add(views.Body.Surface);

            views.Spacer = new View();
            views.Spacer.Surface = new Surface({
                size: [undefined, 20]
            });
            views.Spacer.add(views.Spacer.Surface);
            views.Spacer.Surface.pipe(that.contentScrollView);

            EmailSeq.push(views.From);
            EmailSeq.push(views.Body);
            EmailSeq.push(views.Spacer);

            // Add views to SeqLayout object for accessing easily later
            EmailsSeqLayout.views = views;


            EmailsSeqLayout.sequenceFrom(EmailSeq);

            // Transform in
            // - not sure if it has even been displayed
            // that.whenPageVisible(function(){
            if(that._whenPageVisible === true){
                Timer.setTimeout(function(){
                    this.TransitionModifier.setTransform(Transform.translate(0,0,0), { duration: 500, curve: 'easeOutBounce' });
                }.bind(EmailView), index * 100);
                console.log('transform in from PageVisible');
            }
            // });

            // // surface.pipe(surface.draggable)
            // surface.pipe(that.contentScrollView);
            EmailView.add(EmailView.TransitionModifier).add(EmailsSeqLayout);
            // EmailView.TransitionModifier.add(EmailsSeqlayout)


            that.scrollSurfaces.push(EmailView);

            // window.setTimeout(function(){
            //     var newSize = this.getSize(true);
            //     this.PaddingModifier.setSize([undefined, newSize[1] + 25]);
            // }.bind(surface), 100);

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

            // surface.draggable.on('end', function(data){
            //     // transition the position back to [0,0] with a bounce
            //     // position.set([0,0], {curve : 'easeOutBounce', duration : 300});
            //     var velocity = data.velocity;
            //     surface.draggable.setPosition([0, 0], {
            //         method : 'spring',
            //         period : 150,
            //         velocity : velocity
            //     });

            // });

            // surface.View.positionModifier = new Modifier({
            //     transform : function(){
            //         var currentPosition = surface.position.get();
            //         return Transform.translate(currentPosition[0], 0, 0); // currentPosition[1]
            //     }
            // });

            // surface.View.add(surface.View.positionModifier).add(surface);

        });

        that.contentScrollView.sequenceFrom(that.scrollSurfaces);

    };

    PageView.prototype.display_bodies = function(Email, no_nl2br) {
        // Display the first ParsedData entry
        // - hide any additional entries

        no_nl2br = no_nl2br == true ? true : false;

        var parsedData = Email.original.ParsedData;
        // console.dir(Email.original.ParsedData);
        var tmp = '';

        // Building sections
        // - now incorporates Edited Emails (minimail only)
        var i = 0;

        _.each(parsedData,function(pieceOfData, index){
            i++;
            var content = '';
            
            pieceOfData.Body = htmlEntities(pieceOfData.Body);

            try {
                if(pieceOfData.Body.length > 0){
                    content = no_nl2br ? pieceOfData.Body : nl2br(pieceOfData.Body, false);

                    if($.trim(content) == ""){
                        // Missing content, probably HTML content
                        // content = "[Email Content as HTML]"; // content non-existant, need to show a button for HTML view?
                        content = '<button class="btn btn-info view-html-email">View Fancy Email</button>';
                    }

                    tmp += '<div class="ParsedDataContent" data-level="'+index+'">'+content+'</div>';
                    // tmp += '<div class="signature">' + nl2br(pieceOfData.Signature) + '</div>';
                    // content += '<div class="signature">' + nl2br(pieceOfData.Signature) + '</div>';
                    // go to next parsedData

                    return tmp;
                } else {
                    // pieceOfData.Data = htmlEntities(pieceOfData.Data);
                    content = pieceOfData.Data;
                    content = $.trim(content);
                    content = no_nl2br ? content : nl2br(content,false);
                    
                }
            } catch(err){
                // console.log(parsedData[x]);
                // pieceOfData.Data = htmlEntities(pieceOfData.Data);
                content = pieceOfData.Data;
                content = $.trim(content);
                // console.log(content);
                // debugger;
                content = no_nl2br ? content : nl2br(content,false);

                if($.trim(content) == ""){
                    // Missing content, probably HTML content
                    // content = "[Email Content as HTML]";  // content non-existant, need to show a button for HTML view?
                    content = '<button class="btn btn-info view-html-email">View Fancy Email</button>';
                }
                // debugger;
            }

            tmp += '<div class="ParsedDataContent" data-level="'+index+'">'+content+'</div>';
            
        });

        // Clickable selector to see the rest of the conversation
        // - only if the conversation is much longer
        if (i > 1){
            //tmp += '<div class="ParsedDataShowAll"><span>show '+ (i-1) +' previous</span></div>';
            tmp += '<div class="ParsedDataShowAll clearfix"><span class="expander">...</span><span class="edit">E</span></div>';
        }

        // console.log(Handlebars);
        // return new Handlebars.SafeString(tmp);
        // return $('<div/>').text(tmp).html();
        // debugger;
        return tmp;

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
                            duration: (that.scrollSurfaces.length * 50) + baseTransitionDuration,
                            curve: 'linear'
                        };

                        // Hide/move elements
                        Timer.setTimeout(function(){
                            
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide content down
                            that.scrollSurfaces.forEach(function(surfaceView, index){
                                Timer.setTimeout(function(oldIndex){
                                    // console.log(oldIndex, index);
                                    // var transition = _.clone(transitionOptions.outTransition);
                                    // transition.duration = transition.duration - (oldIndex * 50 );//(Math.floor(Math.random() * 100) + 1);
                                    // console.log(transition.duration);

                                    surfaceView.TransitionModifier.setTransform(Transform.translate(window.innerWidth,0,0), {
                                        duration: baseTransitionDuration,
                                        curve: 'easeIn'
                                    }); //transition);
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


                        // }, delayShowing + transitionOptions.outTransition.duration);

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            // // Bring map content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring back each
                            that.scrollSurfaces.forEach(function(surfaceView, index){
                                console.log(1);
                                Timer.setTimeout(function(){
                                    surfaceView.TransitionModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                                },50 * index);
                            }); 

                            // Clear other displayed ones
                            _.each(that.sidebar.Sequence, function(tmpView){
                                tmpView.position.resetToOriginal({});
                            });

                            console.log(that.scrollSurfaces);

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


    var nl2br  = function(str, is_xhtml) {
        // http://kevin.vanzonneveld.net
        // - nl2br() => php.js
        var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>';
        return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
    };
    function htmlEntities(str) {
        if(typeof str != typeof("")){
            return undefined;
        }
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

});
