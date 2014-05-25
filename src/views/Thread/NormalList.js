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
        this.collection.fetch();
        this.collection.populated().then(function(){
            // Got a few threads

            // reset surfaces
            that.scrollSurfaces = [];

            // add surfaces
            that.addThreads();

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

    PageView.prototype.addThreads = function() {
        var that = this;

        // console.log(this.collection.toJSON());

        this.collection.each(function(Thread){

            var thread = Thread.toJSON();

            // Get related Emails for Thread
            Thread._related.Email.populated().then(function(){

                surface.setContent(buildThread(Thread));

            });
            Thread.fetchRelated();

            var buildThread = function(Thread){
                
                if(Thread._related.Email.hasFetched !== true){
                    return '<div>' + Utils.safeString(Thread.toJSON().original.subject) + '</div>'; //thread.attributes.total_emails;
                }

                // Build the more complex version now that we have the full email
                var content = '';
                content += '<div>'+Thread.toJSON().original.subject+'</div>';
                content += '<div>'+Thread._related.Email.first().toJSON().original.headers.From+'</div>';

                // console.log(surface.getSize(true));
                // console.log(surface._size);

                return content;

            };

            var surface = new ModifiedSurface({
                content: buildThread(Thread),
                size: [undefined, true],
                initialSize: [undefined, 100],
                classes: ["thread-list-item"],
                properties: {
                    lineHeight: '20px',
                    padding: '10px 0',
                    // borderBottom: '1px solid #ddd',
                    backgroundColor: "white"
                }
            });

            surface.View = new View();
            surface.View.TransitionModifier = new StateModifier();
            surface.View.CustomSizeMod = new StateModifier({
                size: [undefined, 80]
            });

            surface.View.Thread = thread;
            surface.Thread = thread;

            surface.draggable = new Draggable({
                projection: 'x'
            });
            surface.View.add(surface.View.TransitionModifier).add(surface.draggable).add(surface.CustomSizeMod).add(surface.RealSizeMod).add(surface);

            surface.pipe(surface.draggable)
            surface.pipe(that.contentScrollView);

            that.scrollSurfaces.push(surface.View);

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

            surface.draggable.on('end', function(data){
                // transition the position back to [0,0] with a bounce
                // position.set([0,0], {curve : 'easeOutBounce', duration : 300});
                var velocity = data.velocity;
                surface.draggable.setPosition([0, 0], {
                    method : 'spring',
                    period : 150,
                    velocity : velocity
                });

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
                Backbone.history.navigate('thread/' + this.Thread._id, {trigger: true});
            });

        });

        that.contentScrollView.sequenceFrom(that.scrollSurfaces);

    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        var settings = [
            {
                title: 'Feedback',
                desc: 'Tell us how to improve!' + ' v' + App.ConfigImportant.Version,
                href: 'feedback/settings'
            },
            // {
            //     title: 'My Cars',
            //     desc: 'Model and related details',
            //     href: 'settings/cars'
            // },
            // {
            //     title: 'Drivers',
            //     desc: 'View and edit',
            //     href: 'drivers'
            // },

            // {
            //     title: 'Account and Perks',
            //     desc: '$$ in your pocket',
            //     href: 'perks'
            // },
            
            {
                title: 'Logout and Exit',
                desc: 'Buh-bye',
                href: 'logout'
            }
        ];

        settings.forEach(function(setting){
            var surface = new Surface({
                content: '<div>'+setting.title+'</div><div>'+setting.desc+'</div>',
                size: [undefined, 50],
                classes: ["settings-list-item"],
                properties: {
                    lineHeight: '20px',
                    padding: '5px',
                    borderBottom: '1px solid #ddd',
                    backgroundColor: "white"
                }
            });
            surface.Setting = setting;
            surface.pipe(that.contentScrollView);
            surface.on('click', function(){
                // alert('clicked!');
                // alert(this.Setting.href);
                Backbone.history.navigate(this.Setting.href, {trigger: true});
            });
            that.scrollSurfaces.push(surface);
        });

        // that.contentScrollView.sequenceFrom(that.scrollSurfaces);

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

});
