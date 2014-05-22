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

    var _ = require('underscore');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Models
    var mThread = require('models/thread');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: 50,
            footerSize: 0
        });

        this.createHeader();
        this.createContent();

        // Models

        this.collection = new mThread.ThreadCollection([],{
            type: 'label',
            text: 'Inbox',
            search_limit: 12
        })
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
        this.header = new StandardHeader({
            content: 'Dash',
            classes: ["normal-header"],
            backContent: false,
            moreContent: false
        }); 
        this.header.navBar.title.on('click', function(){
            window.history.go(-1);
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        this.layout.header.add(this.header);

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


        // Now add content
        this.layout.content.add(this.contentBg);
        this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(this.contentScrollView);
        // this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(container);


    };

    PageView.prototype.addThreads = function() {
        var that = this;

        // console.log(this.collection.toJSON());

        this.collection.toJSON().forEach(function(thread){
            console.log(thread);

            var surface = new Surface({
                content: '(' + thread.attributes.total_emails + ') ' + thread.original.subject,
                size: [undefined, 50],
                classes: ["thread-list-item"],
                properties: {
                    lineHeight: '20px',
                    padding: '5px',
                    borderBottom: '1px solid #ddd',
                    backgroundColor: "white"
                }
            });

            surface.View = new View();
            surface.View.TransitionModifier = new StateModifier();

            surface.View.Thread = thread;
            surface.Thread = thread;

            surface.draggable = new Draggable({
                projection: 'x'
            });
            surface.View.add(surface.View.TransitionModifier).add(surface.draggable).add(surface);

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

                                    surfaceView.TransitionModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), {
                                        duration: baseTransitionDuration,
                                        curve: 'easeIn'
                                    }); //transition);
                                }.bind(surfaceView, index), 50 * index); //Math.floor(Math.random() * 100) + 1);
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
                                Timer.setTimeout(function(){
                                    surfaceView.TransitionModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                                },50 * index);
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
