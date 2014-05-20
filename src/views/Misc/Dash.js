/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/ScrollView');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ContainerSurface = require('famous/surfaces/ContainerSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var EventHandler = require('famous/core/EventHandler');

    // Models
    var mThread = require('models/thread');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

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
            search_limit: 10
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

        // Add surfaces to content (buttons)
        this.addSurfaces();

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

        console.log(this.collection.toJSON());

        this.collection.toJSON().forEach(function(thread){
            console.log(thread);
            var surface = new Surface({
                content: thread.original.subject,
                size: [undefined, 50],
                classes: ["thread-list-item"],
                properties: {
                    lineHeight: '20px',
                    padding: '5px',
                    borderBottom: '1px solid #ddd',
                    backgroundColor: "white"
                }
            });
            surface.Thread = thread;
            surface.pipe(that.contentScrollView);
            surface.on('click', function(){
                // // alert('clicked!');
                // // alert(this.Setting.href);
                // Backbone.history.navigate(this.Setting.href, {trigger: true});
            });
            that.scrollSurfaces.push(surface);
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

                        // Hide/move elements
                        window.setTimeout(function(){
                            
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide content down
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

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
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.layout.content.StateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        // Header
                        // - no extra delay
                        window.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring map content back
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

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
