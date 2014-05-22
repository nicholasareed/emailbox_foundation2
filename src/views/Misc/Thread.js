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

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var ModifiedSurface = require('views/common/ModifiedSurface');
    var $ = require('jquery-adapter');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Models
    var mThread = require('models/thread');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // thread_id
        this.thread_id = this.params.args[0]

        this.resetPageVisiblePromises();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: 50,
            footerSize: 0
        });

        this.createHeader();
        this.createContent();

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

                that.header.navBar.title.setContent('Thread ('+that.model._related.Email.length+')');

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
        this.header = new StandardHeader({
            content: 'Thread',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
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

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];

        // link endpoints of layout to widgets

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

    PageView.prototype.addEmails = function() {
        var that = this;

        this.model._related.Email.toJSON().forEach(function(email, index){

            var surface = new ModifiedSurface({
                content: that.display_bodies(email),
                // content: nl2br(emails[index]),
                // size: [(window.innerWidth) - ((window.innerWidth / 5) * index), true],
                size: [window.innerWidth - 10, true],
                classes: ["email-list-item"],
                properties: {
                    lineHeight: '20px',
                    padding: '5px',
                    borderRadius: "3px",
                    backgroundColor: "white"
                    // backgroundColor: "hsl(" + ((index+1) * 360 / 40) + ", 100%, 50%)",
                }
            });
            surface.on('sizeUpdated', function(newSize){

                console.info('deployed newSize in Thread', newSize);
                // console.log(this);
                // console.log(this._size);
                // console.log(this.getSize(true));

                var paddingSize = 10;
                this.View.PaddingModifier.setSize([undefined, newSize[1] + paddingSize]);

                // console.log(newSize[1] + paddingSize);
                // this.View.bgSizeModifier.setSize([undefined, newSize[1]]);

                // surface.PaddingModifier.setSize([undefined, surface.getSize()[1]]);
            }.bind(surface));

            surface.View = new View();
            surface.View.Email = email;
            surface.Email = email;

            surface.View.bg = new Surface({
                size: [undefined, undefined],
                properties: {
                    // backgroundColor: "blue",
                    zIndex: "-1"
                }
            });
            surface.View.bg.pipe(that.contentScrollView);

            surface.View.bgSizeModifier = new StateModifier();
            surface.View.TransitionModifier = new StateModifier({
                transform: Transform.translate(window.innerWidth,0,0)
            });
            surface.View.PaddingModifier = new StateModifier({
                // will be changing size
                // size: [window.innerWidth - 20, true]
            });
            surface.View.OriginModifier = new StateModifier({
                origin: [0.5, 0.5]
                // will be changing size
                // size: [window.innerWidth - 20, true]
            });
            var node = surface.View.add(surface.View.TransitionModifier).add(surface.View.PaddingModifier);
            node.add(surface.View.bg);
            node.add(surface.View.OriginModifier).add(surface);
            // node.add(surface.View.bgSizeModifier).add(surface.View.bg);
            // node.add(surface.View.PaddingModifier).add(surface);

            // Transform in
            // - not sure if it has even been displayed
            // that.whenPageVisible(function(){
            if(that._whenPageVisible === true){
                Timer.setTimeout(function(){
                    this.View.TransitionModifier.setTransform(Transform.translate(0,0,0), { duration: 500, curve: 'easeOutBounce' });
                }.bind(surface), index * 100);
                console.log('transform in from PageVisible');
            }
            // });

            // surface.pipe(surface.draggable)
            surface.pipe(that.contentScrollView);

            surface.on('click', function(){
                // // alert('clicked!');
                // // alert(this.Setting.href);
                Backbone.history.navigate('email/' + this.Email._id, {trigger: true});
            });

            that.scrollSurfaces.push(surface.View);

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

                        that.resetPageVisiblePromises();

                        // Hide/move elements
                        window.setTimeout(function(){
                            
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // // Slide away
                            // if(goingBack){
                            //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.outTransition);
                            // } else {
                            //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);
                            // }

                            // // Bring map content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                            that.scrollSurfaces.forEach(function(surfaceView, index){
                                Timer.setTimeout(function(){
                                    surfaceView.TransitionModifier.setTransform(Transform.translate(window.innerWidth * (goingBack ? 1:-1),0,0), transitionOptions.inTransition);
                                },50 * index);
                            }); 


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

                        Timer.setTimeout(function(){
                            if(that._whenPageVisible !== true){
                                that._whenPageVisible = true;
                                that._whenPageVisiblePromise.resolve();
                            }
                        }, transitionOptions.inTransition.duration);

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.layout.content.StateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0));
                        // }
                        that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        that.scrollSurfaces.forEach(function(surfaceView, index){
                            surfaceView.TransitionModifier.setTransform(Transform.translate(window.innerWidth,0,0));
                        }); 

                        // Header
                        // - no extra delay
                        Timer.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            // // Bring map content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                            that.scrollSurfaces.forEach(function(surfaceView, index){
                                Timer.setTimeout(function(){
                                    surfaceView.TransitionModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                                },50 * index);
                            }); 

                        }, delayShowing + transitionOptions.outTransition.duration);
                        console.dir(delayShowing + transitionOptions.outTransition.duration);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };

    PageView.prototype.resetPageVisiblePromises = function(){
        var that = this;
        this._whenPageVisible = false;
        this._whenPageVisiblePromise = $.Deferred();
        this.whenPageVisible = function(fn){
            // that._whenPageVisiblePromise.promise().then(fn);
        }

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
